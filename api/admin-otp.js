'use strict';

const {
  sendJson, parseRequestBody, getSupabaseConfig, getHeaderToken,
  rest, safeError, enforceRateLimit
} = require('./_lib/db');
const { sendTelegramMessage, isTelegramConfigured } = require('./_lib/telegram');
const { createHash, createHmac, randomInt, randomUUID } = require('node:crypto');

function decodeClaims(token) {
  try { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8')); }
  catch (_) { return {}; }
}
function hashSessionId(sessionId) {
  return createHash('sha256').update(String(sessionId)).digest('hex');
}
function hashOtp(challengeId, code, secret) {
  return createHmac('sha256', secret).update(challengeId + ':' + code).digest('hex');
}
function fail(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode || 400;
  error.code = code || 'ADMIN_OTP_ERROR';
  throw error;
}
async function getAdminIdentity(req) {
  const token = getHeaderToken(req);
  if (!token) fail('Silakan masuk menggunakan akun admin.', 401, 'ADMIN_LOGIN_REQUIRED');
  const cfg = getSupabaseConfig();
  const response = await fetch(cfg.url + '/auth/v1/user', {
    headers: { apikey: cfg.publishableKey, Authorization: 'Bearer ' + token, Accept: 'application/json' },
    signal: AbortSignal.timeout(6000)
  });
  if (!response.ok) fail('Sesi login tidak valid atau sudah berakhir.', 401, 'ADMIN_SESSION_INVALID');
  const user = await response.json();
  const allowedIds = String(process.env.ADMIN_USER_IDS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!allowedIds.length || !allowedIds.includes(String(user.id))) {
    fail('Akun ini belum diizinkan sebagai administrator.', 403, 'ADMIN_NOT_ALLOWED');
  }
  if (user.email && !user.email_confirmed_at) {
    fail('Verifikasi alamat email admin diperlukan sebelum melanjutkan.', 403, 'ADMIN_EMAIL_UNVERIFIED');
  }

  const claims = decodeClaims(token);
  if (
    claims.sub !== user.id ||
    claims.role !== 'authenticated' ||
    !/^[0-9a-f-]{36}$/i.test(String(claims.session_id || '')) ||
    !Number.isFinite(Number(claims.exp)) ||
    Number(claims.exp) * 1000 <= Date.now()
  ) {
    fail('Sesi autentikasi tidak valid. Silakan masuk kembali.', 401, 'ADMIN_SESSION_INVALID');
  }

  return {
    id: user.id,
    email: user.email || '',
    name: user.user_metadata && user.user_metadata.full_name || user.email || 'Admin',
    sessionId: claims.session_id,
    sessionHash: hashSessionId(claims.session_id),
    secret: cfg.secretKey
  };
}
async function requestOtp(req, res, actor) {
  await enforceRateLimit(req, 'admin-telegram-otp-request', 3, 3600, actor.id);
  if (!isTelegramConfigured()) fail('Telegram belum dikonfigurasi pada server.', 503, 'TELEGRAM_NOT_CONFIGURED');
  const now = Date.now();
  const challengeId = randomUUID();
  const code = String(randomInt(0, 1000000)).padStart(6, '0');
  const expiresAt = new Date(now + 5 * 60 * 1000).toISOString();
  await rest('rpc/admin_store_otp_challenge', {
    method: 'POST',
    body: {
      p_challenge_id: challengeId,
      p_user_id: actor.id,
      p_code_hash: hashOtp(challengeId, code, actor.secret),
      p_expires_at: expiresAt
    }
  });
  const delivery = await sendTelegramMessage(
    '🔐 OTP Admin — Tama Andrea Studio\n\n' +
    'Kode: ' + code + '\n' +
    'Akun: ' + actor.email + '\n' +
    'Berlaku: 5 menit\n' +
    'Permintaan: ' + new Date(now).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }) +
    '\n\nJangan teruskan kode ini kepada siapa pun. Jika bukan kamu yang meminta, abaikan pesan ini.'
  );
  if (delivery.status !== 'sent') {
    await rest('admin_otp_challenges', {
      method: 'PATCH',
      query: { id: 'eq.' + challengeId },
      body: { consumed_at: new Date().toISOString() }
    }).catch(() => {});
    fail('OTP tidak berhasil dikirim ke grup Telegram. Periksa bot dan izin grup.', 503, 'OTP_DELIVERY_FAILED');
  }
  return sendJson(res, 200, {
    status: 'ok',
    challengeId,
    expiresInSeconds: 300,
    message: 'Kode OTP telah dikirim ke grup Telegram admin.'
  });
}
async function verifyOtp(req, res, actor, body) {
  await enforceRateLimit(req, 'admin-telegram-otp-verify', 10, 3600, actor.id);
  const challengeId = String(body.challengeId || '').trim();
  const code = String(body.code || '').replace(/\\s+/g, '');
  if (!/^[0-9a-f-]{36}$/i.test(challengeId) || !/^\\d{6}$/.test(code)) {
    fail('ID verifikasi atau kode OTP tidak valid.', 400, 'INVALID_OTP');
  }

  const verified = await rest('rpc/admin_consume_otp_challenge', {
    method: 'POST',
    body: {
      p_challenge_id: challengeId,
      p_user_id: actor.id,
      p_code_hash: hashOtp(challengeId, code, actor.secret),
      p_auth_session_id: actor.sessionId,
      p_auth_session_hash: actor.sessionHash
    }
  });
  if (verified !== true) {
    fail('Kode OTP tidak valid, sudah digunakan, atau kedaluwarsa. Minta kode baru.', 400, 'OTP_INVALID_OR_EXPIRED');
  }

  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString();
  return sendJson(res, 200, {
    status: 'ok',
    expiresAt,
    message: 'Verifikasi Telegram berhasil. Panel admin dapat digunakan.'
  });
}
module.exports = async function adminOtpHandler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { status: 'error', message: 'Metode tidak diizinkan.' });
    }
    const body = await parseRequestBody(req);
    const actor = await getAdminIdentity(req);
    const action = String(body.action || '').trim();
    if (action === 'request') return await requestOtp(req, res, actor);
    if (action === 'verify') return await verifyOtp(req, res, actor, body);
    fail('Action verifikasi tidak dikenal.', 400, 'UNKNOWN_ACTION');
  } catch (error) {
    return safeError(res, error, 'api/admin-otp', req);
  }
};
