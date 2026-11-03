'use strict';

const { sendJson, parseRequestBody, rest, restRequest, enforceRateLimit, safeError } = require('./_lib/db');
const { randomBytes } = require('node:crypto');
const { sendTelegramMessage } = require('./_lib/telegram');

function clean(value, maxLength) {
  return String(value == null ? '' : value).trim().slice(0, maxLength || 2000);
}
function first(data, keys, maxLength) {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null && String(data[key]).trim() !== '') return clean(data[key], maxLength);
  }
  return '';
}
function emailNorm(value) { return clean(value, 254).toLowerCase(); }
function nameNorm(value) { return clean(value, 160).replace(/\s+/g, ' '); }
function orderNorm(value) {
  const raw = clean(value, 40).toUpperCase().replace(/\s+/g, '');
  return raw.startsWith('ORD-') ? raw : 'ORD-' + raw.replace(/^ORD/, '');
}
function configFallback() {
  return {
    version: '2026.11',
    studioName: 'Tama Andrea Studio',
    serviceFocus: 'Desain Grafis',
    locationLabel: 'Kalianda · Lampung Selatan',
    currency: 'IDR',
    revisionPolicy: 'Revisi mengikuti ruang lingkup yang disepakati sebelum pengerjaan.'
  };
}
async function readServiceConfig() {
  const rows = await rest('site_config', { query: { select: 'config', id: 'eq.default', limit: '1' } });
  const fromDb = Array.isArray(rows) && rows[0] && rows[0].config;
  return { ...configFallback(), ...(fromDb || {}), serviceFocus: 'Desain Grafis' };
}
async function readAvailability() {
  const cfg = await readServiceConfig();
  const localDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date());
  const [year, month, day] = localDate.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  const end = new Date(start.getTime() + 45 * 86400000);
  const keyOf = date => date.getUTCFullYear() + '-' +
    String(date.getUTCMonth() + 1).padStart(2, '0') + '-' +
    String(date.getUTCDate()).padStart(2, '0');
  const from = keyOf(start);
  const to = keyOf(end);
  const overrides = await rest('service_availability', {
    query: { select: 'service_date,status,start_time,end_time,note', service_date: 'gte.' + from, and: '(service_date.lte.' + to + ')' }
  });
  const overrideMap = new Map((Array.isArray(overrides) ? overrides : []).map(item => [item.service_date, item]));
  const openDays = [];
  const closedDays = [];
  const fmtTime = value => String(value || '').slice(0, 5);
  for (let offset = 0; offset <= 45; offset++) {
    const date = new Date(start.getTime() + offset * 86400000);
    const key = keyOf(date);
    const override = overrideMap.get(key);
    const day = date.getUTCDay();
    if (override) {
      if (override.status === 'open' && openDays.length < 4) {
        openDays.push({ date: key, hours: [fmtTime(override.start_time), fmtTime(override.end_time)].filter(Boolean).join('–'), note: override.note || '' });
      } else if (override.status === 'closed' && closedDays.length < 4) {
        closedDays.push({ date: key, note: override.note || '' });
      }
      continue;
    }
    const rule = day === 6 ? cfg.hours.SATURDAY : day === 0 ? cfg.hours.SUNDAY : null;
    if (rule && openDays.length < 4) openDays.push({ date: key, hours: rule.start + '–' + rule.end, note: '' });
  }
  return { status: 'ok', openDays, closedDays };
}
function publicOrderShape(row, full) {
  if (!row) return null;
  const o = {
    id: row.order_code,
    status: row.status || 'Baru',
    category: row.category || '',
    layanan: row.service || '',
    tanggal: row.created_at || '',
    deadline: row.deadline || '',
    estimasi: row.estimated_amount,
    payment: row.payment_status || 'Belum Dibayar'
  };
  if (!full) return o;
  return {
    ...o,
    nama: row.customer_name || '',
    email: row.customer_email || '',
    receiptId: row.receipt_code || '',
    method: row.method || '',
    appointmentDate: row.appointment_date || '',
    appointmentTime: row.appointment_time || '',
    locationLink: row.location_link || ''
  };
}
async function findOrder(orderCode) {
  const rows = await rest('orders', {
    query: {
      select: 'id,order_code,receipt_code,created_at,customer_name,customer_email,email_normalized,customer_whatsapp,category,service,operating_system,method,brief,deadline,status,estimated_amount,payment_status,appointment_date,appointment_time,service_location,location_link,accessibility_preference,source',
      order_code: 'eq.' + orderCode,
      archived_at: 'is.null',
      limit: '1'
    }
  });
  return Array.isArray(rows) ? rows[0] || null : null;
}

