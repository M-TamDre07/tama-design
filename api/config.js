'use strict';

const { sendJson } = require('./_lib/db');

module.exports = function configHandler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return sendJson(res, 405, { status: 'error', message: 'Metode tidak diizinkan.' });
  }
  const url = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const publishableKey = String(process.env.SUPABASE_PUBLISHABLE_KEY || '').trim();
  const secretKey = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !publishableKey || !secretKey) {
    return sendJson(res, 503, {
      status: 'error',
      code: 'DATABASE_NOT_CONFIGURED',
      message: 'Konfigurasi Supabase belum selesai. Admin perlu mengisi environment variables di Vercel.'
    });
  }
  return sendJson(res, 200, { status: 'ok', url, publishableKey });
};
