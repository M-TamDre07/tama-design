'use strict';

const { sendJson, parseRequestBody, getSupabaseConfig, getHeaderToken, rest, safeError } = require('./_lib/db');

function decodeClaims(token) {
  try {
    const part = token.split('.')[1];
    return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
  } catch (_) { return {}; }
}
async function authenticateAdmin(req) {
  const token = getHeaderToken(req);
  if (!token) {
    const error = new Error('Silakan masuk kembali sebagai admin.');
    error.statusCode = 401; error.code = 'ADMIN_LOGIN_REQUIRED'; throw error;
  }
  const cfg = getSupabaseConfig();
  const response = await fetch(cfg.url + '/auth/v1/user', {
    headers: { apikey: cfg.publishableKey, Authorization: 'Bearer ' + token, Accept: 'application/json' }
  });
  if (!response.ok) {
    const error = new Error('Sesi admin tidak valid atau sudah berakhir.');
    error.statusCode = 401; error.code = 'ADMIN_SESSION_INVALID'; throw error;
  }
  const user = await response.json();
  const allowedIds = String(process.env.ADMIN_USER_IDS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (!allowedIds.length || !allowedIds.includes(String(user.id))) {
    const error = new Error('Akun ini tidak terdaftar sebagai administrator.');
    error.statusCode = 403; error.code = 'ADMIN_NOT_ALLOWED'; throw error;
  }
  // Supabase Auth has verified this exact token above, so its signed aal claim is trusted here.
  // The panel must complete TOTP MFA before any privileged operation.
  const claims = decodeClaims(token);
  if (claims.aal !== 'aal2') {
    const error = new Error('Verifikasi dua langkah belum selesai. Masuk dan selesaikan kode authenticator.');
    error.statusCode = 403; error.code = 'MFA_REQUIRED'; throw error;
  }
  return { id: user.id, email: user.email || '', name: user.user_metadata && user.user_metadata.full_name || user.email || 'Admin' };
}
async function audit(actor, action, details, req) {
  const { createHash } = require('node:crypto');
  const ip = String(req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'unknown').split(',')[0].trim();
  const ipHash = createHash('sha256').update(ip.slice(0, 100)).digest('hex');
  await rest('audit_logs', {
    method: 'POST',
    body: [{ actor_id: actor.id, actor_email: actor.email, action, status: 'OK', details: details || {}, ip_hash: ipHash }],
    prefer: 'return=minimal'
  });
}
function clean(value, limit) { return String(value == null ? '' : value).trim().slice(0, limit || 2000); }
function parseDate(value) { const s = clean(value, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; }
function parseTime(value) { const s = clean(value, 5); return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : null; }

async function getDashboard(actor) {
  const results = await Promise.all([
    rest('orders', { query: { select: 'id,order_code,receipt_code,created_at,updated_at,customer_id,customer_name,customer_email,customer_whatsapp,category,service,operating_system,method,brief,deadline,status,estimated_amount,payment_status,payment_date,priority,notes,internal_notes,appointment_date,appointment_time,service_location,location_link,accessibility_preference,archived_at', archived_at: 'is.null', order: 'created_at.desc', limit: '500' } }),
    rest('customers', { query: { select: 'id,customer_code,name,email_normalized,whatsapp,order_count,last_order_at,location,notes,created_at,updated_at', order: 'last_order_at.desc.nullslast', limit: '250' } }),
    rest('audit_logs', { query: { select: 'id,created_at,actor_email,action,status,details', order: 'created_at.desc', limit: '100' } }),
    rest('service_availability', { query: { select: 'id,service_date,status,start_time,end_time,note,updated_at', order: 'service_date.desc', limit: '90' } }),
    rest('site_config', { query: { select: 'config', id: 'eq.default', limit: '1' } }),
    rest('website_messages', { query: { select: 'id,created_at,sender_name,sender_email,message_type,priority,page_url,device_info,message,status,telegram_status,telegram_sent_at', order: 'created_at.desc', limit: '100' } }),
    rest('notifications', { query: { select: 'id,order_id,created_at,event,channel,status,message,sent_at', order: 'created_at.desc', limit: '100' } })
  ]);
  return {
    status: 'ok',
    account: { email: actor.email, name: actor.name },
    orders: results[0] || [],
    customers: results[1] || [],
    auditLog: results[2] || [],
    serviceAvailability: results[3] || [],
    serviceConfig: results[4] && results[4][0] ? results[4][0].config : {},
    websiteMessages: results[5] || [],
    notifications: results[6] || []
  };
}
async function handlePost(req, res, actor, body) {
  const action = clean(body.action, 50);
  if (action === 'updateOrder') {
    const orderCode = clean(body.orderCode, 48).toUpperCase();
    const data = body.data && typeof body.data === 'object' ? body.data : {};
    if (!/^ORD-[A-Z0-9-]{4,36}$/.test(orderCode)) {
      const error = new Error('Kode pesanan tidak valid.'); error.statusCode = 400; throw error;
    }
    const patch = { updated_at: new Date().toISOString() };
    if (data.status !== undefined) {
      const status = clean(data.status, 60);
      if (!['Baru', 'Dikonfirmasi', 'Sedang Dikerjakan', 'Menunggu Pembayaran', 'Selesai', 'Dibatalkan'].includes(status)) {
        const error = new Error('Status pesanan tidak dikenal.'); error.statusCode = 400; throw error;
      }
      patch.status = status;
    }
    if (data.paymentStatus !== undefined) {
      const payment = clean(data.paymentStatus, 50);
      if (!['Belum Dibayar', 'Menunggu Pembayaran', 'Dibayar', 'Refund'].includes(payment)) {
        const error = new Error('Status pembayaran tidak dikenal.'); error.statusCode = 400; throw error;
      }
      patch.payment_status = payment;
      patch.payment_date = payment === 'Dibayar' ? new Date().toISOString() : null;
    }
    if (data.estimatedAmount !== undefined) {
      const amount = data.estimatedAmount === '' || data.estimatedAmount === null ? null : Number(data.estimatedAmount);
      if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 1000000000)) {
        const error = new Error('Nominal estimasi tidak valid.'); error.statusCode = 400; throw error;
      }
      patch.estimated_amount = amount;
    }
    if (data.priority !== undefined) {
      const priority = clean(data.priority, 30);
      if (!['Rendah', 'Normal', 'Tinggi', 'Mendesak'].includes(priority)) {
        const error = new Error('Prioritas tidak valid.'); error.statusCode = 400; throw error;
      }
      patch.priority = priority;
    }
    if (data.internalNotes !== undefined) patch.internal_notes = clean(data.internalNotes, 4000);
    if (data.notes !== undefined) patch.notes = clean(data.notes, 4000);
    if (data.appointmentDate !== undefined) patch.appointment_date = parseDate(data.appointmentDate);
    if (data.appointmentTime !== undefined) patch.appointment_time = parseTime(data.appointmentTime);
    if (data.serviceLocation !== undefined) patch.service_location = clean(data.serviceLocation, 500);
    if (data.locationLink !== undefined) patch.location_link = clean(data.locationLink, 1000);
    const rows = await rest('orders', {
      method: 'PATCH',
      query: { order_code: 'eq.' + orderCode, archived_at: 'is.null' },
      body: patch,
      prefer: 'return=representation'
    });
    if (!Array.isArray(rows) || !rows[0]) {
      const error = new Error('Pesanan tidak ditemukan atau sudah diarsipkan.'); error.statusCode = 404; throw error;
    }
    await audit(actor, 'ORDER_UPDATED', { order_code: orderCode, fields: Object.keys(patch).filter(key => key !== 'updated_at') }, req);
    return sendJson(res, 200, { status: 'ok', order: rows[0] });
  }
  if (action === 'archiveOrder') {
    const orderCode = clean(body.orderCode, 48).toUpperCase();
    if (!/^ORD-[A-Z0-9-]{4,36}$/.test(orderCode)) {
      const error = new Error('Kode pesanan tidak valid.'); error.statusCode = 400; throw error;
    }
    const rows = await rest('orders', {
      method: 'PATCH', query: { order_code: 'eq.' + orderCode, archived_at: 'is.null' },
      body: { archived_at: new Date().toISOString(), archived_by: actor.id, updated_at: new Date().toISOString() },
      prefer: 'return=representation'
    });
    if (!Array.isArray(rows) || !rows[0]) {
      const error = new Error('Pesanan tidak ditemukan.'); error.statusCode = 404; throw error;
    }
    await audit(actor, 'ORDER_ARCHIVED', { order_code: orderCode }, req);
    return sendJson(res, 200, { status: 'ok' });
  }
  if (action === 'setAvailability') {
    const serviceDate = parseDate(body.serviceDate);
    const status = clean(body.status, 10);
    const startTime = parseTime(body.startTime);
    const endTime = parseTime(body.endTime);
    const note = clean(body.note, 500);
    if (!serviceDate || !['open', 'closed'].includes(status) || (status === 'open' && (!startTime || !endTime || endTime <= startTime))) {
      const error = new Error('Tanggal atau jam operasional tidak valid.'); error.statusCode = 400; throw error;
    }
    const rows = await rest('service_availability', {
      method: 'POST', query: { on_conflict: 'service_date' },
      body: [{ service_date: serviceDate, status, start_time: status === 'open' ? startTime : null, end_time: status === 'open' ? endTime : null, note, updated_by: actor.id, updated_at: new Date().toISOString() }],
      prefer: 'resolution=merge-duplicates,return=representation'
    });
    await audit(actor, 'AVAILABILITY_UPDATED', { service_date: serviceDate, status }, req);
    return sendJson(res, 200, { status: 'ok', item: Array.isArray(rows) ? rows[0] : null });
  }
  if (action === 'updateServiceConfig') {
    const supplied = body.config && typeof body.config === 'object' ? body.config : {};
    const rows = await rest('site_config', {
      method: 'PATCH', query: { id: 'eq.default' },
      body: { config: supplied, updated_by: actor.id, updated_at: new Date().toISOString() },
      prefer: 'return=representation'
    });
    if (!Array.isArray(rows) || !rows[0]) {
      const error = new Error('Konfigurasi belum tersedia. Jalankan migrasi SQL terlebih dahulu.'); error.statusCode = 409; throw error;
    }
    await audit(actor, 'SERVICE_CONFIG_UPDATED', { keys: Object.keys(supplied).slice(0, 30) }, req);
    return sendJson(res, 200, { status: 'ok', config: rows[0].config });
  }
  if (action === 'updateWebsiteMessage') {
    const messageId = clean(body.messageId, 64);
    const status = clean(body.status, 30);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(messageId)) {
      const error = new Error('ID laporan website tidak valid.'); error.statusCode = 400; throw error;
    }
    if (!['Baru', 'Diproses', 'Selesai'].includes(status)) {
      const error = new Error('Status laporan tidak dikenal.'); error.statusCode = 400; throw error;
    }
    const rows = await rest('website_messages', {
      method: 'PATCH',
      query: { id: 'eq.' + messageId },
      body: { status },
      prefer: 'return=representation'
    });
    if (!Array.isArray(rows) || !rows[0]) {
      const error = new Error('Laporan website tidak ditemukan.'); error.statusCode = 404; throw error;
    }
    await audit(actor, 'WEBSITE_MESSAGE_UPDATED', { message_id: messageId, status }, req);
    return sendJson(res, 200, { status: 'ok', message: rows[0] });
  }
  if (action === 'addCustomer') {
    const name = clean(body.name, 160);
    const email = clean(body.email, 254).toLowerCase();
    const whatsapp = clean(body.whatsapp, 40);
    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const error = new Error('Nama dan email customer wajib valid.'); error.statusCode = 400; throw error;
    }
    const rows = await rest('customers', {
      method: 'POST',
      body: [{ name, email_normalized: email, whatsapp, order_count: 0, last_order_at: null }],
      prefer: 'return=representation'
    });
    await audit(actor, 'CUSTOMER_ADDED', { customer_added: true }, req);
    return sendJson(res, 200, { status: 'ok', customer: Array.isArray(rows) ? rows[0] : null });
  }
  const error = new Error('Action admin tidak dikenal.'); error.statusCode = 400; throw error;
}
module.exports = async function adminHandler(req, res) {
  try {
    if (!['GET', 'POST'].includes(req.method)) {
      res.setHeader('Allow', 'GET, POST');
      return sendJson(res, 405, { status: 'error', message: 'Metode tidak diizinkan.' });
    }
    const actor = await authenticateAdmin(req);
    if (req.method === 'GET') {
      if (clean(req.query && req.query.action, 50) !== 'dashboard') {
        return sendJson(res, 404, { status: 'error', message: 'Endpoint admin tidak ditemukan.' });
      }
      return sendJson(res, 200, await getDashboard(actor));
    }
    const body = await parseRequestBody(req);
    return await handlePost(req, res, actor, body);
  } catch (error) {
    return safeError(res, error, 'api/admin', req);
  }
};