function estimateOrder() {
  // Graphic design prices are confirmed per brief; the admin sets the agreed amount.
  return null;
}
async function submitOrder(req, body) {
  await enforceRateLimit(req, 'new-order', 6, 3600);
  const data = body && body.data && typeof body.data === 'object' ? body.data : body;
  const name = nameNorm(first(data, ['Nama', 'Customer Name', 'nama', 'name'], 160));
  const email = emailNorm(first(data, ['Email', 'email'], 254));
  const whatsapp = clean(first(data, ['WhatsApp', 'Nomor WhatsApp', 'whatsapp', 'phone'], 40));
  const category = first(data, ['Jenis Desain', 'Kategori', 'Category', 'category'], 100);
  const service = first(data, ['Layanan Dipilih', 'Service', 'Layanan', 'service'], 1600);
  const osChoice = first(data, ['Pilihan OS', 'OS', 'operatingSystem'], 160);
  const brief = first(data, ['Keterangan Proyek', 'Brief', 'Keterangan', 'brief'], 8000);
  const clientRequestId = clean(body.clientRequestId || data.clientRequestId, 120);
  if (!name || !email || !whatsapp || !category || !service || !brief) {
    const error = new Error('Nama, email, WhatsApp, divisi, layanan, dan keterangan wajib diisi.');
    error.statusCode = 400; error.code = 'INVALID_ORDER'; throw error;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const error = new Error('Format email belum valid.'); error.statusCode = 400; throw error;
  }
  if (category.toLowerCase() !== 'desain grafis') {
    const error = new Error('Website ini hanya menerima pesanan desain grafis.');
    error.statusCode = 400; error.code = 'UNSUPPORTED_SERVICE_CATEGORY'; throw error;
  }
  const catalogRows = await rest('studio_services', {
    query: { select: 'id,name,price_label', name: 'eq.' + service, active: 'eq.true', limit: '1' }
  });
  if (!Array.isArray(catalogRows) || !catalogRows[0]) {
    const error = new Error('Layanan tidak ditemukan atau sedang tidak tersedia. Muat ulang katalog sebelum mengirim pesanan.');
    error.statusCode = 400; error.code = 'SERVICE_UNAVAILABLE'; throw error;
  }
  if (!clientRequestId || clientRequestId.length < 8) {
    const error = new Error('ID permintaan tidak valid. Muat ulang formulir lalu coba kembali.'); error.statusCode = 400; throw error;
  }
  const payload = {
    client_request_id: clientRequestId,
    customer_name: name,
    customer_email: email,
    customer_email_normalized: email,
    customer_whatsapp: whatsapp,
    category,
    service,
    operating_system: osChoice,
    estimated_amount: estimateOrder(data, service, osChoice),
    method: first(data, ['Metode Layanan', 'Metode', 'method'], 100),
    brief,
    deadline: first(data, ['Deadline', 'Tenggat', 'deadline'], 40) || null,
    service_location: first(data, ['Lokasi Layanan', 'Service Location', 'location'], 500),
    location_link: first(data, ['Link Lokasi', 'Location Link', 'locationLink'], 1000),
    location_lat: first(data, ['Latitude', 'locationLat'], 30) || null,
    location_lng: first(data, ['Longitude', 'locationLng'], 30) || null,
    accessibility_preference: first(data, ['Kebutuhan Aksesibilitas', 'Accessibility Preference'], 300),
    request_details: data,
    source: 'website'
  };
  const created = await rest('rpc/create_public_order', { method: 'POST', body: { p_order: payload } });
  const orderCode = created && (created.orderCode || created.order_code);
  if (!orderCode) {
    const error = new Error('Pesanan belum dapat dikonfirmasi. Coba kembali beberapa saat lagi.');
    error.statusCode = 502; throw error;
  }
  const row = await findOrder(orderCode);
  // Idempotent retries must not send duplicate Telegram messages for an existing order.
  if (!created.duplicate) await sendOrderNotification(row).catch(() => {});
  return { status: 'ok', orderId: orderCode, receiptId: row && row.receipt_code, duplicate: Boolean(created.duplicate) };
}
async function sendOrderNotification(row) {
  if (!row) return 'failed';
  const { rest: db } = require('./_lib/db');
  const msg = 'Pesanan baru ' + row.order_code + '\nNama: ' + row.customer_name + '\nDivisi: ' + row.category + '\nLayanan: ' + row.service;
  // Persist the attempted delivery even when TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID are missing.
  await db('notifications', {
    method: 'POST',
    query: { on_conflict: 'order_id,event,channel' },
    body: [{
      order_id: row.id,
      event: 'order_created',
      channel: 'telegram',
      status: 'queued',
      message: msg
    }],
    prefer: 'resolution=ignore-duplicates,return=minimal'
  }).catch(() => {});
  const result = await sendTelegramMessage(msg);
  await db('notifications', {
    method: 'PATCH',
    query: { order_id: 'eq.' + row.id, event: 'order_created', channel: 'telegram' },
    body: { status: result.status, sent_at: result.status === 'sent' ? new Date().toISOString() : null }
  }).catch(() => {});
  return result.status;
}
async function handle(req, res) {
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { status: 'error', message: 'Metode tidak diizinkan.' });
  }
  const query = req.query || {};
  const action = String(query.action || '').trim();
  if (req.method === 'GET') {
    if (action === 'stats') {
      const total = await restRequest('orders', { method: 'HEAD', query: { select: 'id', archived_at: 'is.null', limit: '0' }, prefer: 'count=exact' });
      const complete = await restRequest('orders', { method: 'HEAD', query: { select: 'id', status: 'eq.Selesai', archived_at: 'is.null', limit: '0' }, prefer: 'count=exact' });
      const count = value => {
        const match = String(value || '').match(/\/(\d+)$/);
        return match ? Number(match[1]) : 0;
      };
      return sendJson(res, 200, { status: 'ok', data: { totalPesanan: count(total.contentRange), selesai: count(complete.contentRange) } });
    }
    if (action === 'serviceConfig') {
      const config = await readServiceConfig();
      return sendJson(res, 200, { status: 'ok', config });
    }
    if (action === 'availability') return sendJson(res, 200, await readAvailability());
    if (action === 'track') {
      await enforceRateLimit(req, 'track-order', 18, 3600);
      const id = orderNorm(query.id || '');
      if (!/^ORD-[A-Z0-9-]{4,36}$/.test(id)) return sendJson(res, 400, { status: 'error', code: 'INVALID_ORDER_ID', message: 'Format kode pesanan tidak valid.' });
      const order = await findOrder(id);
      return sendJson(res, 200, { status: 'ok', order: order ? { id: order.order_code } : null });
    }
    return sendJson(res, 404, { status: 'error', message: 'Endpoint publik tidak ditemukan.' });
  }
  const body = await parseRequestBody(req);
  if (body.action === 'newOrder') {
    const out = await submitOrder(req, body);
    return sendJson(res, 200, out);
  }
  if (body.action === 'verifyOrder') {
    await enforceRateLimit(req, 'verify-order', 15, 3600);
    const id = orderNorm(body.id || '');
    const name = nameNorm(body.name || '');
    const email = emailNorm(body.email || '');
    if (!id || !name || !email) return sendJson(res, 400, { status: 'error', message: 'Kode order, nama, dan email wajib diisi.' });
    const row = await findOrder(id);
    if (!row || nameNorm(row.customer_name) !== name || emailNorm(row.email_normalized || row.customer_email) !== email) {
      return sendJson(res, 200, { status: 'ok', order: null });
    }
    return sendJson(res, 200, { status: 'ok', order: publicOrderShape(row, true) });
  }
  return sendJson(res, 400, { status: 'error', message: 'Action tidak dikenal.' });
}
module.exports = async function publicHandler(req, res) {
  try { await handle(req, res); }
  catch (error) { await safeError(res, error, 'api/public', req); }
};
