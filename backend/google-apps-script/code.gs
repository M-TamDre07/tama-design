/**
 * Tama Andrea Studio — Backend Core
 * V3.0 — Sheets-backed service API
 *
 * Public API:
 *   GET  ?action=ping
 *   GET  ?action=stats
 *   GET  ?action=track&id=ORD-0001
 *   POST { action: "newOrder", data: {...} }
 *
 * Admin API (HTML Service / google.script.run):
 *   adminLogin(password)
 *   adminLogout(token)
 *   getDashboardData(searchTerm, token)
 *   saveOrderFromConsole(data, token)
 *   updateOrderFromConsole(id, patch, token)
 *   deleteOrderFromConsole(id, token)
 *
 * First setup:
 *   1. Run setupBackend()
 *   2. Run setAdminPassword() and follow the prompt.
 *   3. Deploy as Web app after authorization.
 *
 * Design goals:
 *   - no hard-coded admin password
 *   - named schemas instead of fragile column numbers
 *   - concurrency-safe order numbering
 *   - idempotent public submissions
 *   - server-side input validation
 *   - spreadsheet formula-injection protection
 *   - minimal public tracking data
 *   - structured errors + audit/error logs
 *   - batch reads/writes and short-lived caches
 *   - easy migration from legacy Sheet1
 */

const APP = Object.freeze({
  VERSION: '3.0.0', TIMEZONE: 'Asia/Jakarta', ORDER_PREFIX: 'ORD-', ORDER_WIDTH: 4,
  PUBLIC_RATE_LIMIT: 8, PUBLIC_RATE_WINDOW: 600,
  ADMIN_RATE_LIMIT: 8, ADMIN_RATE_WINDOW: 900, ADMIN_SESSION_SECONDS: 21600,
  STATS_CACHE_SECONDS: 60, MAX_BODY_BYTES: 20000, MAX_PAGE_SIZE: 50,
  DEFAULT_PAGE_SIZE: 20,
  STATUS: ['Pending', 'Proses', 'Review', 'Selesai', 'Dibatalkan'],
  PAYMENT: ['Belum Bayar', 'DP', 'Lunas', 'Dibatalkan'],
  PRIORITY: ['Rendah', 'Normal', 'Menengah', 'Tinggi'],
  OS: ['Ubuntu', 'Windows 11 LTSC', 'Windows 10 LTSC', 'Debian 13', 'Kali Linux'],
  METHOD: [
    'Teknisi datang ke rumah — kunjungan termasuk paket',
    'Saya membawa perangkat sesuai kesepakatan'
  ]
});

const SHEETS = Object.freeze({
  ORDERS: 'Orders', CUSTOMERS: 'Customers', AUDIT: 'Audit_Log',
  ERRORS: 'Error_Log', REQUESTS: 'Request_Index', SETTINGS: 'Settings'
});

const ORDER_HEADERS = [
  'ID Pesanan', 'Tanggal Masuk', 'Tanggal Update', 'Nama Lengkap', 'Alamat Email',
  'Kontak/WA', 'Kategori Layanan', 'Layanan Dipilih', 'Pilihan OS', 'Metode Layanan',
  'Rincian Brief', 'Tenggat Waktu', 'Status', 'Estimasi Biaya', 'Status Pembayaran',
  'Jumlah Revisi', 'Link Hasil', 'Prioritas Deadline', 'Hari Tersisa', 'Sumber',
  'Client Request ID', 'Catatan Internal'
];
const CUSTOMER_HEADERS = [
  'Customer ID', 'Pertama Masuk', 'Terakhir Masuk', 'Nama', 'Email', 'Kontak/WA',
  'Jumlah Pesanan', 'Order Terakhir', 'Status Customer', 'Catatan'
];
const AUDIT_HEADERS = ['Timestamp', 'Request ID', 'Actor', 'Action', 'Entity ID', 'Result', 'Detail'];
const ERROR_HEADERS = ['Timestamp', 'Request ID', 'Action', 'Code', 'Message', 'Stack'];
const REQUEST_HEADERS = ['Client Request ID', 'Order ID', 'Created At', 'Request Hash'];
const SETTINGS_HEADERS = ['Key', 'Value', 'Description', 'Updated At'];

const SERVICE_CATALOG = Object.freeze({
  'Poster & Flyer Digital': { base: 15000, min: 15000, max: 80000, group: 'design' },
  'Banner Marketplace': { base: 20000, min: 20000, max: 80000, group: 'design' },
  'Konten Media Sosial': { base: 20000, min: 20000, max: 85000, group: 'design' },
  'Logo Profesional': { base: 20000, min: 20000, max: 90000, group: 'design' },
  'Desain Presentasi': { base: 20000, min: 20000, max: 85000, group: 'design' },
  'Edit Foto Produk': { base: 20000, min: 20000, max: 80000, group: 'design' },
  'Paket OS Basic - Rp85.000': { base: 85000, min: 85000, max: 85000, group: 'it' },
  'Paket OS + Office - Rp120.000': { base: 120000, min: 120000, max: 120000, group: 'it' },
  'Paket OS + Office + Adobe - Rp150.000': { base: 150000, min: 150000, max: 150000, group: 'it' },
  'Tambahan Pasang RAM - Rp50.000': { base: 50000, min: 50000, max: 50000, group: 'it-add-on' },
  'Tambahan Pasang CPU - Rp50.000': { base: 50000, min: 50000, max: 50000, group: 'it-add-on' },
  'Tambahan Pasang GPU - Rp50.000': { base: 50000, min: 50000, max: 50000, group: 'it-add-on' },
  'Tambahan Pasang PSU - Rp50.000': { base: 50000, min: 50000, max: 50000, group: 'it-add-on' },
  'Tambahan Pasang SSD / HDD - Rp50.000': { base: 50000, min: 50000, max: 50000, group: 'it-add-on' },
  'Tambahan Upgrade 2 Komponen - Rp85.000': { base: 85000, min: 85000, max: 85000, group: 'it-add-on' },
  'Aktivasi Windows - Rp25.000': { base: 25000, min: 25000, max: 25000, group: 'it-add-on' },
  'Restore / Flash iPhone 3uTools - mulai Rp50.000': { base: 50000, min: 50000, max: 100000, group: 'it-device' }
});

