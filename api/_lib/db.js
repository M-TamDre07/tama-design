'use strict';

function getSupabaseConfig() {
  const url = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  const secretKey = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !publishableKey || !secretKey) {
    const error = new Error('Backend database belum dikonfigurasi. Lengkapi SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, dan SUPABASE_SECRET_KEY di Vercel.');
    error.statusCode = 503;
    throw error;
  }
  return { url, publishableKey, secretKey };
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

function parseRequestBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch (_) { return {}; }
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        raw = '';
        resolve({});
        req.destroy();
      }
    });
    req.on('end', () => {
      try { resolve(JSON.parse(raw || '{}')); } catch (_) { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

async function restRequest(table, options) {
  const config = getSupabaseConfig();
  const opts = options || {};
  const endpoint = table.startsWith('rpc/') ? '/rest/v1/' + table : '/rest/v1/' + table;
  const url = new URL(config.url + endpoint);
  Object.entries(opts.query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
  });
  const headers = { apikey: config.secretKey, Accept: 'application/json' };
  if (!config.secretKey.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + config.secretKey;
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.prefer) headers.Prefer = opts.prefer;
  const response = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
  });
  const raw = await response.text();
  let payload = null;
  if (raw) {
    try { payload = JSON.parse(raw); } catch (_) { payload = raw; }
  }
  if (!response.ok) {
    const error = new Error('Database request failed (' + response.status + ').');
    error.statusCode = response.status === 429 ? 429 : 502;
    error.databaseCode = payload && typeof payload === 'object' ? payload.code : undefined;
    throw error;
  }
  const range = response.headers.get('content-range');
  return { data: payload, status: response.status, contentRange: range };
}

async function rest(table, options) {
  const result = await restRequest(table, options);
  return result.data;
}

async function enforceRateLimit(req, scope, limit, windowSeconds) {
  const ipHeader = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'unknown');
  const ip = ipHeader.split(',')[0].trim().slice(0, 80) || 'unknown';
  const { createHash } = require('node:crypto');
  const key = createHash('sha256').update(scope + '|' + ip).digest('hex');
  const allowed = await rest('rpc/consume_public_rate_limit', {
    method: 'POST',
    body: { p_bucket_key: key, p_limit: limit, p_window_seconds: windowSeconds }
  });
  if (allowed !== true) {
    const error = new Error('Terlalu banyak permintaan. Silakan tunggu sebelum mencoba lagi.');
    error.statusCode = 429;
    error.code = 'RATE_LIMITED';
    throw error;
  }
}

function safeError(res, error) {
  const status = Number(error && error.statusCode) || 500;
  if (status >= 500) {
    sendJson(res, status, {
      status: 'error',
      code: status === 503 ? 'DATABASE_NOT_CONFIGURED' : 'SERVER_ERROR',
      message: status === 503 ? error.message : 'Layanan database sedang tidak tersedia. Coba lagi beberapa saat.'
    });
    return;
  }
  sendJson(res, status, {
    status: 'error',
    code: error && error.code ? error.code : 'REQUEST_ERROR',
    message: error && error.message ? error.message : 'Permintaan tidak dapat diproses.'
  });
}

function getHeaderToken(req) {
  const header = String(req.headers.authorization || '');
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : '';
}

module.exports = {
  getSupabaseConfig,
  sendJson,
  parseRequestBody,
  restRequest,
  rest,
  enforceRateLimit,
  safeError,
  getHeaderToken
};
