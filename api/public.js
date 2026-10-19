'use strict';

const { sendJson, parseRequestBody, rest, restRequest, enforceRateLimit, safeError } = require('./_lib/db');
const { randomBytes } = require('node:crypto');

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
    version: '2026.10.19',
    studioName: 'Tama Andrea',
    locationLabel: 'Kalianda · Lampung Selatan',
    mapUrl: 'https://www.google.com/maps/search/?api=1&query=Kalianda%2C%20Lampung%20Selatan',
    visitFeeMin: 20000,
    queueEnabled: false,
    methods: ['Datang ke studio', 'Teknisi datang ke lokasi'],
    hours: { SATURDAY: { label: 'Sabtu', start: '13:00', end: '16:00' }, SUNDAY: { label: 'Minggu', start: '10:00', end: '15:00' } },
    workingWeekdays: [6, 0],
    benefits: ['Instal OS yang kompatibel', 'Driver dasar', 'Update sistem dasar', 'Konfigurasi awal', 'Testing fungsi dasar', 'Hingga 5 software dasar pilihan pelanggan (bukan Microsoft Office)'],
    basicSoftwareNote: 'Hingga 5 software dasar pilihan pelanggan. Microsoft Office tidak termasuk; aplikasi berbayar perlu dikonsultasikan terlebih dahulu.',
    prices: {
      WINDOWS_10_BASIC: 80000, WINDOWS_11_BASIC: 100000, WINDOWS_10_LTSC_2021: 90000,
      WINDOWS_11_LTSC_2024: 150000, LINUX: 100000, OFFICE_2024_HOME: 80000,
      OFFICE_INSTALL: 80000, OS_OFFICE: 165000, OS_BACKUP: 130000,
      OS_OFFICE_BACKUP: 210000, DIAGNOSIS: 30000, SSD_CHECK: 35000,
      BACKUP: 40000, BIOS_LAPTOP: 50000, PART_LIGHT: 50000, PART_HEAVY: 100000,
      QUICK_FLASH_ANDROID: 80000, QUICK_FLASH_IPHONE: 85000, FIND_DEVICE: 35000
    }
  };
}
async function readServiceConfig() {
  const rows = await rest('site_config', { query: { select: 'config', id: 'eq.default', limit: '1' } });
  const fromDb = Array.isArray(rows) && rows[0] && rows[0].config;
  return { ...(configFallback()), ...(fromDb || {}), prices: { ...configFallback().prices, ...((fromDb && fromDb.prices) || {}) } };
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

function estimateOrder(data, service, os) {
  const text = String(service || '');
  const osChoice = String(os || '');
  const prices = {
    WINDOWS_10_BASIC: 80000, WINDOWS_11_BASIC: 100000,
    WINDOWS_10_LTSC_2021: 90000, WINDOWS_11_LTSC_2024: 150000,
    LINUX: 100000, OFFICE_2024_HOME: 80000, OFFICE_INSTALL: 80000,
    OS_OFFICE: 165000, OS_BACKUP: 130000, OS_OFFICE_BACKUP: 210000,
    DIAGNOSIS: 30000, SSD_CHECK: 35000, BACKUP: 40000,
    BIOS_LAPTOP: 50000, PART_LIGHT: 50000, PART_HEAVY: 100000,
    QUICK_FLASH_ANDROID: 80000, QUICK_FLASH_IPHONE: 85000, FIND_DEVICE: 35000
  };
  if (text.includes('Paket OS + Office + Backup')) return prices.OS_OFFICE_BACKUP;
  if (text.includes('Paket OS + Office')) return prices.OS_OFFICE;
  if (text.includes('Paket OS + Backup')) return prices.OS_BACKUP;
  if (text.includes('Paket OS Basic')) {
    if (osChoice.includes('Windows 10 Enterprise LTSC 2021')) return prices.WINDOWS_10_LTSC_2021;
    if (osChoice.includes('Windows 11 Enterprise LTSC 2024')) return prices.WINDOWS_11_LTSC_2024;
    if (osChoice.includes('Windows 10')) return prices.WINDOWS_10_BASIC;
    if (osChoice.includes('Windows 11')) return prices.WINDOWS_11_BASIC;
    if (/Ubuntu|Debian|Kali/i.test(osChoice)) return prices.LINUX;
  }
  const choices = [
    ['Microsoft Office', prices.OFFICE_INSTALL],
    ['Diagnosis PC / Laptop', prices.DIAGNOSIS],
    ['Cek Kesehatan SSD/HDD', prices.SSD_CHECK],
    ['Backup Data Sebelum Instal Ulang', prices.BACKUP],
    ['Update BIOS Laptop', prices.BIOS_LAPTOP],
    ['Part Ringan', prices.PART_LIGHT],
    ['Part Berat', prices.PART_HEAVY],
    ['Quick Flash Android', prices.QUICK_FLASH_ANDROID],
    ['Quick Flash iPhone', prices.QUICK_FLASH_IPHONE],
    ['Bantuan Find Hub Android', prices.FIND_DEVICE],
    ['Bantuan Find My / Lacak iPhone', prices.FIND_DEVICE]
  ];
  let total = 0;
  for (const [label, amount] of choices) if (text.includes(label)) total += amount;
  return total || null;
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
  await sendOrderNotification(row).catch(() => {});
  return { status: 'ok', orderId: orderCode, receiptId: row && row.receipt_code, duplicate: Boolean(created.duplicate) };
}
async function sendOrderNotification(row) {
  if (!row) return;
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = String(process.env.TELEGRAM_CHAT_ID || '').trim();
  if (!token || !chatId) return;
  const { rest: db } = require('./_lib/db');
  const msg = 'Pesanan baru ' + row.order_code + '\nNama: ' + row.customer_name + '\nDivisi: ' + row.category + '\nLayanan: ' + row.service;
  await db('notifications', {
    method: 'POST',
    query: { on_conflict: 'order_id,event,channel' },
    body: [{ order_id: row.id, event: 'order_created', channel: 'telegram', status: 'queued', message: msg }],
    prefer: 'resolution=ignore-duplicates,return=minimal'
  }).catch(() => {});
  let sent = false;
  try {
    const response = await fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: msg, disable_web_page_preview: true }),
      signal: AbortSignal.timeout(5000)
    });
    sent = response.ok;
  } catch (_) {}
  await db('notifications', {
    method: 'PATCH',
    query: { order_id: 'eq.' + row.id, event: 'order_created', channel: 'telegram' },
    body: { status: sent ? 'sent' : 'failed', sent_at: sent ? new Date().toISOString() : null }
  }).catch(() => {});
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
  catch (error) { safeError(res, error); }
};