function onOpen() {
  SpreadsheetApp.getUi().createMenu('TA Backend')
    .addItem('Inisialisasi / Periksa Backend', 'setupBackend')
    .addItem('Health Check', 'runHealthCheck')
    .addItem('Set / Ganti Password Admin', 'setAdminPassword')
    .addToUi();
}

function doGet(e) {
  const requestId = makeRequestId_();
  try {
    const action = getParam_(e, 'action');
    if (action === 'ping') {
      return jsonResponse_({ status: 'ok', version: APP.VERSION,
        service: 'tama-andrea-studio-backend', requestId: requestId, time: nowIso_() });
    }
    if (action === 'track') {
      enforceQuerySize_(e);
      const id = normalizeOrderId_(getParam_(e, 'id'));
      if (!id) return errorResponse_('VALIDATION_ERROR', 'ID pesanan diperlukan.', requestId);
      const order = findOrderById_(id, false);
      return order ? jsonResponse_({ status: 'ok', requestId: requestId, order: publicOrder_(order) })
        : errorResponse_('NOT_FOUND', 'Pesanan tidak ditemukan.', requestId);
    }
    if (action === 'stats') {
      return jsonResponse_({ status: 'ok', requestId: requestId, data: getPublicStats_(),
        updatedAt: formatDateTime_(new Date()) });
    }
    if (action === 'admin') return renderAdmin_();
    return jsonResponse_({ status: 'ok', service: 'Tama Andrea Studio', version: APP.VERSION,
      endpoints: ['ping', 'stats', 'track', 'newOrder'], requestId: requestId });
  } catch (err) {
    logError_(requestId, 'GET', err.code || 'INTERNAL_ERROR', err);
    return errorResponse_('INTERNAL_ERROR', 'Server mengalami kendala. Silakan coba lagi.', requestId);
  }
}

function doPost(e) {
  const requestId = makeRequestId_();
  let action = 'unknown';
  try {
    const raw = readPostBody_(e);
    action = String(raw.action || '').trim();
    if (!action) return errorResponse_('VALIDATION_ERROR', 'Action tidak ditemukan.', requestId);
    if (action === 'newOrder') {
      const clientRequestId = String(raw.clientRequestId || (raw.data && raw.data.clientRequestId) || '').trim();
      enforcePublicRateLimit_(clientRequestId || 'anonymous');
      return jsonResponse_(createNewOrderRecord_(raw.data || raw, {
        requestId: requestId, clientRequestId: clientRequestId, source: 'website'
      }));
    }
    if (action === 'adminLogin') return jsonResponse_(adminLogin(String(raw.password || '')));
    if (action === 'adminLogout') return jsonResponse_(adminLogout(String(raw.token || '')));
    return errorResponse_('UNKNOWN_ACTION', 'Action tidak dikenali.', requestId);
  } catch (err) {
    logError_(requestId, action, err.code || 'INTERNAL_ERROR', err);
    return errorResponse_(err.code || 'INTERNAL_ERROR', err.code ? err.message : 'Permintaan tidak dapat diproses.', requestId);
  }
}

function setupBackend() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Spreadsheet aktif tidak ditemukan.');
  const orders = getOrCreateSheet_(ss, SHEETS.ORDERS, ORDER_HEADERS);
  const customers = getOrCreateSheet_(ss, SHEETS.CUSTOMERS, CUSTOMER_HEADERS);
  const audit = getOrCreateSheet_(ss, SHEETS.AUDIT, AUDIT_HEADERS);
  const errors = getOrCreateSheet_(ss, SHEETS.ERRORS, ERROR_HEADERS);
  const requests = getOrCreateSheet_(ss, SHEETS.REQUESTS, REQUEST_HEADERS);
  const settings = getOrCreateSheet_(ss, SHEETS.SETTINGS, SETTINGS_HEADERS);
  migrateLegacySheet_(ss, orders);
  [orders, customers, audit, errors, requests, settings].forEach(configureSheet_);
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('TA_ORDER_SEQ')) props.setProperty('TA_ORDER_SEQ', String(findMaxOrderNumber_(orders)));
  writeSetting_(settings, 'BACKEND_VERSION', APP.VERSION, 'Versi backend aktif.');
  writeSetting_(settings, 'TIMEZONE', APP.TIMEZONE, 'Zona waktu operasional.');
  writeSetting_(settings, 'PUBLIC_TRACKING', 'LIMITED', 'Pelacakan publik hanya mengembalikan data non-sensitif.');
  writeSetting_(settings, 'ADMIN_AUTH', 'PASSWORD_HASHED_SESSION', 'Admin memakai password hash + token sesi sementara.');
  writeSetting_(settings, 'CURRENCY', 'IDR', 'Perhitungan internal menggunakan Rupiah tanpa API kurs eksternal.');
  SpreadsheetApp.flush();
  return { status: 'success', version: APP.VERSION,
    sheets: Object.keys(SHEETS).map(function(k) { return SHEETS[k]; }),
    orderSequence: Number(props.getProperty('TA_ORDER_SEQ') || 0) };
}

function getOrCreateSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const existing = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length))
      .getDisplayValues()[0].map(normalizeHeader_);
    headers.forEach(function(header, index) {
      if (existing[index] !== normalizeHeader_(header)) sheet.getRange(1, index + 1).setValue(header);
    });
  }
  return sheet;
}

function configureSheet_(sheet) {
  sheet.setFrozenRows(1);
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  sheet.getRange(1, 1, 1, lastColumn).setFontWeight('bold');
  sheet.autoResizeColumns(1, lastColumn);
}

