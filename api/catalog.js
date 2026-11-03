'use strict';

const { sendJson, parseRequestBody, rest, enforceRateLimit, safeError } = require('./_lib/db');
const { sendTelegramMessage } = require('./_lib/telegram');

function clean(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max || 1200);
}
function fail(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode || 400;
  error.code = code || 'CATALOG_ERROR';
  throw error;
}
async function handle(req, res) {
  if (req.method === 'GET') {
    const action = String(req.query && req.query.action || '').trim();
    if (action === 'services') {
      const rows = await rest('studio_services', {
        query: {
          select: 'id,slug,name,category,description,price_min,price_max,price_label,featured,sort_order',
          active: 'eq.true',
          order: 'sort_order.asc,name.asc'
        }
      });
      return sendJson(res, 200, { status: 'ok', services: Array.isArray(rows) ? rows : [] });
    }

    if (action === 'portfolio') {
      const rows = await rest('studio_portfolio', {
        query: { select: 'id,title,category,description,image_url,alt_text,featured,sort_order', active: 'eq.true', order: 'featured.desc,sort_order.asc,created_at.desc', limit: '100' }
      });
      return sendJson(res, 200, { status: 'ok', portfolio: Array.isArray(rows) ? rows : [] });
    }
    if (action === 'faqs') {
      const rows = await rest('studio_faq', {
        query: { select: 'id,question,answer,category,sort_order', active: 'eq.true', order: 'sort_order.asc,created_at.asc', limit: '100' }
      });
      return sendJson(res, 200, { status: 'ok', faqs: Array.isArray(rows) ? rows : [] });
    }
    if (action === 'paymentMethods') {
      const rows = await rest('studio_payment_methods', {
        query: { select: 'id,name,account_name,account_number,instructions,logo_url,sort_order', active: 'eq.true', order: 'sort_order.asc,name.asc', limit: '50' }
      });
      return sendJson(res, 200, { status: 'ok', paymentMethods: Array.isArray(rows) ? rows : [] });
    }
    if (action === 'reviews') {
      const rows = await rest('studio_reviews', {
        query: {
          select: 'id,customer_name,customer_role,rating,review_text,published_at',
          status: 'eq.published',
          order: 'published_at.desc',
          limit: '24'
        }
      });
      return sendJson(res, 200, { status: 'ok', reviews: Array.isArray(rows) ? rows : [] });
    }
    return sendJson(res, 404, { status: 'error', message: 'Katalog tidak ditemukan.' });
  }
  if (req.method === 'POST') {
    await enforceRateLimit(req, 'studio-review-submit', 3, 86400);
    const body = await parseRequestBody(req);
    if (body.action !== 'submitReview') fail('Action ulasan tidak dikenal.', 400, 'UNKNOWN_ACTION');
    if (clean(body._gotcha, 120)) return sendJson(res, 200, { status: 'ok', message: 'Terima kasih. Ulasan telah diterima untuk ditinjau.' });
    const name = clean(body.customerName || body.name, 100);
    const role = clean(body.customerRole || body.role, 100);
    const rating = Number(body.rating);
    const reviewText = clean(body.reviewText || body.review, 1200);
    if (name.length < 2 || !Number.isInteger(rating) || rating < 1 || rating > 5 || reviewText.length < 10) {
      fail('Nama, rating 1–5, dan ulasan minimal 10 karakter wajib diisi.', 400, 'INVALID_REVIEW');
    }
    const rows = await rest('studio_reviews', {
      method: 'POST',
      body: [{
        customer_name: name,
        customer_role: role,
        rating,
        review_text: reviewText,
        status: 'pending',
        source: 'website'
      }],
      prefer: 'return=representation'
    });
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row || !row.id) fail('Ulasan belum berhasil disimpan. Coba kembali.', 502, 'REVIEW_SAVE_FAILED');
    await sendTelegramMessage(
      'Ulasan baru menunggu moderasi — Tama Andrea Studio\\n' +
      'Nama: ' + name + '\\nRating: ' + rating + '/5\\n' +
      'Isi: ' + reviewText.slice(0, 700) + '\\nID: ' + row.id
    ).catch(() => {});
    return sendJson(res, 200, {
      status: 'ok',
      message: 'Ulasan berhasil dikirim dan akan ditampilkan setelah ditinjau.'
    });
  }
  res.setHeader('Allow', 'GET, POST');
  return sendJson(res, 405, { status: 'error', message: 'Metode tidak diizinkan.' });
}
module.exports = async function catalogHandler(req, res) {
  try { await handle(req, res); }
  catch (error) { return safeError(res, error, 'api/catalog', req); }
};
