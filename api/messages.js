'use strict';

const { sendJson, parseRequestBody, rest, enforceRateLimit, safeError } = require('./_lib/db');
const { sendTelegramMessage } = require('./_lib/telegram');

function clean(value, limit) {
  return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, limit || 2000);
}
function emailNorm(value) { return clean(value, 254).toLowerCase(); }
function fail(message, code, statusCode) {
  const error = new Error(message);
  error.code = code || 'INVALID_MESSAGE';
  error.statusCode = statusCode || 400;
  throw error;
}
async async function notifyTelegram(row) {
  const lines = [
    'Pesan website baru — Tama Andrea Studio',
    'ID: ' + row.id,
    'Jenis: ' + row.message_type,
    'Prioritas: ' + row.priority,
    'Nama: ' + row.sender_name,
    'Email: ' + row.sender_email,
    row.page_url ? 'Halaman: ' + row.page_url : '',
    row.device_info ? 'Perangkat: ' + row.device_info : '',
    '',
    'Pesan:',
    row.message
  ].filter((line, index, arr) => line !== '' || (index > 0 && arr[index - 1] !== ''));
  return (await sendTelegramMessage(lines.join('\n'))).status;
}
async function notifyFormspree(row) {
  const endpoint = String(process.env.FORMSPREE_ENDPOINT || '').trim();
  if (!endpoint) return 'not_configured';
  if (!/^https:\/\/formspree\.io\/f\/[A-Za-z0-9]+$/.test(endpoint)) return 'failed';
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: 'Pesan website baru — Tama Andrea Studio',
        submission_id: row.id,
        name: row.sender_name,
        email: row.sender_email,
        category: row.message_type,
        priority: row.priority,
        page: row.page_url || '',
        device: row.device_info || '',
        message: row.message
      }),
      signal: AbortSignal.timeout(5000)
    });
    return response.ok ? 'sent' : 'failed';
  } catch (_) {
    return 'failed';
  }
}
module.exports = async function messagesHandler(req, res) {
  try {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendJson(res, 405, { status: 'error', message: 'Metode tidak diizinkan.' });
    }
    await enforceRateLimit(req, 'website-message', 5, 3600);
    const body = await parseRequestBody(req);
    // Honeypot: quietly accept obvious automated submissions without storing or notifying.
    if (clean(body._gotcha, 200)) return sendJson(res, 200, { status: 'ok', message: 'Pesan diterima.' });
    const senderName = clean(body.Nama || body.name, 160);
    const senderEmail = emailNorm(body.Email || body.email);
    const messageType = clean(body['Jenis Keluhan'] || body.category || 'Keluhan Website', 100);
    const priority = clean(body['Tingkat Dampak'] || body.priority || 'Normal', 100);
    const pageUrl = clean(body['Halaman / Fitur'] || body.page || '', 500);
    const deviceInfo = clean(body['Perangkat & Browser'] || body.device || '', 300);
    const message = clean(body['Detail Keluhan'] || body.message || '', 5000);
    if (!senderName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail) || !message) {
      fail('Nama, email valid, dan detail pesan wajib diisi.', 'INVALID_MESSAGE', 400);
    }
    const rows = await rest('website_messages', {
      method: 'POST',
      body: [{
        sender_name: senderName,
        sender_email: senderEmail,
        message_type: messageType,
        priority,
        page_url: pageUrl,
        device_info: deviceInfo,
        message,
        source: 'website'
      }],
      prefer: 'return=representation'
    });
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row || !row.id) {
      const error = new Error('Pesan belum berhasil disimpan.');
      error.statusCode = 502;
      throw error;
    }
    const [telegramStatus, formspreeStatus] = await Promise.all([
      notifyTelegram(row),
      notifyFormspree(row)
    ]);
    const deliveredAt = new Date().toISOString();
    await rest('website_messages', {
      method: 'PATCH',
      query: { id: 'eq.' + row.id },
      body: {
        telegram_status: telegramStatus,
        telegram_sent_at: telegramStatus === 'sent' ? deliveredAt : null,
        formspree_status: formspreeStatus,
        formspree_sent_at: formspreeStatus === 'sent' ? deliveredAt : null
      }
    }).catch(() => {});
    return sendJson(res, 200, {
      status: 'ok',
      message: 'Pesan utama tersimpan di Supabase. Backup Formspree: ' +
        (formspreeStatus === 'sent' ? 'terkirim' : formspreeStatus === 'not_configured' ? 'belum dikonfigurasi' : 'belum terkonfirmasi') +
        '. Notifikasi Telegram: ' +
        (telegramStatus === 'sent' ? 'terkirim.' : 'belum terkonfirmasi.')
    });
  } catch (error) {
    return safeError(res, error, 'api/messages', req);
  }
};