function migrateLegacySheet_(ss, orders) {
  if (orders.getLastRow() > 1) return;
  const legacy = ss.getSheetByName('Sheet1');
  if (!legacy || legacy.getSheetId() === orders.getSheetId() || legacy.getLastRow() < 10) return;
  const oldData = legacy.getRange(10, 1, legacy.getLastRow() - 9, Math.min(legacy.getLastColumn(), 17)).getValues();
  const mapped = oldData.filter(function(row) { return row[0]; }).map(function(row) {
    const out = new Array(ORDER_HEADERS.length).fill('');
    out[0]=row[0]||''; out[1]=row[1]||''; out[2]=row[1]||''; out[3]=row[2]||''; out[4]=row[3]||'';
    out[5]=row[16]||''; out[6]=row[4]||''; out[10]=row[5]||''; out[11]=row[6]||''; out[12]=row[7]||'Pending';
    out[13]=row[8]||''; out[14]=row[9]||'Belum Bayar'; out[15]=row[10]||0; out[16]=row[11]||'';
    out[17]=row[12]||'Normal'; out[18]=row[13]||''; out[19]='legacy'; out[21]=row[15]||'';
    return out;
  });
  if (mapped.length) {
    orders.getRange(2, 1, mapped.length, ORDER_HEADERS.length).setValues(mapped);
    writeAudit_(makeRequestId_(), 'system', 'MIGRATE_LEGACY', '', 'SUCCESS', mapped.length + ' record dipindahkan dari Sheet1.');
  }
}

function runHealthCheck() {
  const result = { version: APP.VERSION, time: nowIso_(), spreadsheet: '', sheets: {} };
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    result.spreadsheet = ss ? ss.getName() : '(tidak ada)';
    Object.keys(SHEETS).forEach(function(key) {
      const name = SHEETS[key], sheet = ss.getSheetByName(name);
      result.sheets[name] = !!sheet && sheet.getLastColumn() >= 1;
    });
    result.adminPasswordConfigured = !!PropertiesService.getScriptProperties().getProperty('TA_ADMIN_PASSWORD_HASH');
    return result;
  } catch (err) {
    result.error = 'Health check gagal.'; logError_(makeRequestId_(), 'runHealthCheck', 'HEALTH_CHECK_FAILED', err); return result;
  }
}

function setAdminPassword() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('TA Backend — Password Admin',
    'Masukkan password admin. Gunakan password panjang dan unik. Password tidak disimpan plaintext.', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return { status: 'cancelled' };
  const password = String(response.getResponseText() || '');
  if (password.length < 12) { ui.alert('Password terlalu pendek. Gunakan minimal 12 karakter.'); return { status: 'error' }; }
  const salt = makeToken_();
  PropertiesService.getScriptProperties().setProperty('TA_ADMIN_PASSWORD_SALT', salt);
  PropertiesService.getScriptProperties().setProperty('TA_ADMIN_PASSWORD_HASH', hashPassword_(password, salt));
  ui.alert('Password admin berhasil disimpan secara ter-hash.');
  return { status: 'success' };
}

function adminLogin(password) {
  const requestId = makeRequestId_();
  try {
    if (!String(password || '')) return errorObject_('VALIDATION_ERROR', 'Password diperlukan.', requestId);
    if (!checkRateLimit_('admin-login', APP.ADMIN_RATE_LIMIT, APP.ADMIN_RATE_WINDOW))
      return errorObject_('RATE_LIMITED', 'Terlalu banyak percobaan. Coba lagi beberapa saat.', requestId);
    const props = PropertiesService.getScriptProperties();
    const salt = props.getProperty('TA_ADMIN_PASSWORD_SALT'), expected = props.getProperty('TA_ADMIN_PASSWORD_HASH');
    if (!salt || !expected) return errorObject_('ADMIN_NOT_CONFIGURED', 'Password admin belum dikonfigurasi.', requestId);
    if (!safeEqual_(hashPassword_(String(password), salt), expected)) {
      writeAudit_(requestId, 'anonymous', 'ADMIN_LOGIN_FAILED', '', 'DENIED', 'Percobaan login gagal.');
      return errorObject_('INVALID_CREDENTIALS', 'Password admin salah.', requestId);
    }
    const token = makeToken_();
    CacheService.getScriptCache().put('ta:admin:' + token,
      JSON.stringify({ createdAt: Date.now(), requestId: requestId }), APP.ADMIN_SESSION_SECONDS);
    writeAudit_(requestId, 'admin', 'ADMIN_LOGIN', '', 'SUCCESS', 'Sesi admin dibuat.');
    return { status: 'success', token: token, expiresIn: APP.ADMIN_SESSION_SECONDS, requestId: requestId };
  } catch (err) {
    logError_(requestId, 'adminLogin', err.code || 'ADMIN_LOGIN_ERROR', err);
    return errorObject_('INTERNAL_ERROR', 'Login admin gagal diproses.', requestId);
  }
}

function adminLogout(token) {
  const requestId = makeRequestId_();
  if (token) CacheService.getScriptCache().remove('ta:admin:' + String(token));
  writeAudit_(requestId, 'admin', 'ADMIN_LOGOUT', '', 'SUCCESS', 'Sesi admin diakhiri.');
  return { status: 'success', requestId: requestId };
}

function requireAdmin_(token) {
  const clean = String(token || '').trim();
  if (!clean || clean.length < 20) throw appError_('ADMIN_REQUIRED', 'Sesi admin diperlukan.');
  if (!CacheService.getScriptCache().get('ta:admin:' + clean))
    throw appError_('ADMIN_SESSION_EXPIRED', 'Sesi admin kedaluwarsa. Silakan login lagi.');
  return true;
}

