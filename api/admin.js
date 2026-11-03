'use strict';

const { sendJson, parseRequestBody, getSupabaseConfig, getHeaderToken, rest, safeError, enforceRateLimit } = require('./_lib/db');
const { isTelegramConfigured, sendTelegramMessage } = require('./_lib/telegram');

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
  // Password login is followed by a server-verified Telegram OTP challenge.
  // Bind the short-lived OTP session to Supabase's signed session_id, not a rotating access token.
  const claims = decodeClaims(token);
  if (!claims.session_id) {
    const error = new Error('Sesi autentikasi tidak memiliki identitas yang valid.');
    error.statusCode = 401; error.code = 'ADMIN_SESSION_INVALID'; throw error;
  }
  const sessionHash = require('node:crypto').createHash('sha256').update(String(claims.session_id)).digest('hex');
  const otpSessions = await rest('admin_otp_sessions', {
    query: {
      select: 'id',
      user_id: 'eq.' + user.id,
      auth_session_hash: 'eq.' + sessionHash,
      revoked_at: 'is.null',
      expires_at: 'gt.' + new Date().toISOString(),
      limit: '1'
    }
  });
  if (!Array.isArray(otpSessions) || !otpSessions[0]) {
    const error = new Error('Verifikasi OTP Telegram diperlukan sebelum membuka panel admin.');
    error.statusCode = 403; error.code = 'TELEGRAM_OTP_REQUIRED'; throw error;
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
    rest('website_messages', { query: { select: 'id,created_at,sender_name,sender_email,message_type,priority,page_url,device_info,message,status,telegram_status,telegram_sent_at,formspree_status,formspree_sent_at', order: 'created_at.desc', limit: '100' } }),
    rest('notifications', { query: { select: 'id,order_id,created_at,event,channel,status,message,sent_at', order: 'created_at.desc', limit: '100' } }),
    rest('error_logs', { query: { select: 'id,created_at,handler,error_code,message,request_id', order: 'created_at.desc', limit: '100' } }),
    rest('studio_services', { query: { select: 'id,slug,name,category,description,price_min,price_max,price_label,active,featured,sort_order,created_at,updated_at', order: 'sort_order.asc,name.asc' } }),
    rest('studio_reviews', { query: { select: 'id,customer_name,customer_role,rating,review_text,status,source,created_at,published_at,moderated_at', order: 'created_at.desc', limit: '100' } }),
    rest('transactions', { query: { select: 'id,order_id,customer_id,created_at,transaction_type,amount,status,method,reference,note', order: 'created_at.desc', limit: '300' } }),
    rest('receipts', { query: { select: 'id,receipt_code,order_id,customer_id,created_at,service,amount,payment_status,method,appointment,location_link,note', order: 'created_at.desc', limit: '300' } }),
    rest('service_notes', { query: { select: 'id,order_id,created_at,created_by,note,is_internal', order: 'created_at.desc', limit: '300' } }),
    rest('order_events', { query: { select: 'id,order_id,event_type,old_value,new_value,note,is_internal,actor_email,created_at,metadata', order: 'created_at.desc', limit: '500' } }),
    rest('studio_portfolio', { query: { select: 'id,title,category,description,image_url,alt_text,active,featured,sort_order,created_at,updated_at', order: 'sort_order.asc,created_at.desc' } }),
    rest('studio_faq', { query: { select: 'id,question,answer,category,active,sort_order,created_at,updated_at', order: 'sort_order.asc,created_at.desc' } }),
    rest('studio_payment_methods', { query: { select: 'id,slug,name,account_name,account_number,instructions,logo_url,active,sort_order,created_at,updated_at', order: 'sort_order.asc,name.asc' } })
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
    notifications: results[6] || [],
    errorLogs: results[7] || [],
    studioServices: results[8] || [],
    studioReviews: results[9] || [],
    transactions: results[10] || [],
    receipts: results[11] || [],
    serviceNotes: results[12] || [],
    orderEvents: results[13] || [],
    studioPortfolio: results[14] || [],
    studioFaq: results[15] || [],
    studioPaymentMethods: results[16] || [],
    systemStatus: {
      database: 'connected',
      telegramConfigured: isTelegramConfigured(),
      recentErrorCount: (results[7] || []).length
    }
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
    const receiptPatch = {};
    if (patch.payment_status !== undefined) receiptPatch.payment_status = patch.payment_status;
    if (patch.estimated_amount !== undefined) receiptPatch.amount = patch.estimated_amount;
    if (patch.appointment_date !== undefined || patch.appointment_time !== undefined) {
      const date = patch.appointment_date !== undefined ? patch.appointment_date : rows[0].appointment_date;
      const time = patch.appointment_time !== undefined ? patch.appointment_time : rows[0].appointment_time;
      receiptPatch.appointment = [date, time].filter(Boolean).join(' ');
    }
    if (patch.service_location !== undefined) receiptPatch.note = patch.service_location;
    if (Object.keys(receiptPatch).length) {
      await rest('receipts', { method: 'PATCH', query: { order_id: 'eq.' + rows[0].id }, body: receiptPatch });
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
  if (action === 'testTelegram') {
    await enforceRateLimit(req, 'admin-telegram-test', 3, 3600);
    const message = 'Tes notifikasi Telegram — Tama Andrea\nWaktu: ' + new Date().toISOString() + '\nSumber: panel admin';
    const configured = isTelegramConfigured();
    const initialStatus = configured ? 'queued' : 'not_configured';
    const created = await rest('notifications', {
      method: 'POST',
      body: [{ order_id: null, event: 'telegram_test', channel: 'telegram', status: initialStatus, message }],
      prefer: 'return=representation'
    });
    const item = Array.isArray(created) ? created[0] : null;
    const delivery = await sendTelegramMessage(message);
    if (item && item.id) {
      await rest('notifications', {
        method: 'PATCH',
        query: { id: 'eq.' + item.id },
        body: { status: delivery.status, sent_at: delivery.status === 'sent' ? new Date().toISOString() : null }
      });
    }
    await audit(actor, delivery.status === 'sent' ? 'TELEGRAM_TEST_SENT' : 'TELEGRAM_TEST_FAILED', { delivery_status: delivery.status }, req);
    return sendJson(res, 200, {
      status: 'ok',
      deliveryStatus: delivery.status,
      message: delivery.status === 'sent'
        ? 'Pesan tes berhasil diterima Telegram.'
        : delivery.status === 'not_configured'
          ? 'Telegram belum dikonfigurasi. Lengkapi TELEGRAM_BOT_TOKEN dan TELEGRAM_CHAT_ID di Vercel.'
          : 'Telegram belum menerima pesan tes. Periksa token, ID grup, izin bot, lalu coba lagi.'
    });
  }
  if (action === 'retryNotification') {
    await enforceRateLimit(req, 'admin-telegram-retry', 10, 3600);
    const notificationId = clean(body.notificationId, 64);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(notificationId)) {
      const error = new Error('ID notifikasi tidak valid.'); error.statusCode = 400; throw error;
    }
    const found = await rest('notifications', {
      query: { select: 'id,order_id,event,channel,status,message', id: 'eq.' + notificationId, limit: '1' }
    });
    const notification = Array.isArray(found) ? found[0] : null;
    if (!notification) {
      const error = new Error('Notifikasi tidak ditemukan.'); error.statusCode = 404; throw error;
    }
    if (notification.event !== 'order_created' || notification.channel !== 'telegram') {
      const error = new Error('Hanya notifikasi pesanan Telegram yang dapat dikirim ulang.'); error.statusCode = 400; throw error;
    }
    if (notification.status === 'sent') {
      const error = new Error('Notifikasi ini sudah berstatus terkirim.'); error.statusCode = 409; throw error;
    }
    const delivery = await sendTelegramMessage(notification.message);
    await rest('notifications', {
      method: 'PATCH',
      query: { id: 'eq.' + notificationId },
      body: { status: delivery.status, sent_at: delivery.status === 'sent' ? new Date().toISOString() : null }
    });
    await audit(actor, delivery.status === 'sent' ? 'TELEGRAM_NOTIFICATION_RETRIED' : 'TELEGRAM_NOTIFICATION_RETRY_FAILED', {
      notification_id: notificationId,
      delivery_status: delivery.status
    }, req);
    return sendJson(res, 200, {
      status: 'ok',
      deliveryStatus: delivery.status,
      message: delivery.status === 'sent'
        ? 'Notifikasi pesanan berhasil dikirim ulang.'
        : delivery.status === 'not_configured'
          ? 'Telegram belum dikonfigurasi. Lengkapi token dan ID grup di Vercel.'
          : 'Notifikasi belum berhasil dikirim ulang. Periksa konfigurasi Telegram.'
    });
  }
  if (action === 'saveStudioService') {
    const id = clean(body.id, 64);
    const name = clean(body.name, 120);
    const slug = clean(body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), 120);
    const category = clean(body.category, 80) || 'Desain Grafis';
    const description = clean(body.description, 1200);
    const priceMin = body.priceMin === '' || body.priceMin == null ? null : Number(body.priceMin);
    const priceMax = body.priceMax === '' || body.priceMax == null ? null : Number(body.priceMax);
    const priceLabel = clean(body.priceLabel, 100) || 'Konsultasi';
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Math.max(0, Math.min(9999, Number(body.sortOrder))) : 100;
    if (!name || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || (priceMin !== null && (!Number.isFinite(priceMin) || priceMin < 0)) || (priceMax !== null && (!Number.isFinite(priceMax) || priceMax < 0)) || (priceMin !== null && priceMax !== null && priceMax < priceMin)) {
      const error = new Error('Nama, slug, atau rentang harga layanan tidak valid.'); error.statusCode = 400; throw error;
    }
    const payload = { slug, name, category, description, price_min: priceMin, price_max: priceMax, price_label: priceLabel, active: body.active !== false, featured: body.featured === true, sort_order: sortOrder, updated_at: new Date().toISOString() };
    const rows = id
      ? await rest('studio_services', { method: 'PATCH', query: { id: 'eq.' + id }, body: payload, prefer: 'return=representation' })
      : await rest('studio_services', { method: 'POST', body: [payload], prefer: 'return=representation' });
    if (!Array.isArray(rows) || !rows[0]) { const error = new Error('Layanan tidak berhasil disimpan.'); error.statusCode = 404; throw error; }
    await audit(actor, id ? 'STUDIO_SERVICE_UPDATED' : 'STUDIO_SERVICE_CREATED', { service_id: rows[0].id, slug }, req);
    return sendJson(res, 200, { status: 'ok', service: rows[0] });
  }
  if (action === 'setStudioServiceActive') {
    const id = clean(body.id, 64);
    if (!/^[0-9a-f-]{36}$/i.test(id)) { const error = new Error('ID layanan tidak valid.'); error.statusCode = 400; throw error; }
    const rows = await rest('studio_services', { method: 'PATCH', query: { id: 'eq.' + id }, body: { active: body.active === true, updated_at: new Date().toISOString() }, prefer: 'return=representation' });
    if (!Array.isArray(rows) || !rows[0]) { const error = new Error('Layanan tidak ditemukan.'); error.statusCode = 404; throw error; }
    await audit(actor, body.active === true ? 'STUDIO_SERVICE_ENABLED' : 'STUDIO_SERVICE_ARCHIVED', { service_id: id }, req);
    return sendJson(res, 200, { status: 'ok', service: rows[0] });
  }
  if (action === 'moderateStudioReview') {
    const id = clean(body.id, 64);
    const status = clean(body.status, 20);
    if (!/^[0-9a-f-]{36}$/i.test(id) || !['published', 'rejected', 'archived'].includes(status)) { const error = new Error('ID atau status moderasi ulasan tidak valid.'); error.statusCode = 400; throw error; }
    const now = new Date().toISOString();
    const rows = await rest('studio_reviews', { method: 'PATCH', query: { id: 'eq.' + id }, body: { status, published_at: status === 'published' ? now : null, moderated_at: now, moderated_by: actor.id }, prefer: 'return=representation' });
    if (!Array.isArray(rows) || !rows[0]) { const error = new Error('Ulasan tidak ditemukan.'); error.statusCode = 404; throw error; }
    await audit(actor, 'STUDIO_REVIEW_MODERATED', { review_id: id, status }, req);
    return sendJson(res, 200, { status: 'ok', review: rows[0] });
  }
  if (action === 'addCustomer') {
    const name = clean(body.name, 160);
    const email = clean(body.email, 254).toLowerCase();
    const whatsapp = clean(body.whatsapp, 40);
    if (!/^[0-9a-f-]{36}$/i.test(id) || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      const error = new Error('Nama dan email customer wajib valid.'); error.statusCode = 400; throw error;
    }
    const rows = await rest('customers', {
      method: 'POST',
      body: [{ name, email_normalized: email, whatsapp, location: clean(body.location, 300), notes: clean(body.notes, 2000), order_count: 0, last_order_at: null }],
      prefer: 'return=representation'
    });
    await audit(actor, 'CUSTOMER_ADDED', { customer_added: true }, req);
    return sendJson(res, 200, { status: 'ok', customer: Array.isArray(rows) ? rows[0] : null });
  }

  if (action === 'addOrderNote') {
    const orderCode = clean(body.orderCode, 48).toUpperCase();
    const note = clean(body.note, 4000);
    const isInternal = body.isInternal !== false;
    if (!/^ORD-[A-Z0-9-]{4,36}$/.test(orderCode) || note.length < 2) {
      const error = new Error('Kode pesanan atau catatan tidak valid.'); error.statusCode = 400; throw error;
    }
    const found = await rest('orders', { query: { select: 'id,order_code', order_code: 'eq.' + orderCode, archived_at: 'is.null', limit: '1' } });
    const order = Array.isArray(found) ? found[0] : null;
    if (!order) { const error = new Error('Pesanan tidak ditemukan.'); error.statusCode = 404; throw error; }
    const rows = await rest('service_notes', {
      method: 'POST', body: [{ order_id: order.id, created_by: actor.id, note, is_internal: isInternal }],
      prefer: 'return=representation'
    });
    await audit(actor, 'ORDER_NOTE_ADDED', { order_code: orderCode, is_internal: isInternal }, req);
    return sendJson(res, 200, { status: 'ok', note: Array.isArray(rows) ? rows[0] : null });
  }
  if (action === 'recordTransaction') {
    const orderCode = clean(body.orderCode, 48).toUpperCase();
    const type = clean(body.transactionType || 'Pembayaran', 40);
    const amount = Number(body.amount);
    const status = clean(body.status || 'Menunggu', 30);
    const method = clean(body.method, 80);
    const reference = clean(body.reference, 160);
    const note = clean(body.note, 1000);
    if (!/^ORD-[A-Z0-9-]{4,36}$/.test(orderCode) || !Number.isFinite(amount) || amount <= 0 || amount > 1000000000 ||
        !['Pembayaran', 'DP', 'Pelunasan', 'Refund', 'Penyesuaian'].includes(type) ||
        !['Menunggu', 'Berhasil', 'Gagal', 'Refund', 'Dibatalkan'].includes(status)) {
      const error = new Error('Detail transaksi tidak valid.'); error.statusCode = 400; throw error;
    }
    const result = await rest('rpc/admin_record_transaction', {
      method: 'POST',
      body: {
        p_order_code: orderCode,
        p_transaction_type: type,
        p_amount: amount,
        p_status: status,
        p_method: method,
        p_reference: reference,
        p_note: note,
        p_actor_id: actor.id,
        p_actor_email: actor.email
      }
    });
    if (!result || !result.transaction || !result.transaction.id) {
      const error = new Error('Transaksi tidak berhasil dikonfirmasi database.'); error.statusCode = 502; throw error;
    }
    await audit(actor, 'TRANSACTION_RECORDED', {
      order_code: orderCode,
      transaction_id: result.transaction.id,
      amount,
      status,
      type
    }, req);
    return sendJson(res, 200, {
      status: 'ok',
      transaction: result.transaction,
      paymentStatus: result.paymentStatus || null,
      receiptUpdated: result.receiptUpdated === true
    });
  }
  if (action === 'updateCustomer') {
    const id = clean(body.id, 64);
    const name = clean(body.name, 160);
    const email = clean(body.email, 254).toLowerCase();
    const whatsapp = clean(body.whatsapp, 40);
    const location = clean(body.location, 300);
    const notes = clean(body.notes, 2000);
    if (!/^[0-9a-f-]{36}$/i.test(id) || !name || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) {
      const error = new Error('Data pelanggan tidak valid.'); error.statusCode = 400; throw error;
    }
    const rows = await rest('customers', { method: 'PATCH', query: { id: 'eq.' + id }, body: { name, email_normalized: email, whatsapp, location, notes, updated_at: new Date().toISOString() }, prefer: 'return=representation' });
    if (!Array.isArray(rows) || !rows[0]) { const error = new Error('Pelanggan tidak ditemukan.'); error.statusCode = 404; throw error; }
    await audit(actor, 'CUSTOMER_UPDATED', { customer_id: id }, req);
    return sendJson(res, 200, { status: 'ok', customer: rows[0] });
  }
  if (action === 'savePortfolioItem') {
    const id = clean(body.id, 64), title = clean(body.title, 140), category = clean(body.category, 80) || 'Desain Grafis';
    const description = clean(body.description, 1200), imageUrl = clean(body.imageUrl, 1000), altText = clean(body.altText, 240);
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Math.max(0, Math.min(9999, Number(body.sortOrder))) : 100;
    if (!title || !/^(https:\/\/|\/assets\/)/.test(imageUrl)) {
      const error = new Error('Judul dan URL gambar (https atau /assets/) wajib valid.'); error.statusCode = 400; throw error;
    }
    const payload = { title, category, description, image_url: imageUrl, alt_text: altText || title, active: body.active !== false, featured: body.featured === true, sort_order: sortOrder, updated_at: new Date().toISOString() };
    const rows = id
      ? await rest('studio_portfolio', { method: 'PATCH', query: { id: 'eq.' + id }, body: payload, prefer: 'return=representation' })
      : await rest('studio_portfolio', { method: 'POST', body: [payload], prefer: 'return=representation' });
    if (!Array.isArray(rows) || !rows[0]) { const error = new Error('Item portofolio gagal disimpan.'); error.statusCode = 404; throw error; }
    await audit(actor, id ? 'PORTFOLIO_UPDATED' : 'PORTFOLIO_CREATED', { portfolio_id: rows[0].id }, req);
    return sendJson(res, 200, { status: 'ok', item: rows[0] });
  }
  if (action === 'setPortfolioActive' || action === 'setFaqActive' || action === 'setPaymentMethodActive') {
    const id = clean(body.id, 64);
    if (!/^[0-9a-f-]{36}$/i.test(id)) { const error = new Error('ID konten tidak valid.'); error.statusCode = 400; throw error; }
    const table = action === 'setPortfolioActive' ? 'studio_portfolio' : action === 'setFaqActive' ? 'studio_faq' : 'studio_payment_methods';
    const rows = await rest(table, { method: 'PATCH', query: { id: 'eq.' + id }, body: { active: body.active === true, updated_at: new Date().toISOString() }, prefer: 'return=representation' });
    if (!Array.isArray(rows) || !rows[0]) { const error = new Error('Konten tidak ditemukan.'); error.statusCode = 404; throw error; }
    await audit(actor, action.toUpperCase(), { content_id: id, active: body.active === true }, req);
    return sendJson(res, 200, { status: 'ok', item: rows[0] });
  }
  if (action === 'saveFaqItem') {
    const id = clean(body.id, 64), question = clean(body.question, 240), answer = clean(body.answer, 2400);
    const category = clean(body.category, 80) || 'Umum';
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Math.max(0, Math.min(9999, Number(body.sortOrder))) : 100;
    if (question.length < 5 || answer.length < 5) { const error = new Error('Pertanyaan dan jawaban wajib diisi.'); error.statusCode = 400; throw error; }
    const payload = { question, answer, category, active: body.active !== false, sort_order: sortOrder, updated_at: new Date().toISOString() };
    const rows = id
      ? await rest('studio_faq', { method: 'PATCH', query: { id: 'eq.' + id }, body: payload, prefer: 'return=representation' })
      : await rest('studio_faq', { method: 'POST', body: [payload], prefer: 'return=representation' });
    if (!Array.isArray(rows) || !rows[0]) { const error = new Error('FAQ gagal disimpan.'); error.statusCode = 404; throw error; }
    await audit(actor, id ? 'FAQ_UPDATED' : 'FAQ_CREATED', { faq_id: rows[0].id }, req);
    return sendJson(res, 200, { status: 'ok', item: rows[0] });
  }
  if (action === 'savePaymentMethod') {
    const id = clean(body.id, 64), name = clean(body.name, 100);
    const slug = clean(body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), 100);
    const accountName = clean(body.accountName, 120), accountNumber = clean(body.accountNumber, 120);
    const instructions = clean(body.instructions, 1000), logoUrl = clean(body.logoUrl, 1000);
    const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Math.max(0, Math.min(9999, Number(body.sortOrder))) : 100;
    if (name.length < 2 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || (logoUrl && !/^(https:\/\/|\/assets\/)/.test(logoUrl))) {
      const error = new Error('Nama, slug, atau URL logo metode pembayaran tidak valid.'); error.statusCode = 400; throw error;
    }
    const payload = { slug, name, account_name: accountName, account_number: accountNumber, instructions, logo_url: logoUrl, active: body.active === true, sort_order: sortOrder, updated_at: new Date().toISOString() };
    const rows = id
      ? await rest('studio_payment_methods', { method: 'PATCH', query: { id: 'eq.' + id }, body: payload, prefer: 'return=representation' })
      : await rest('studio_payment_methods', { method: 'POST', body: [payload], prefer: 'return=representation' });
    if (!Array.isArray(rows) || !rows[0]) { const error = new Error('Metode pembayaran gagal disimpan.'); error.statusCode = 404; throw error; }
    await audit(actor, id ? 'PAYMENT_METHOD_UPDATED' : 'PAYMENT_METHOD_CREATED', { payment_method_id: rows[0].id, active: payload.active }, req);
    return sendJson(res, 200, { status: 'ok', item: rows[0] });
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