function getDashboardData(searchTerm, token) {
  requireAdmin_(token);
  const sheet = getOrdersSheet_();
  const stats = getDashboardStats_(sheet);
  let orders = getRecentOrders_(sheet, APP.DEFAULT_PAGE_SIZE);
  const term = sanitizeText_(searchTerm, 100);
  if (term) orders = searchOrders_(sheet, term);
  return { status: 'success', stats: stats, orders: orders, sheetName: sheet.getName(), version: APP.VERSION,
    updatedAt: formatDateTime_(new Date()) };
}

function saveOrderFromConsole(formData, token) {
  requireAdmin_(token);
  return createNewOrderRecord_(formData || {}, { requestId: makeRequestId_(),
    clientRequestId: String((formData || {}).clientRequestId || ''), source: 'admin' });
}

function updateOrderFromConsole(id, patch, token) {
  requireAdmin_(token);
  const requestId = makeRequestId_(), normalizedId = normalizeOrderId_(id);
  if (!normalizedId) throw appError_('VALIDATION_ERROR', 'ID pesanan tidak valid.');
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const found = findOrderRow_(normalizedId);
    if (!found) throw appError_('NOT_FOUND', 'Pesanan tidak ditemukan.');
    const data = patch || {}, row = found.rowValues.slice();
    if (hasOwn_(data, 'status')) row[12] = validateEnum_(data.status, APP.STATUS, 'Status');
    if (hasOwn_(data, 'statusPembayaran')) row[14] = validateEnum_(data.statusPembayaran, APP.PAYMENT, 'Status pembayaran');
    if (hasOwn_(data, 'link')) row[16] = sanitizeForSheet_(data.link, 500);
    if (hasOwn_(data, 'jumlahRevisi')) row[15] = clampInt_(data.jumlahRevisi, 0, 99, 'Jumlah revisi');
    if (hasOwn_(data, 'prioritas')) row[17] = validateEnum_(data.prioritas, APP.PRIORITY, 'Prioritas');
    if (hasOwn_(data, 'catatan')) row[21] = sanitizeForSheet_(data.catatan, 1000);
    if (hasOwn_(data, 'tenggat')) row[11] = parseDateInput_(data.tenggat, 'Tenggat');
    row[2] = new Date(); row[18] = computeDaysLeft_(row[11]);
    found.sheet.getRange(found.rowNumber, 1, 1, ORDER_HEADERS.length).setValues([row]);
    writeAudit_(requestId, 'admin', 'UPDATE_ORDER', normalizedId, 'SUCCESS', 'Data pesanan diperbarui.');
    return { status: 'success', requestId: requestId, order: rowToOrder_(row) };
  } finally { lock.releaseLock(); }
}

function deleteOrderFromConsole(id, token) {
  requireAdmin_(token);
  const requestId = makeRequestId_(), normalizedId = normalizeOrderId_(id);
  if (!normalizedId) throw appError_('VALIDATION_ERROR', 'ID pesanan tidak valid.');
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const found = findOrderRow_(normalizedId);
    if (!found) throw appError_('NOT_FOUND', 'Pesanan tidak ditemukan.');
    found.sheet.deleteRow(found.rowNumber);
    writeAudit_(requestId, 'admin', 'DELETE_ORDER', normalizedId, 'SUCCESS', 'Pesanan dihapus.');
    return { status: 'success', requestId: requestId, id: normalizedId };
  } finally { lock.releaseLock(); }
}

function analyzeBriefFromConsole(layanan, brief, token) { requireAdmin_(token); return analyzeOrder_(layanan, brief); }

function createNewOrderRecord_(params, meta) {
  const requestId = meta.requestId || makeRequestId_(), raw = params || {};
  validatePayloadSize_(raw);
  const input = normalizeOrderInput_(raw);
  if (meta.clientRequestId) input.clientRequestId = normalizeClientRequestId_(meta.clientRequestId);
  if (input.clientRequestId) {
    const existing = findRequestIndex_(input.clientRequestId);
    if (existing) {
      const order = findOrderById_(existing.orderId, true);
      return { status: 'success', id: existing.orderId, duplicate: true, requestId: requestId,
        estimate: order ? order.biaya : '', deadline: order ? order.tenggat : '',
        priority: order ? order.prioritas : 'Normal', days: order ? Number(order.hariTersisa || 0) : 0 };
    }
  }
  const analysis = analyzeOrder_(input.layanan, input.brief, input.os);
  const lock = LockService.getScriptLock(); lock.waitLock(10000);
  try {
    const sheet = getOrdersSheet_(), orderId = nextOrderId_(sheet), now = new Date();
    const deadline = addBusinessDays_(now, analysis.hariEstimasi), row = new Array(ORDER_HEADERS.length).fill('');
    row[0]=orderId; row[1]=now; row[2]=now; row[3]=sanitizeForSheet_(input.nama,80); row[4]=sanitizeForSheet_(input.email,120);
    row[5]=sanitizeForSheet_(input.wa,30); row[6]=sanitizeForSheet_(input.kategori,40); row[7]=sanitizeForSheet_(input.layanan,500);
    row[8]=sanitizeForSheet_(input.os,40); row[9]=sanitizeForSheet_(input.metode,120); row[10]=sanitizeForSheet_(input.brief,3000);
    row[11]=deadline; row[12]='Pending'; row[13]=analysis.finalPriceIDR; row[14]='Belum Bayar'; row[15]=0; row[16]='';
    row[17]=analysis.priority; row[18]=analysis.hariEstimasi; row[19]=meta.source || 'website'; row[20]=sanitizeForSheet_(input.clientRequestId,100);
    row[21]=['Analyzer:',analysis.ruleSummary,'| Estimasi:',analysis.formattedPrice,'| Risiko:',analysis.riskFlags.join(', ')||'none'].join(' ');
    const rowNumber = sheet.getLastRow()+1; sheet.getRange(rowNumber,1,1,ORDER_HEADERS.length).setValues([row]);
    sheet.getRange(rowNumber,2,1,2).setNumberFormat('dd/MM/yyyy HH:mm'); sheet.getRange(rowNumber,12).setNumberFormat('dd/MM/yyyy'); sheet.getRange(rowNumber,14).setNumberFormat('#,##0');
    upsertCustomer_(input, orderId, now); if (input.clientRequestId) saveRequestIndex_(input.clientRequestId, orderId, requestId);
    writeAudit_(requestId, meta.source === 'admin' ? 'admin' : 'public', 'CREATE_ORDER', orderId, 'SUCCESS', 'Pesanan baru dibuat.');
    return { status:'success', id:orderId, orderId:orderId, requestId:requestId, layanan:input.layanan,
      estimate:analysis.formattedPrice, estimatePrice:analysis.finalPriceIDR, estimateMin:analysis.minPriceIDR,
      estimateMax:analysis.maxPriceIDR, deadline:formatDate_(deadline), priority:analysis.priority, days:analysis.hariEstimasi,
      analysis:{qualityScore:analysis.qualityScore,difficulty:analysis.difficultyLabel,ruleSummary:analysis.ruleSummary} };
  } finally { lock.releaseLock(); }
}

function normalizeOrderInput_(params) {
  const nama = sanitizeText_(params.Nama || params['Nama Lengkap'] || '',80);
  const email = String(params.Email || params['Alamat Email'] || '').trim().toLowerCase();
  const wa = String(params.WA || params.WhatsApp || params['Kontak/WA'] || params['No. WhatsApp'] || '').replace(/[^\d+]/g,'');
  const kategori = sanitizeText_(params.Kategori || params['Kategori Layanan'] || params['Jenis Desain'] || 'Desain & Kreatif',40);
  const layanan = sanitizeText_(params.Layanan || params['Layanan Dipilih'] || params.Service || '',500);
  const os = sanitizeText_(params.OS || params['Pilihan OS'] || '',40);
  const metode = sanitizeText_(params.Metode || params['Metode Layanan'] || '',120);
  const brief = sanitizeText_(params.Brief || params['Rincian Brief'] || params['Keterangan Proyek'] || '',3000);
  const clientRequestId = normalizeClientRequestId_(params.clientRequestId || params['Client Request ID'] || '');

  if (nama.length < 2) throw appError_('VALIDATION_ERROR','Nama minimal 2 karakter.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw appError_('VALIDATION_ERROR','Format email tidak valid.');
  if (wa && !/^\+?\d{8,15}$/.test(wa)) throw appError_('VALIDATION_ERROR','Nomor WhatsApp tidak valid.');
  if (layanan.length < 2) throw appError_('VALIDATION_ERROR','Layanan belum dipilih.');
  if (brief.length < 5) throw appError_('VALIDATION_ERROR','Keterangan kebutuhan terlalu singkat.');
  if (os && APP.OS.indexOf(os) === -1) throw appError_('VALIDATION_ERROR','Pilihan OS tidak dikenali.');
  if (metode && APP.METHOD.indexOf(metode) === -1) throw appError_('VALIDATION_ERROR','Metode layanan tidak dikenali.');
  if (kategori.indexOf('Desain') !== -1 && /Paket OS|Pasang (RAM|CPU|GPU|PSU)|SSD \/ HDD|Activation|Flash iPhone/i.test(layanan))
    throw appError_('VALIDATION_ERROR','Layanan IT tidak cocok dengan kategori desain.');
  if (kategori.indexOf('Servis') !== -1 && /Poster|Banner|Logo|Presentasi|Media Sosial|Foto Produk/i.test(layanan))
    throw appError_('VALIDATION_ERROR','Layanan desain tidak cocok dengan kategori servis IT.');
  return { nama:nama,email:email,wa:wa,kategori:kategori,layanan:layanan,os:os,metode:metode,brief:brief,clientRequestId:clientRequestId };
}

function validatePayloadSize_(payload) { if (JSON.stringify(payload || {}).length > APP.MAX_BODY_BYTES) throw appError_('PAYLOAD_TOO_LARGE','Data yang dikirim terlalu besar.'); }
function enforcePublicRateLimit_(key) { if (!checkRateLimit_('public:' + (sanitizeText_(key || 'anonymous',100) || 'anonymous'), APP.PUBLIC_RATE_LIMIT, APP.PUBLIC_RATE_WINDOW)) throw appError_('RATE_LIMITED','Terlalu banyak permintaan. Tunggu beberapa menit lalu coba lagi.'); }
function checkRateLimit_(key,maxCount,windowSeconds){ const cache=CacheService.getScriptCache(), cacheKey='rl:'+hashShort_(key), current=Number(cache.get(cacheKey)||0); if(current>=maxCount)return false; cache.put(cacheKey,String(current+1),windowSeconds); return true; }

function analyzeOrder_(layanan, briefText, os) {
  const layananNorm=String(layanan||''), brief=String(briefText||'').toLowerCase();
  const selected=layananNorm.split(',').map(function(v){return v.trim();}).filter(Boolean);
  let base=0,minPrice=0,maxPrice=0,known=0;
  selected.forEach(function(item){
    const key=Object.keys(SERVICE_CATALOG).find(function(k){return item.indexOf(k)!==-1||k.indexOf(item)!==-1;});
    if(key){const c=SERVICE_CATALOG[key];base+=c.base;minPrice+=c.min;maxPrice+=c.max;known++;}
    else{base+=25000;minPrice+=25000;maxPrice+=25000;}
  });
  if(base===0){base=/servis|OS|RAM|CPU|GPU|PSU|SSD|HDD|iPhone/i.test(layananNorm)?85000:20000;minPrice=base;maxPrice=base;}
  const urgent=['urgent','besok','segera','buru','mendesak','hari ini','malam ini'].some(function(k){return brief.indexOf(k)!==-1;});
  const complex=['3d','animasi','manipulasi','detail','banyak halaman','banyak konsep','multi','branding lengkap','revisi banyak','kompleks'].some(function(k){return brief.indexOf(k)!==-1;});
  const light=['sederhana','simple','simpel','ringan','satu halaman','satu desain'].some(function(k){return brief.indexOf(k)!==-1;});
  let multiplier=1,priority='Normal',days=3; const risks=[];
  if(urgent){multiplier*=1.10;priority='Tinggi';days=1;risks.push('deadline-mendesak');}
  if(complex){multiplier*=1.15;if(priority!=='Tinggi')priority='Menengah';days+=2;risks.push('brief-kompleks');}
  if(light){multiplier*=0.95;days=Math.max(1,days-1);if(!urgent&&!complex)priority='Rendah';}
  const finalPrice=Math.round(base*multiplier/1000)*1000, qualityScore=calculateBriefQuality_(briefText);
  if(qualityScore<50)risks.push('brief-perlu-diperjelas');
  if(!os&&/install|instalasi|OS|Windows|Ubuntu|Debian|Kali/i.test(layananNorm))risks.push('OS-belum-dipilih');
  if(known<selected.length)risks.push('layanan-tidak-dikenal-penuh');
  return {finalPriceIDR:finalPrice,minPriceIDR:Math.round(minPrice*multiplier/1000)*1000,maxPriceIDR:Math.round(maxPrice*multiplier/1000)*1000,
    formattedPrice:'Rp '+formatRupiah_(finalPrice),priority:priority,hariEstimasi:days,difficultyLabel:complex?'Kompleks':(light?'Ringan':'Normal'),
    qualityScore:qualityScore,detected:{urgent:urgent,complex:complex,light:light},riskFlags:risks,
    ruleSummary:['base='+base,'multiplier='+multiplier.toFixed(2),'quality='+qualityScore,'known='+known+'/'+selected.length].join(', ')};
}

function calculateBriefQuality_(brief){const text=String(brief||'').trim();if(!text)return 0;let score=20;if(text.length>=30)score+=15;if(text.length>=80)score+=15;if(text.length>=160)score+=10;
  if(/(ukuran|size|dimensi|px|cm|mm)/i.test(text))score+=10;if(/(deadline|tenggat|tanggal|besok|hari)/i.test(text))score+=10;
  if(/(referensi|contoh|warna|brand|target|tujuan)/i.test(text))score+=15;if(/(format|png|jpg|pdf|pptx|ai|psd|svg)/i.test(text))score+=5;return Math.min(100,score);}

function getOrdersSheet_(){const ss=SpreadsheetApp.getActiveSpreadsheet();if(!ss)throw new Error('Spreadsheet aktif tidak ditemukan.');let sheet=ss.getSheetByName(SHEETS.ORDERS);if(!sheet){setupBackend();sheet=ss.getSheetByName(SHEETS.ORDERS);}if(!sheet)throw new Error('Sheet Orders tidak ditemukan.');return sheet;}
function nextOrderId_(sheet){const props=PropertiesService.getScriptProperties();let seq=Number(props.getProperty('TA_ORDER_SEQ')||0);if(!seq)seq=findMaxOrderNumber_(sheet);seq++;props.setProperty('TA_ORDER_SEQ',String(seq));return APP.ORDER_PREFIX+String(seq).padStart(APP.ORDER_WIDTH,'0');}
function findMaxOrderNumber_(sheet){const lastRow=sheet.getLastRow();if(lastRow<2)return 0;return sheet.getRange(2,1,lastRow-1,1).getDisplayValues().flat().reduce(function(max,value){const m=String(value||'').match(/(\d+)/);return m?Math.max(max,Number(m[1])||0):max;},0);}
function findOrderRow_(id){const sheet=getOrdersSheet_(),lastRow=sheet.getLastRow();if(lastRow<2)return null;const ids=sheet.getRange(2,1,lastRow-1,1).getDisplayValues().flat(),target=String(id).trim().toUpperCase();for(let i=0;i<ids.length;i++){if(String(ids[i]||'').trim().toUpperCase()===target)return {sheet:sheet,rowNumber:i+2,rowValues:sheet.getRange(i+2,1,1,ORDER_HEADERS.length).getValues()[0]};}return null;}
function findOrderById_(id,full){const found=findOrderRow_(id);if(!found)return null;const order=rowToOrder_(found.rowValues);return full?order:publicOrder_(order);}
function getRecentOrders_(sheet,limit){const lastRow=sheet.getLastRow();if(lastRow<2)return [];const size=Math.min(Number(limit)||APP.DEFAULT_PAGE_SIZE,APP.MAX_PAGE_SIZE),start=Math.max(2,lastRow-size+1);return sheet.getRange(start,1,lastRow-start+1,ORDER_HEADERS.length).getValues().reverse().filter(function(r){return r[0];}).map(rowToOrder_);}
function searchOrders_(sheet,term){const lastRow=sheet.getLastRow();if(lastRow<2)return [];const normalized=normalizeSearch_(term),data=sheet.getRange(2,1,lastRow-1,ORDER_HEADERS.length).getValues();return data.filter(function(row){return [row[0],row[3],row[4],row[5],row[6],row[7],row[10],row[12]].map(normalizeSearch_).join(' ').indexOf(normalized)!==-1;}).reverse().slice(0,APP.MAX_PAGE_SIZE).map(rowToOrder_);}
function rowToOrder_(row){const payment=valueString_(row[14])||'Belum Bayar';return {id:valueString_(row[0]),tanggalMasuk:formatDateTimeValue_(row[1]),tanggalUpdate:formatDateTimeValue_(row[2]),nama:valueString_(row[3]),email:valueString_(row[4]),wa:valueString_(row[5]),kategori:valueString_(row[6]),layanan:valueString_(row[7]),os:valueString_(row[8]),metode:valueString_(row[9]),brief:valueString_(row[10]),tenggat:formatDateValue_(row[11]),status:valueString_(row[12])||'Pending',biaya:row[13]===''?'':'Rp '+formatRupiah_(row[13]),estimatePrice:parseNumber_(row[13]),statusPembayaran:payment,statusBayar:payment,revisi:row[15]===''?'0':String(row[15]),link:valueString_(row[16]),prioritas:valueString_(row[17])||'Normal',hariTersisa:row[18]===''?'':String(computeDaysLeft_(row[11])),sumber:valueString_(row[19]),clientRequestId:valueString_(row[20]),catatan:valueString_(row[21])};}
function publicOrder_(order){return {id:order.id,layanan:order.layanan,status:order.status,tenggat:order.tenggat,revisi:order.revisi};}
function getPublicStats_(){const cache=CacheService.getScriptCache(),cached=cache.get('ta:public:stats');if(cached)return JSON.parse(cached);const s=getDashboardStats_(getOrdersSheet_()),result={totalPesanan:s.totalPesanan,pending:s.pending,proses:s.proses,review:s.review,selesai:s.selesai};cache.put('ta:public:stats',JSON.stringify(result),APP.STATS_CACHE_SECONDS);return result;}
function getDashboardStats_(sheet){const stats={totalPesanan:0,pending:0,proses:0,review:0,selesai:0,dibatalkan:0,terlambat:0,estimasiRevenue:0,bulanIni:0,menungguDp:0,lunas:0,revisiAktif:0},lastRow=sheet.getLastRow();if(lastRow<2)return stats;const data=sheet.getRange(2,1,lastRow-1,ORDER_HEADERS.length).getValues(),thisMonth=Utilities.formatDate(new Date(),APP.TIMEZONE,'yyyy-MM');data.forEach(function(row){if(!row[0])return;stats.totalPesanan++;const status=normalizeSearch_(row[12]);if(status==='pending')stats.pending++;else if(status==='proses')stats.proses++;else if(status==='review')stats.review++;else if(status==='selesai')stats.selesai++;else if(status==='dibatalkan')stats.dibatalkan++;const payment=normalizeSearch_(row[14]);if(payment==='belum bayar')stats.menungguDp++;else if(payment==='lunas')stats.lunas++;stats.estimasiRevenue+=parseNumber_(row[13]);stats.revisiAktif+=parseNumber_(row[15]);const date=row[1]instanceof Date?row[1]:new Date(row[1]);if(!isNaN(date.getTime())&&Utilities.formatDate(date,APP.TIMEZONE,'yyyy-MM')===thisMonth)stats.bulanIni++;if(computeDaysLeft_(row[11])<0&&status!=='selesai'&&status!=='dibatalkan')stats.terlambat++;});return stats;}

function upsertCustomer_(input,orderId,now){const sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.CUSTOMERS);if(!sheet)return;const lastRow=sheet.getLastRow(),email=normalizeSearch_(input.email);let foundRow=0;if(lastRow>=2){const emails=sheet.getRange(2,5,lastRow-1,1).getDisplayValues().flat();for(let i=0;i<emails.length;i++){if(normalizeSearch_(emails[i])===email){foundRow=i+2;break;}}}if(!foundRow){sheet.appendRow(['CUS-'+hashShort_(email+Date.now()),now,now,sanitizeForSheet_(input.nama,80),sanitizeForSheet_(input.email,120),sanitizeForSheet_(input.wa,30),1,orderId,'Aktif','']);}else{const currentCount=parseNumber_(sheet.getRange(foundRow,7).getValue())+1;sheet.getRange(foundRow,3).setValue(now);sheet.getRange(foundRow,4).setValue(sanitizeForSheet_(input.nama,80));sheet.getRange(foundRow,6).setValue(sanitizeForSheet_(input.wa,30));sheet.getRange(foundRow,7).setValue(currentCount);sheet.getRange(foundRow,8).setValue(orderId);}}
function findRequestIndex_(clientRequestId){const sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.REQUESTS);if(!sheet||sheet.getLastRow()<2)return null;const target=normalizeClientRequestId_(clientRequestId),values=sheet.getRange(2,1,sheet.getLastRow()-1,4).getDisplayValues();for(let i=values.length-1;i>=0;i--)if(String(values[i][0]).trim()===target)return {orderId:values[i][1],row:i+2};return null;}
function saveRequestIndex_(clientRequestId,orderId,requestId){const sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.REQUESTS);if(!sheet)return;sheet.appendRow([clientRequestId,orderId,new Date(),hashShort_(clientRequestId+'|'+orderId+'|'+requestId)]);}
function writeAudit_(requestId,actor,action,entityId,result,detail){try{const sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.AUDIT);if(!sheet)return;sheet.appendRow([new Date(),sanitizeForSheet_(requestId,100),sanitizeForSheet_(actor,50),sanitizeForSheet_(action,80),sanitizeForSheet_(entityId,100),sanitizeForSheet_(result,30),sanitizeForSheet_(detail,500)]);}catch(err){Logger.log('Audit log gagal: '+err);}}
function logError_(requestId,action,code,err){try{const sheet=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.ERRORS);if(!sheet)return;sheet.appendRow([new Date(),sanitizeForSheet_(requestId,100),sanitizeForSheet_(action,80),sanitizeForSheet_(code,50),sanitizeForSheet_(err&&err.message?err.message:String(err),500),sanitizeForSheet_(err&&err.stack?err.stack:'',1000)]);}catch(logErr){Logger.log('Error log gagal: '+logErr);}}

function readPostBody_(e){const content=e&&e.postData&&e.postData.contents?String(e.postData.contents):'{}';if(content.length>APP.MAX_BODY_BYTES)throw appError_('PAYLOAD_TOO_LARGE','Ukuran permintaan melebihi batas.');try{return JSON.parse(content);}catch(_){if(e&&e.parameter)return e.parameter;throw appError_('INVALID_JSON','Data yang dikirim bukan JSON yang valid.');}}
function enforceQuerySize_(e){if(String(getParam_(e,'id')).length>80)throw appError_('VALIDATION_ERROR','Parameter terlalu panjang.');}
function renderAdmin_(){try{return HtmlService.createTemplateFromFile('index').evaluate().setTitle('Tama Andrea Studio — Admin').addMetaTag('viewport','width=device-width, initial-scale=1').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);}catch(err){return HtmlService.createHtmlOutput('<!doctype html><html><body style="font-family:system-ui;padding:32px"><h1>Admin belum siap</h1><p>File index.html untuk panel admin belum ditemukan.</p><p>API publik tetap berjalan.</p></body></html>');}}
function getParam_(e,key){return e&&e.parameter?String(e.parameter[key]||''):'';}
function jsonResponse_(obj){return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);}
function errorResponse_(code,message,requestId){return jsonResponse_(errorObject_(code,message,requestId));}
function errorObject_(code,message,requestId){return {status:'error',code:code,message:message,requestId:requestId};}
function appError_(code,message){const err=new Error(message);err.code=code;return err;}
function makeRequestId_(){return 'REQ-'+Utilities.getUuid().replace(/-/g,'').slice(0,20).toUpperCase();}
function makeToken_(){return Utilities.getUuid().replace(/-/g,'')+Utilities.getUuid().replace(/-/g,'');}
function hashPassword_(password,salt){let value=String(salt)+'|'+String(password);for(let i=0;i<2500;i++)value=bytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,value,Utilities.Charset.UTF_8));return value;}
function hashShort_(text){return bytesToHex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,String(text),Utilities.Charset.UTF_8)).slice(0,20);}
function bytesToHex_(bytes){return bytes.map(function(b){const n=b<0?b+256:b;return ('0'+n.toString(16)).slice(-2);}).join('');}
function safeEqual_(a,b){const left=String(a),right=String(b);if(left.length!==right.length)return false;let diff=0;for(let i=0;i<left.length;i++)diff|=left.charCodeAt(i)^right.charCodeAt(i);return diff===0;}
function sanitizeText_(value,max){let text=String(value==null?'':value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g,' ').replace(/\s+/g,' ').trim();return text.length>max?text.slice(0,max):text;}
function sanitizeForSheet_(value,max){const text=sanitizeText_(value,max);return /^[=+\-@]/.test(text)?"'"+text:text;}
function normalizeClientRequestId_(value){const text=sanitizeText_(value,100);if(!text)return '';if(!/^[A-Za-z0-9._:-]{8,100}$/.test(text))throw appError_('VALIDATION_ERROR','Client Request ID tidak valid.');return text;}
function normalizeOrderId_(value){const text=sanitizeText_(value,30).toUpperCase();if(!text)return '';const id=text.indexOf(APP.ORDER_PREFIX)===0?text:APP.ORDER_PREFIX+text;return /^ORD-\d{1,12}$/.test(id)?id:'';}
function normalizeHeader_(value){return String(value||'').toLowerCase().replace(/\s+/g,' ').trim();}
function normalizeSearch_(value){return String(value==null?'':value).toLowerCase().trim();}
function valueString_(value){return value==null?'':String(value);}
function formatRupiah_(value){return new Intl.NumberFormat('id-ID').format(parseNumber_(value));}
function parseNumber_(value){const n=Number(String(value==null?'':value).replace(/[^\d.-]/g,''));return isNaN(n)?0:n;}
function formatDate_(value){const date=value instanceof Date?value:new Date(value);if(isNaN(date.getTime()))return '';return Utilities.formatDate(date,APP.TIMEZONE,'dd/MM/yyyy');}
function formatDateTime_(value){return Utilities.formatDate(value instanceof Date?value:new Date(value),APP.TIMEZONE,'dd/MM/yyyy HH:mm:ss');}
function formatDateTimeValue_(value){if(!value)return '';try{return formatDateTime_(value);}catch(_){return String(value);}}
function formatDateValue_(value){if(!value)return '';try{return formatDate_(value);}catch(_){return String(value);}}
function nowIso_(){return new Date().toISOString();}
function addBusinessDays_(date,days){const result=new Date(date.getTime());let remaining=Number(days)||0;while(remaining>0){result.setDate(result.getDate()+1);const day=result.getDay();if(day!==0&&day!==6)remaining--;}return result;}
function computeDaysLeft_(dateValue){if(!dateValue)return '';const due=dateValue instanceof Date?dateValue:new Date(dateValue);if(isNaN(due.getTime()))return '';const today=new Date(),start=new Date(today.getFullYear(),today.getMonth(),today.getDate()),end=new Date(due.getFullYear(),due.getMonth(),due.getDate());return Math.ceil((end-start)/86400000);}
function parseDateInput_(value,label){const text=sanitizeText_(value,30);if(!text)throw appError_('VALIDATION_ERROR',label+' diperlukan.');const date=new Date(text);if(isNaN(date.getTime()))throw appError_('VALIDATION_ERROR',label+' tidak valid.');return date;}
function validateEnum_(value,allowed,label){const text=sanitizeText_(value,100);if(allowed.indexOf(text)===-1)throw appError_('VALIDATION_ERROR',label+' tidak valid.');return text;}
function clampInt_(value,min,max,label){const number=Number(value);if(!Number.isInteger(number)||number<min||number>max)throw appError_('VALIDATION_ERROR',label+' tidak valid.');return number;}
function hasOwn_(obj,key){return Object.prototype.hasOwnProperty.call(obj,key);}
function writeSetting_(sheet,key,value,description){const lastRow=sheet.getLastRow(),keys=lastRow>1?sheet.getRange(2,1,lastRow-1,1).getDisplayValues().flat():[];let row=0;for(let i=0;i<keys.length;i++)if(String(keys[i]).trim()===key){row=i+2;break;}if(!row)row=sheet.getLastRow()+1;sheet.getRange(row,1,1,4).setValues([[key,value,description,new Date()]]);}
'''
