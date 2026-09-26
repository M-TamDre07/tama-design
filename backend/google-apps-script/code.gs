/**
 * Tama Andrea Studio — Complete Backend System
 * Consolidated from all .gs modules
 * v2026.09.2
 * 
 * Features:
 * - Dual-gate authentication (username/password + Telegram OTP)
 * - Device tracking & fingerprinting
 * - GPS verification
 * - Automatic device expiry (90 days)
 * - Telegram notifications
 * - Sheet maintenance & cleanup
 * - Audit logging
 * - Production monitoring
 */

// ============================================================================
// CONFIGURATION & CONSTANTS
// ============================================================================

const APP = Object.freeze({
  VERSION: '2026.09.2',
  STATUS: ['Pending', 'In Progress', 'Completed', 'On Hold', 'Cancelled'],
  PAYMENT: ['Unpaid', 'Partial', 'Paid', 'Refund'],
  PRIORITY: ['Normal', 'High', 'Urgent', 'Low'],
  DEVICE_EXPIRY_DAYS: 90,
  // WAJIB (true): sesuai desain sistem — user tidak boleh lanjut ke tahap
  // login sama sekali tanpa mengaktifkan GPS (lihat Gerbang 0 di index.html).
  // Set false HANYA untuk testing lokal di mesin dev tanpa sensor GPS.
  GPS_REQUIRED: true,
  // Sesi dashboard admin (dipakai google.script.run.getDashboardData dkk)
  // berlaku berapa jam sebelum harus login ulang lewat 3 gerbang.
  SESSION_HOURS: 12
});

const SHEETS = Object.freeze({
  ORDERS: 'Orders',
  CUSTOMERS: 'Customers',
  AUDIT: 'Audit_Log',
  ERRORS: 'Error_Log',
  REQUESTS: 'Request_Index',
  SETTINGS: 'Settings',
  DEVICES: 'Devices_Verified',
  SERVICE_NOTES: 'Service_Notes',
  BOOT_KEYS: 'Boot_Keys',
  SERVICE_QUEUE: 'Service_Queue',
  SERVICE_VISITS: 'Service_Visits',
  TRANSACTIONS: 'Transactions',
  RECEIPTS: 'Receipts',
  NOTIFICATIONS: 'Notifications'
});

const ORDER_HEADERS = ['Order ID','Created At','Updated At','Customer Name','Email','WhatsApp','Category','Service','OS','Method','Brief','Deadline','Status','Estimate','Payment','Payment Date','Priority','Notes','Source','Client Request ID','Tags','Internal Notes','Appointment Date','Appointment Time','Service Location','Location Link','Location Latitude','Location Longitude','Accessibility Preference'];
const CUSTOMER_HEADERS = ['Customer ID','First Contact','Last Contact','Name','Email','WhatsApp','Order Count','Last Order Date','Location','Notes'];
const AUDIT_HEADERS = ['Timestamp','Request ID','User Email','Action','Status','Details','Device ID','IP Address','Device Location'];
const ERROR_HEADERS = ['Timestamp','Request ID','Handler','Error Code','Message','Stack Trace','Attempted At'];
const REQUEST_HEADERS = ['Request ID','Created At','Type','Status','Message','Response','Metadata'];
const SETTINGS_HEADERS = ['Setting Key','Value','Type','Updated At','Updated By'];
const DEVICE_HEADERS = ['Device Fingerprint','Device ID','Registered At','IP Address','Location (GPS)','User Agent','Trust Level','Last Used','ISP/Organisasi','Reverse DNS'];

const TA_PUBLIC_SERVICE_CONFIG = Object.freeze({
  VERSION: '2026.09.3',
  STUDIO_NAME: 'Tama Andrea Studio',
  LOCATION_LABEL: 'Kalianda · Lampung Selatan',
  MAP_URL: 'https://maps.app.goo.gl/K7HxLTnStVvTn9pW7',
  VISIT_FEE_MIN: 20000,
  METHODS: Object.freeze([
    'Saya membawa perangkat — datang ke studio',
    'Teknisi datang ke lokasi — jadwal temu'
  ]),
  BENEFITS: Object.freeze([
    'Instal OS yang kompatibel',
    'Driver dasar',
    'Update sistem dasar',
    'Konfigurasi awal',
    'Testing fungsi dasar',
    'Hingga 5 software dasar pilihan pelanggan (bukan Microsoft Office)'
  ]),
  BASIC_SOFTWARE_NOTE: 'Hingga 5 software dasar pilihan pelanggan. Microsoft Office tidak termasuk; aplikasi berbayar perlu dikonsultasikan terlebih dahulu.',
  ACCESSIBILITY_OPTIONS: Object.freeze([
    'Tidak ada kebutuhan khusus',
    'Pembacaan teks / screen reader',
    'Teks lebih besar & kontras tinggi',
    'Komunikasi berbasis teks',
    'Kebutuhan lainnya — jelaskan di keterangan'
  ]),
  PRICES: Object.freeze({
    WINDOWS_10_BASIC: 80000,
    WINDOWS_11_BASIC: 100000,
    WINDOWS_10_LTSC_2021: 90000,
    WINDOWS_11_LTSC_2024: 150000,
    LINUX: 100000,
    OFFICE_2024_HOME: 80000,
    OS_OFFICE: 165000,
    OS_BACKUP: 130000,
    OS_OFFICE_BACKUP: 210000,
    DIAGNOSIS: 30000,
    SSD_CHECK: 35000,
    BACKUP: 40000,
    BIOS_LAPTOP: 50000,
    PART_LIGHT: 50000,
    PART_HEAVY: 100000,
    QUICK_FLASH_ANDROID: 80000,
    QUICK_FLASH_IPHONE: 85000,
    FIND_DEVICE: 35000
  })
});
const SERVICE_QUEUE_HEADERS = ['Queue ID','Queue Date','Queue Number','Order ID','Customer ID','Service','Method','Appointment Date','Appointment Time','Status','Location Link','Created At','Updated At'];
const SERVICE_VISITS_HEADERS = ['Visit ID','Order ID','Customer ID','Method','Appointment Date','Appointment Time','Location Text','Maps Link','Latitude','Longitude','Visit Fee','Status','Notes','Created At','Updated At'];
const TRANSACTION_HEADERS = ['Transaction ID','Order ID','Customer ID','Created At','Type','Amount','Status','Method','Reference','Note'];
const RECEIPT_HEADERS = ['Receipt ID','Order ID','Customer ID','Created At','Service','Amount','Payment Status','Method','Queue ID','Appointment','Location Link','Note'];
const NOTIFICATION_HEADERS = ['Notification ID','Order ID','Created At','Event','Channel','Status','Message','Sent At'];



// Prefix Script Properties untuk session token dashboard admin (google.script.run.getDashboardData dkk).
const SESSION_PROPERTY_PREFIX = 'TA_SESSION_';

const TELEGRAM_CONFIG = Object.freeze({
  groupId: '-1003943799973',
  botId: '8273131182',
  tokenProperty: 'TA_TELEGRAM_BOT_TOKEN',
  sentPrefix: 'TA_TELEGRAM_SENT_',
  cursorProperty: 'TA_TELEGRAM_LAST_ORDER_ROW',
  triggerHandler: 'telegramPollOrders_',
  pollMinutes: 1,
  maxBatch: 10,
  otpProperty: 'TA_TELEGRAM_OTP_',
  otpDuration: 30000 // 30 seconds
});

// ✅ VERIFIED TELEGRAM CONFIG
// Bot ID: 8273131182
// Group ID: -1003943799973

const TA_ADMIN_SECURITY = Object.freeze({
  identity: Object.freeze({
    name: 'Muhammad Andreatama',
    username: 'Atam',
    email: 'tamaandrea92@gmail.com',
    address: 'Kalianda'
  }),
  maxAttempts: 5,
  lockMinutes: 15,
  version: '2026.09.2'
});

const TA_ADMIN_KEYS = Object.freeze({
  gate1: 'TA_ADMIN_GATE_HASH',
  gate2: 'TA_ADMIN_CODE_HASH',
  password: 'TA_ADMIN_PASSWORD_HASH',
  name: 'TA_ADMIN_NAME',
  email: 'TA_ADMIN_EMAIL',
  address: 'TA_ADMIN_ADDRESS',
  username: 'TA_ADMIN_USERNAME',
  version: 'TA_ADMIN_SECURITY_VERSION',
  attempts: 'TA_ADMIN_FAILED_ATTEMPTS',
  lockedUntil: 'TA_ADMIN_LOCKED_UNTIL',
  initialized: 'TA_ADMIN_PERMANENT_INITIALIZED'
});

const PRODUCTION_POLICY = Object.freeze({
  version: '2026.2',
  maxLogRows: 2000,
  cacheSeconds: 30,
  lockMs: 8000
});

const TA_MAINTENANCE = Object.freeze({
  version: '2026.1',
  maxLogRows: 2000,
  triggerHours: 6
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getSpreadsheet_() {
  const id = PropertiesService.getScriptProperties().getProperty('TA_SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrdersSheet_() {
  return getSpreadsheet_().getSheetByName(SHEETS.ORDERS) || getSpreadsheet_().insertSheet(SHEETS.ORDERS);
}

function getCustomersSheet_() {
  return getSpreadsheet_().getSheetByName(SHEETS.CUSTOMERS) || getSpreadsheet_().insertSheet(SHEETS.CUSTOMERS);
}

function getDevicesSheet_() {
  return getSpreadsheet_().getSheetByName(SHEETS.DEVICES) || getSpreadsheet_().insertSheet(SHEETS.DEVICES);
}

function getAuditSheet_() {
  return getSpreadsheet_().getSheetByName(SHEETS.AUDIT) || getSpreadsheet_().insertSheet(SHEETS.AUDIT);
}

function getErrorsSheet_() {
  return getSpreadsheet_().getSheetByName(SHEETS.ERRORS) || getSpreadsheet_().insertSheet(SHEETS.ERRORS);
}

function formatDateTime_(value) {
  if (!value) return '';
  const d = new Date(value);
  return isNaN(d.getTime()) ? String(value) : d.toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'});
}

function nowIso_() {
  return new Date().toISOString();
}

function hashShort_(value) {
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(value || ''),
    Utilities.Charset.UTF_8
  );
  return digest.map(b => ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2)).join('').substring(0, 16);
}

function makeRequestId_() {
  const ts = Date.now().toString(36);
  const uuid = Utilities.getUuid().split('-')[0];
  return `REQ_${ts}_${uuid}`;
}

function appError_(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

function publicErrorMessage_(err) {
  return String(err.message || 'Unknown error').substring(0, 200);
}

function logError_(requestId, handler, code, err) {
  try {
    const sh = getErrorsSheet_();
    const timestamp = nowIso_();
    const message = String(err.message || '');
    const stack = String(err.stack || '').substring(0, 500);
    sh.appendRow([timestamp, requestId, handler, code, message, stack, timestamp]);
    SpreadsheetApp.flush();
  } catch (_) {}
}

function logAudit_(requestId, userEmail, action, status, details, deviceId, ipAddress, location) {
  try {
    const sh = getAuditSheet_();
    sh.appendRow([nowIso_(), requestId, userEmail || '', action, status, details || '', deviceId || '', ipAddress || '', location || '']);
    SpreadsheetApp.flush();
  } catch (_) {}
}

// ============================================================================
// DEVICE FINGERPRINTING & TRACKING
// ============================================================================

function generateDeviceFingerprint_(macAddress, ipAddress, gpsLocation, userAgent) {
  const data = [macAddress, ipAddress, gpsLocation, userAgent].filter(v => v).join('|');
  return hashShort_(data);
}

/**
 * Lookup ISP/kota/negara dari alamat IP publik via ip-api.com (gratis, tanpa
 * API key, cukup untuk pemakaian volume rendah admin-only). Best-effort:
 * gagal/timeout tidak menggagalkan proses login, hanya field-nya kosong.
 */
function ipGeoLookup_(ipAddress) {
  if (!ipAddress) return null;
  try {
    const url = 'http://ip-api.com/json/' + encodeURIComponent(ipAddress) +
      '?fields=status,message,country,regionName,city,isp,org,as,query';
    const res = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
    if (res.getResponseCode() !== 200) return null;
    const data = JSON.parse(res.getContentText());
    if (data.status !== 'success') return null;
    return {
      country: data.country || '',
      region: data.regionName || '',
      city: data.city || '',
      isp: data.isp || '',
      org: data.org || '',
      asn: data.as || ''
    };
  } catch (e) {
    return null;
  }
}

/**
 * Reverse DNS (PTR) asli dari IP publik, memakai Google Public DNS-over-HTTPS
 * (tidak butuh API key). Ini yang benar-benar disebut "DNS" pada permintaan
 * Anda — beda dari nama ISP (yang berasal dari ipGeoLookup_ di atas).
 */
function reverseDnsLookup_(ipAddress) {
  if (!ipAddress || ipAddress.indexOf('.') === -1) return null; // hanya IPv4 sederhana
  try {
    const reversed = ipAddress.split('.').reverse().join('.') + '.in-addr.arpa';
    const url = 'https://dns.google/resolve?name=' + encodeURIComponent(reversed) + '&type=PTR';
    const res = UrlFetchApp.fetch(url, {muteHttpExceptions: true});
    if (res.getResponseCode() !== 200) return null;
    const data = JSON.parse(res.getContentText());
    if (!data.Answer || !data.Answer.length) return null;
    return String(data.Answer[0].data || '').replace(/\.$/, '');
  } catch (e) {
    return null;
  }
}

function isDeviceExpired_(registeredAt) {
  const days = (Date.now() - new Date(registeredAt).getTime()) / (1000 * 60 * 60 * 24);
  return days > APP.DEVICE_EXPIRY_DAYS;
}

function findDeviceByFingerprint_(fingerprint) {
  const sh = getDevicesSheet_();
  if (sh.getLastRow() < 2) return null;
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === fingerprint && !isDeviceExpired_(data[i][2])) {
      return {
        fingerprint: data[i][0],
        macAddress: data[i][1],
        registeredAt: data[i][2],
        ipAddress: data[i][3],
        location: data[i][4],
        userAgent: data[i][5],
        trustLevel: data[i][6],
        lastUsed: data[i][7],
        isp: data[i][8],
        reverseDns: data[i][9]
      };
    }
  }
  return null;
}

/**
 * Mendaftarkan device BARU (pemanggil, validateDeviceAndGPS_, sudah memastikan
 * fingerprint ini belum ada — jadi di sini cukup satu appendRow, tidak perlu
 * cek ulang "existing" seperti versi sebelumnya yang selalu menambah baris
 * baru di kedua cabang kondisinya).
 */
function registerDevice_(macAddress, ipAddress, gpsLocation, userAgent, ispInfo, reverseDns) {
  const fingerprint = generateDeviceFingerprint_(macAddress, ipAddress, gpsLocation, userAgent);
  const sh = getDevicesSheet_();
  const now = new Date().toISOString();
  const ispLabel = ispInfo ? [ispInfo.isp, ispInfo.city, ispInfo.country].filter(Boolean).join(', ') : '';

  sh.appendRow([fingerprint, macAddress, now, ipAddress, gpsLocation, userAgent, 'trusted', now, ispLabel, reverseDns || '']);

  SpreadsheetApp.flush();
  return fingerprint;
}

function updateDeviceLastUsed_(fingerprint, ispInfo, reverseDns) {
  const sh = getDevicesSheet_();
  const data = sh.getRange(2, 1, sh.getLastRow() - 1, 10).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === fingerprint) {
      const row = i + 2;
      sh.getRange(row, 8).setValue(new Date().toISOString()); // Last Used
      if (ispInfo) {
        const ispLabel = [ispInfo.isp, ispInfo.city, ispInfo.country].filter(Boolean).join(', ');
        sh.getRange(row, 9).setValue(ispLabel);
      }
      if (reverseDns) sh.getRange(row, 10).setValue(reverseDns);
      SpreadsheetApp.flush();
      break;
    }
  }
}

// ============================================================================
// HASHING & SECURITY
// ============================================================================

function taAdminHash_(value) {
  return hashShort_(value);
}

function taAdminMemorableCode_() {
  const words = [
    'Langit','Kalianda','Lampung','Pixel','Server','Jaringan',
    'Studio','Kirana','Nusantara','Teknologi','Komputer','Andromeda'
  ];
  const uuid = Utilities.getUuid().replace(/-/g, '').toUpperCase();
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    uuid + '|' + Date.now(),
    Utilities.Charset.UTF_8
  );
  const entropy = digest.map(b => ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2)).join('').toUpperCase();
  const wordIndex = parseInt(entropy.slice(0, 4), 16) % words.length;
  const number = 10 + (parseInt(entropy.slice(4, 8), 16) % 90);
  const suffix = entropy.slice(8, 12);
  return words[wordIndex] + number + suffix;
}

function taAdminPassword_() {
  return taAdminMemorableCode_() + '-' + taAdminMemorableCode_();
}

function taAdminLocked_() {
  const p = PropertiesService.getScriptProperties();
  const until = Number(p.getProperty(TA_ADMIN_KEYS.lockedUntil) || 0);
  if (!until) return false;
  if (Date.now() >= until) {
    p.setProperty(TA_ADMIN_KEYS.lockedUntil, '');
    p.setProperty(TA_ADMIN_KEYS.attempts, '0');
    return false;
  }
  return true;
}

function taAdminFailure_() {
  const p = PropertiesService.getScriptProperties();
  const attempts = Number(p.getProperty(TA_ADMIN_KEYS.attempts) || 0) + 1;
  p.setProperty(TA_ADMIN_KEYS.attempts, String(attempts));
  if (attempts >= TA_ADMIN_SECURITY.maxAttempts) {
    const until = Date.now() + TA_ADMIN_SECURITY.lockMinutes * 60 * 1000;
    p.setProperty(TA_ADMIN_KEYS.lockedUntil, String(until));
    return true;
  }
  return false;
}

function taAdminClearFailures_() {
  const p = PropertiesService.getScriptProperties();
  p.setProperty(TA_ADMIN_KEYS.attempts, '0');
  p.setProperty(TA_ADMIN_KEYS.lockedUntil, '');
}

// ============================================================================
// TELEGRAM OTP SYSTEM
// ============================================================================

function generateTelegramOTP_() {
  const code = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
  return code;
}

function storeTelegramOTP_(requestId, code) {
  const props = PropertiesService.getScriptProperties();
  const key = TELEGRAM_CONFIG.otpProperty + requestId;
  props.setProperty(key, JSON.stringify({code, timestamp: Date.now()}));
  // CATATAN: setTimeout() TIDAK didukung di Apps Script V8 runtime (server-side)
  // dan akan melempar ReferenceError. Kedaluwarsa OTP sudah ditangani dengan aman
  // secara stateless melalui perbandingan timestamp di verifyTelegramOTP_ (lihat
  // TELEGRAM_CONFIG.otpDuration). Properti basi akan otomatis tertimpa saat
  // request OTP berikutnya, dan dibersihkan berkala oleh cleanupExpiredOtps_().
}

/**
 * Pembersihan OTP kedaluwarsa yang tidak sempat terpakai (mis. user menutup tab).
 * Aman dipanggil dari trigger waktu (mis. maintenancePeriodicCheck) — tidak
 * memakai setTimeout, murni scan + hapus properti yang sudah lewat durasinya.
 */
function cleanupExpiredOtps_() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  const now = Date.now();
  let removed = 0;
  Object.keys(all).forEach(key => {
    if (key.indexOf(TELEGRAM_CONFIG.otpProperty) !== 0) return;
    try {
      const data = JSON.parse(all[key]);
      if (!data || (now - data.timestamp) > TELEGRAM_CONFIG.otpDuration) {
        props.deleteProperty(key);
        removed++;
      }
    } catch (_) {
      props.deleteProperty(key);
      removed++;
    }
  });
  return {removed};
}

function verifyTelegramOTP_(requestId, code) {
  const props = PropertiesService.getScriptProperties();
  const key = TELEGRAM_CONFIG.otpProperty + requestId;
  const stored = props.getProperty(key);
  
  if (!stored) return {ok: false, message: 'OTP expired atau tidak ditemukan.'};
  
  try {
    const data = JSON.parse(stored);
    const elapsed = Date.now() - data.timestamp;
    
    if (elapsed > TELEGRAM_CONFIG.otpDuration) {
      props.deleteProperty(key);
      return {ok: false, message: 'OTP sudah kadaluarsa.'};
    }
    
    if (data.code !== code) {
      return {ok: false, message: 'Kode OTP salah.'};
    }
    
    props.deleteProperty(key);
    return {ok: true};
  } catch (e) {
    return {ok: false, message: 'Error verifikasi OTP.'};
  }
}

function escapeTelegram_(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function telegramSendMessage_(text) {
  const token = String(PropertiesService.getScriptProperties().getProperty(TELEGRAM_CONFIG.tokenProperty) || '').trim();
  if (!token) throw new Error('Telegram bot token belum dikonfigurasi.');
  
  const url = 'https://api.telegram.org/bot' + encodeURIComponent(token) + '/sendMessage';
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      chat_id: TELEGRAM_CONFIG.groupId,
      text: text,
      parse_mode: 'HTML',
      disable_web_page_preview: true
    }),
    muteHttpExceptions: true
  });
  
  const code = response.getResponseCode();
  const body = response.getContentText();
  let data = {};
  try { data = JSON.parse(body); } catch (_) {}
  
  if (code < 200 || code >= 300 || !data.ok) {
    throw new Error('Telegram API gagal (' + code + ').');
  }
  
  return {ok: true, messageId: data.result && data.result.message_id || null};
}

function telegramSendLoginNotification_(email, macAddress, ipAddress, location, deviceInfo) {
  const text = '🟦 <b>LOGIN NOTIFICATION — Tama Andrea Studio</b>\n\n' +
    '<b>Email:</b> ' + escapeTelegram_(email) + '\n' +
    '<b>Device MAC:</b> <code>' + escapeTelegram_(macAddress) + '</code>\n' +
    '<b>IP Address:</b> <code>' + escapeTelegram_(ipAddress) + '</code>\n' +
    '<b>Location:</b> ' + escapeTelegram_(location) + '\n' +
    '<b>Device Info:</b> ' + escapeTelegram_(deviceInfo) + '\n' +
    '<b>Time:</b> ' + new Date().toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}) + '\n\n' +
    '⚠️ Jika bukan Anda, segera ubah password.';
  
  return telegramSendMessage_(text);
}

// ============================================================================
// GATE 1: USERNAME & PASSWORD VERIFICATION
// ============================================================================

function verifyGate1_(username, password) {
  const rid = makeRequestId_();
  
  try {
    // Check lock status
    if (taAdminLocked_()) {
      logAudit_(rid, username, 'GATE1_ATTEMPT', 'LOCKED', 'Account terkunci');
      return {ok: false, locked: true, message: 'Akses sementara dikunci. Coba lagi dalam ' + TA_ADMIN_SECURITY.lockMinutes + ' menit.'};
    }
    
    const props = PropertiesService.getScriptProperties();
    const storedUsername = props.getProperty(TA_ADMIN_KEYS.username);
    const storedPassword = props.getProperty(TA_ADMIN_KEYS.password);
    const storedName = props.getProperty(TA_ADMIN_KEYS.name);
    const storedEmail = props.getProperty(TA_ADMIN_KEYS.email);
    
    if (!storedUsername || !storedPassword) {
      return {ok: false, configured: false, message: 'Gate 1 belum dikonfigurasi.'};
    }
    
    // Verify username
    if (taAdminHash_(username) !== storedUsername) {
      const locked = taAdminFailure_();
      logAudit_(rid, username, 'GATE1_ATTEMPT', 'FAILED_USERNAME', 'Username salah');
      return {ok: false, locked: locked, message: locked ? 'Terlalu banyak percobaan.' : 'Username atau password salah.'};
    }
    
    // Verify password
    if (taAdminHash_(password) !== storedPassword) {
      const locked = taAdminFailure_();
      logAudit_(rid, username, 'GATE1_ATTEMPT', 'FAILED_PASSWORD', 'Password salah');
      return {ok: false, locked: locked, message: locked ? 'Terlalu banyak percobaan.' : 'Username atau password salah.'};
    }
    
    // Success
    taAdminClearFailures_();
    logAudit_(rid, storedEmail, 'GATE1_SUCCESS', 'OK', 'Gate 1 terverifikasi', '', '', '');
    
    return {
      ok: true,
      requestId: rid,
      email: storedEmail,
      name: storedName,
      message: 'Gate 1 terverifikasi. Lanjut ke Gate 2.'
    };
  } catch (err) {
    logError_(rid, 'verifyGate1_', 'GATE1_ERROR', err);
    return {ok: false, message: 'Error: ' + publicErrorMessage_(err)};
  }
}

// ============================================================================
// GATE 2: TELEGRAM OTP VERIFICATION
// ============================================================================

function requestGate2OTP_(gate1RequestId) {
  const rid = makeRequestId_();
  
  try {
    // Validate gate 1 request
    if (!gate1RequestId) {
      return {ok: false, message: 'Gate 1 request ID diperlukan.'};
    }
    
    const code = generateTelegramOTP_();
    storeTelegramOTP_(gate1RequestId, code);
    
    // Send OTP via Telegram
    const text = '🔐 <b>KODE VERIFIKASI — Tama Andrea Studio</b>\n\n' +
      '<b>Kode:</b> <code>' + escapeTelegram_(code) + '</code>\n' +
      '<b>Berlaku:</b> 30 detik\n' +
      '<b>Waktu:</b> ' + new Date().toLocaleString('id-ID', {timeZone: 'Asia/Jakarta'}) + '\n\n' +
      '⚠️ Jangan bagikan kode ini.';
    
    telegramSendMessage_(text);
    
    logAudit_(rid, 'system', 'GATE2_OTP_REQUEST', 'OK', 'OTP dikirim ke Telegram', '', '', '');
    
    return {
      ok: true,
      requestId: rid,
      message: 'Kode OTP dikirim ke grup Telegram admin. Periksa dalam 30 detik.'
    };
  } catch (err) {
    logError_(rid, 'requestGate2OTP_', 'GATE2_OTP_ERROR', err);
    return {ok: false, message: 'Error: ' + publicErrorMessage_(err)};
  }
}

function verifyGate2OTP_(gate1RequestId, otpCode) {
  const rid = makeRequestId_();
  
  try {
    const otpVerify = verifyTelegramOTP_(gate1RequestId, otpCode);
    if (!otpVerify.ok) {
      logAudit_(rid, 'system', 'GATE2_OTP_FAILED', 'FAILED', otpVerify.message, '', '', '');
      return otpVerify;
    }
    
    logAudit_(rid, 'system', 'GATE2_OTP_SUCCESS', 'OK', 'Gate 2 terverifikasi', '', '', '');
    
    return {
      ok: true,
      message: 'Semua verifikasi berhasil. Silakan lanjutkan.',
      sessionId: hashShort_(gate1RequestId + Date.now())
    };
  } catch (err) {
    logError_(rid, 'verifyGate2OTP_', 'GATE2_ERROR', err);
    return {ok: false, message: 'Error: ' + publicErrorMessage_(err)};
  }
}

// ============================================================================
// DEVICE VALIDATION & GPS CHECK
// ============================================================================

function validateDeviceAndGPS_(macAddress, ipAddress, gpsData, userAgent) {
  const rid = makeRequestId_();

  try {
    if (!macAddress || !ipAddress) {
      return {ok: false, message: 'Device ID dan IP Address diperlukan.'};
    }

    if (APP.GPS_REQUIRED && (!gpsData || !gpsData.latitude || !gpsData.longitude)) {
      return {ok: false, message: 'GPS wajib aktif untuk lanjut.'};
    }

    const location = (gpsData && gpsData.latitude && gpsData.longitude) ? `${gpsData.latitude}, ${gpsData.longitude}` : 'N/A';
    // CATATAN: 'navigator' TIDAK ada di server Apps Script (V8 runtime) — versi
    // sebelumnya memakai `typeof navigator !== 'undefined'` yang selalu FALSE
    // di server, jadi User Agent asli tidak pernah tersimpan. Sekarang UA
    // dikirim eksplisit oleh client (lihat index.html: authState.userAgent).
    userAgent = userAgent || '';

    // Perkaya data jaringan: ISP/organisasi + reverse DNS dari IP publik asli.
    const ispInfo = ipGeoLookup_(ipAddress);
    const reverseDns = reverseDnsLookup_(ipAddress);

    const fingerprint = generateDeviceFingerprint_(macAddress, ipAddress, location, userAgent);
    const existing = findDeviceByFingerprint_(fingerprint);

    if (existing) {
      updateDeviceLastUsed_(fingerprint, ispInfo, reverseDns);
      logAudit_(rid, 'system', 'DEVICE_VERIFIED_EXISTING', 'OK', 'Device sudah terdaftar', fingerprint, ipAddress, location);
      return {
        ok: true,
        message: 'Device sudah terdaftar. Akses diberikan tanpa perlu login ulang.',
        fingerprint: fingerprint,
        isTrusted: true,
        isp: ispInfo,
        reverseDns: reverseDns
      };
    }

    // Device baru — daftarkan sekaligus catat IP/ISP/reverse DNS/lokasi/UA lengkap.
    registerDevice_(macAddress, ipAddress, location, userAgent, ispInfo, reverseDns);
    logAudit_(rid, 'system', 'DEVICE_REGISTERED_NEW', 'OK', 'Device baru terdaftar', fingerprint, ipAddress, location);

    return {
      ok: true,
      message: `Device berhasil terdaftar. Berlaku ${APP.DEVICE_EXPIRY_DAYS} hari sebelum harus login ulang.`,
      fingerprint: fingerprint,
      isTrusted: false,
      isp: ispInfo,
      reverseDns: reverseDns
    };
  } catch (err) {
    logError_(rid, 'validateDeviceAndGPS_', 'DEVICE_VALIDATION_ERROR', err);
    return {ok: false, message: 'Error: ' + publicErrorMessage_(err)};
  }
}

// ============================================================================
// SESSION MANAGEMENT — dashboard admin
// ============================================================================
// PENTING: google.script.run bisa memanggil fungsi publik apa pun begitu
// halaman web app dimuat — dual-gate di UI TIDAK otomatis melindungi data di
// backend. Karena itu SEMUA fungsi dashboard (getDashboardData, addOrder,
// dst) mewajibkan sessionToken yang HANYA diterbitkan setelah verifyDeviceAndOTP
// benar-benar sukses (lihat createSession_ di sana), dan divalidasi ulang di
// setiap panggilan lewat validateSession_. Tanpa ini, siapa pun yang tahu URL
// web app bisa langsung baca/ubah data lewat DevTools console.

function createSession_(email, name) {
  const token = Utilities.getUuid();
  const props = PropertiesService.getScriptProperties();
  props.setProperty(SESSION_PROPERTY_PREFIX + token, JSON.stringify({
    email: email || '',
    name: name || '',
    createdAt: Date.now(),
    expiresAt: Date.now() + (APP.SESSION_HOURS * 3600 * 1000)
  }));
  return token;
}

function validateSession_(token) {
  if (!token) return {ok: false, message: 'Sesi tidak ditemukan. Silakan login ulang.'};
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(SESSION_PROPERTY_PREFIX + token);
  if (!raw) return {ok: false, message: 'Sesi tidak ditemukan atau sudah logout. Silakan login ulang.'};

  let session;
  try {
    session = JSON.parse(raw);
  } catch (e) {
    props.deleteProperty(SESSION_PROPERTY_PREFIX + token);
    return {ok: false, message: 'Sesi tidak valid. Silakan login ulang.'};
  }

  if (Date.now() > session.expiresAt) {
    props.deleteProperty(SESSION_PROPERTY_PREFIX + token);
    return {ok: false, message: 'Sesi sudah kedaluwarsa. Silakan login ulang.'};
  }

  return {ok: true, email: session.email, name: session.name};
}

function destroySession_(token) {
  if (!token) return;
  PropertiesService.getScriptProperties().deleteProperty(SESSION_PROPERTY_PREFIX + token);
}

/** Dipanggil dari cleanupExpiredOtps_'s sibling di maintenancePeriodicCheck. */
function cleanupExpiredSessions_() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  const now = Date.now();
  let removed = 0;
  Object.keys(all).forEach(key => {
    if (key.indexOf(SESSION_PROPERTY_PREFIX) !== 0) return;
    try {
      const s = JSON.parse(all[key]);
      if (!s || now > s.expiresAt) {
        props.deleteProperty(key);
        removed++;
      }
    } catch (_) {
      props.deleteProperty(key);
      removed++;
    }
  });
  return {removed};
}

// ============================================================================
// DASHBOARD ADMIN — data + CRUD Orders/Customers/Devices, Audit Log read-only
// ============================================================================

function readSheetAsObjects_(sheetName, headers) {
  const sh = getSpreadsheet_().getSheetByName(sheetName);
  if (!sh || sh.getLastRow() < 2) return [];
  const values = sh.getRange(2, 1, sh.getLastRow() - 1, headers.length).getValues();
  return values.map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function findRowByColumnValue_(sh, colIndexZeroBased, value) {
  if (sh.getLastRow() < 2) return -1;
  const col = sh.getRange(2, colIndexZeroBased + 1, sh.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < col.length; i++) {
    if (String(col[i][0]) === String(value)) return i + 2; // nomor baris 1-based
  }
  return -1;
}

/**
 * Satu panggilan gabungan untuk mengisi seluruh dashboard (Orders, Customers,
 * Devices, Audit Log 200 terbaru) + opsi dropdown Status/Payment/Priority —
 * sengaja digabung jadi satu round-trip, bukan 4 panggilan terpisah.
 */
function getDashboardData(sessionToken) {
  const auth = validateSession_(sessionToken);
  if (!auth.ok) return auth;

  const auditRows = readSheetAsObjects_(SHEETS.AUDIT, AUDIT_HEADERS);

  return {
    ok: true,
    account: {email: auth.email, name: auth.name},
    deviceExpiryDays: APP.DEVICE_EXPIRY_DAYS,
    options: {status: APP.STATUS, payment: APP.PAYMENT, priority: APP.PRIORITY},
    orders: readSheetAsObjects_(SHEETS.ORDERS, ORDER_HEADERS),
    customers: readSheetAsObjects_(SHEETS.CUSTOMERS, CUSTOMER_HEADERS),
    devices: readSheetAsObjects_(SHEETS.DEVICES, DEVICE_HEADERS),
    auditLog: auditRows.slice(-200).reverse() // 200 terbaru, terbaru di atas
  };
}

// ---------- ORDERS ----------

function addOrder(sessionToken, orderData) {
  const auth = validateSession_(sessionToken);
  if (!auth.ok) return auth;
  const rid = makeRequestId_();

  try {
    if (!orderData || !String(orderData['Customer Name'] || '').trim()) {
      return {ok: false, message: 'Nama customer wajib diisi.'};
    }
    const sh = getOrdersSheet_();
    const now = new Date().toISOString();
    const orderId = 'ORD-' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyMMdd') +
      '-' + Utilities.getUuid().slice(0, 6).toUpperCase();

    const row = ORDER_HEADERS.map(h => {
      if (h === 'Order ID') return orderId;
      if (h === 'Created At' || h === 'Updated At') return now;
      return orderData[h] !== undefined ? orderData[h] : '';
    });
    sh.appendRow(row);
    SpreadsheetApp.flush();

    upsertCustomerFromOrder_(orderData, now);
    try {
      syncOperationalOrderRecords_(orderId, row, null, null);
    } catch (opsErr) {
      logError_(rid, 'addOrder.operational', 'OPERATIONAL_RECORD_CREATE_FAILED', opsErr);
    }
    logAudit_(rid, auth.email, 'ORDER_CREATED', 'OK', 'Order baru: ' + orderId, '', '', '');
    return {ok: true, orderId: orderId};
  } catch (err) {
    logError_(rid, 'addOrder', 'ORDER_CREATE_ERROR', err);
    return {ok: false, message: 'Error: ' + publicErrorMessage_(err)};
  }
}

function updateOrder(sessionToken, orderId, orderData) {
  const auth = validateSession_(sessionToken);
  if (!auth.ok) return auth;
  const rid = makeRequestId_();

  try {
    const sh = getOrdersSheet_();
    const rowNum = findRowByColumnValue_(sh, 0, orderId);
    if (rowNum === -1) return {ok: false, message: 'Order ' + orderId + ' tidak ditemukan.'};

    const now = new Date().toISOString();
    const createdAtCol = ORDER_HEADERS.indexOf('Created At') + 1;
    const existingCreatedAt = sh.getRange(rowNum, createdAtCol).getValue();

    const row = ORDER_HEADERS.map(h => {
      if (h === 'Order ID') return orderId;
      if (h === 'Created At') return existingCreatedAt;
      if (h === 'Updated At') return now;
      return orderData[h] !== undefined ? orderData[h] : '';
    });
    const previousRow = sh.getRange(rowNum, 1, 1, ORDER_HEADERS.length).getValues()[0];
    sh.getRange(rowNum, 1, 1, ORDER_HEADERS.length).setValues([row]);
    SpreadsheetApp.flush();

    upsertCustomerFromOrder_(orderData, now);
    try {
      syncOperationalOrderRecords_(orderId, row, previousRow, previousRow[ORDER_HEADERS.indexOf('Payment')]);
    } catch (opsErr) {
      logError_(rid, 'updateOrder.operational', 'OPERATIONAL_RECORD_SYNC_FAILED', opsErr);
    }
    logAudit_(rid, auth.email, 'ORDER_UPDATED', 'OK', 'Order diperbarui: ' + orderId, '', '', '');
    return {ok: true};
  } catch (err) {
    logError_(rid, 'updateOrder', 'ORDER_UPDATE_ERROR', err);
    return {ok: false, message: 'Error: ' + publicErrorMessage_(err)};
  }
}

function deleteOrder(sessionToken, orderId) {
  const auth = validateSession_(sessionToken);
  if (!auth.ok) return auth;
  const rid = makeRequestId_();

  try {
    const sh = getOrdersSheet_();
    const rowNum = findRowByColumnValue_(sh, 0, orderId);
    if (rowNum === -1) return {ok: false, message: 'Order ' + orderId + ' tidak ditemukan.'};

    sh.deleteRow(rowNum);
    SpreadsheetApp.flush();
    logAudit_(rid, auth.email, 'ORDER_DELETED', 'OK', 'Order dihapus: ' + orderId, '', '', '');
    return {ok: true};
  } catch (err) {
    logError_(rid, 'deleteOrder', 'ORDER_DELETE_ERROR', err);
    return {ok: false, message: 'Error: ' + publicErrorMessage_(err)};
  }
}

// ---------- CUSTOMERS ----------

function addCustomer(sessionToken, customerData) {
  const auth = validateSession_(sessionToken);
  if (!auth.ok) return auth;
  const rid = makeRequestId_();

  try {
    if (!customerData || !String(customerData['Name'] || '').trim()) {
      return {ok: false, message: 'Nama customer wajib diisi.'};
    }
    const sh = getCustomersSheet_();
    const now = new Date().toISOString();
    const customerId = 'CUS-' + Utilities.getUuid().slice(0, 8).toUpperCase();

    const row = CUSTOMER_HEADERS.map(h => {
      if (h === 'Customer ID') return customerId;
      if (h === 'First Contact' || h === 'Last Contact') return now;
      if (h === 'Order Count') return 0;
      return customerData[h] !== undefined ? customerData[h] : '';
    });
    sh.appendRow(row);
    SpreadsheetApp.flush();
    logAudit_(rid, auth.email, 'CUSTOMER_CREATED', 'OK', 'Customer baru: ' + customerId, '', '', '');
    return {ok: true, customerId: customerId};
  } catch (err) {
    logError_(rid, 'addCustomer', 'CUSTOMER_CREATE_ERROR', err);
    return {ok: false, message: 'Error: ' + publicErrorMessage_(err)};
  }
}

function updateCustomer(sessionToken, customerId, customerData) {
  const auth = validateSession_(sessionToken);
  if (!auth.ok) return auth;
  const rid = makeRequestId_();

  try {
    const sh = getCustomersSheet_();
    const rowNum = findRowByColumnValue_(sh, 0, customerId);
    if (rowNum === -1) return {ok: false, message: 'Customer tidak ditemukan.'};

    const now = new Date().toISOString();
    const firstContactCol = CUSTOMER_HEADERS.indexOf('First Contact') + 1;
    const orderCountCol = CUSTOMER_HEADERS.indexOf('Order Count') + 1;
    const lastOrderDateCol = CUSTOMER_HEADERS.indexOf('Last Order Date') + 1;
    const existingFirstContact = sh.getRange(rowNum, firstContactCol).getValue();
    const existingOrderCount = sh.getRange(rowNum, orderCountCol).getValue();
    const existingLastOrderDate = sh.getRange(rowNum, lastOrderDateCol).getValue();

    const row = CUSTOMER_HEADERS.map(h => {
      if (h === 'Customer ID') return customerId;
      if (h === 'First Contact') return existingFirstContact;
      if (h === 'Last Contact') return now;
      if (h === 'Order Count') return existingOrderCount;
      if (h === 'Last Order Date') return existingLastOrderDate;
      return customerData[h] !== undefined ? customerData[h] : '';
    });
    sh.getRange(rowNum, 1, 1, CUSTOMER_HEADERS.length).setValues([row]);
    SpreadsheetApp.flush();
    logAudit_(rid, auth.email, 'CUSTOMER_UPDATED', 'OK', 'Customer diperbarui: ' + customerId, '', '', '');
    return {ok: true};
  } catch (err) {
    logError_(rid, 'updateCustomer', 'CUSTOMER_UPDATE_ERROR', err);
    return {ok: false, message: 'Error: ' + publicErrorMessage_(err)};
  }
}

function deleteCustomer(sessionToken, customerId) {
  const auth = validateSession_(sessionToken);
  if (!auth.ok) return auth;
  const rid = makeRequestId_();

  try {
    const sh = getCustomersSheet_();
    const rowNum = findRowByColumnValue_(sh, 0, customerId);
    if (rowNum === -1) return {ok: false, message: 'Customer tidak ditemukan.'};

    sh.deleteRow(rowNum);
    SpreadsheetApp.flush();
    logAudit_(rid, auth.email, 'CUSTOMER_DELETED', 'OK', 'Customer dihapus: ' + customerId + ' (order historis tidak ikut terhapus)', '', '', '');
    return {ok: true};
  } catch (err) {
    logError_(rid, 'deleteCustomer', 'CUSTOMER_DELETE_ERROR', err);
    return {ok: false, message: 'Error: ' + publicErrorMessage_(err)};
  }
}

/**
 * Dipanggil otomatis setiap addOrder/updateOrder: cari customer via Email
 * (fallback WhatsApp), lalu buat baru atau perbarui Order Count/Last Contact/
 * Last Order Date-nya. Best-effort — kegagalan di sini tidak menggagalkan
 * penyimpanan order itu sendiri.
 */
function upsertCustomerFromOrder_(orderData, now) {
  try {
    const email = String((orderData && orderData['Email']) || '').trim();
    const whatsapp = String((orderData && orderData['WhatsApp']) || '').trim();
    const name = String((orderData && orderData['Customer Name']) || '').trim();
    if (!email && !whatsapp) return;

    const sh = getCustomersSheet_();
    const emailCol = CUSTOMER_HEADERS.indexOf('Email');
    const waCol = CUSTOMER_HEADERS.indexOf('WhatsApp');
    const rowNum = email
      ? findRowByColumnValue_(sh, emailCol, email)
      : findRowByColumnValue_(sh, waCol, whatsapp);

    if (rowNum === -1) {
      const customerId = 'CUS-' + Utilities.getUuid().slice(0, 8).toUpperCase();
      const row = CUSTOMER_HEADERS.map(h => {
        if (h === 'Customer ID') return customerId;
        if (h === 'First Contact' || h === 'Last Contact') return now;
        if (h === 'Name') return name;
        if (h === 'Email') return email;
        if (h === 'WhatsApp') return whatsapp;
        if (h === 'Order Count') return 1;
        if (h === 'Last Order Date') return now;
        return '';
      });      sh.appendRow(row);
    } else {
      const orderCountCol = CUSTOMER_HEADERS.indexOf('Order Count') + 1;
      const currentCount = Number(sh.getRange(rowNum, orderCountCol).getValue()) || 0;
      sh.getRange(rowNum, CUSTOMER_HEADERS.indexOf('Last Contact') + 1).setValue(now);
      sh.getRange(rowNum, orderCountCol).setValue(currentCount + 1);
      sh.getRange(rowNum, CUSTOMER_HEADERS.indexOf('Last Order Date') + 1).setValue(now);
    }
    SpreadsheetApp.flush();
  } catch (_) {
    // Best-effort — tidak melempar error ke pemanggil (addOrder/updateOrder).
  }
}

// ---------- DEVICES ----------

function revokeDevice(sessionToken, fingerprint) {
  const auth = validateSession_(sessionToken);
  if (!auth.ok) return auth;
  const rid = makeRequestId_();

  try {
    const sh = getDevicesSheet_();
    const rowNum = findRowByColumnValue_(sh, 0, fingerprint);
    if (rowNum === -1) return {ok: false, message: 'Perangkat tidak ditemukan.'};

    sh.deleteRow(rowNum);
    SpreadsheetApp.flush();
    logAudit_(rid, auth.email, 'DEVICE_REVOKED', 'OK', 'Device dicabut manual dari dashboard', fingerprint, '', '');
    return {ok: true};
  } catch (err) {
    logError_(rid, 'revokeDevice', 'DEVICE_REVOKE_ERROR', err);
    return {ok: false, message: 'Error: ' + publicErrorMessage_(err)};
  }
}

function logoutSession(sessionToken) {
  destroySession_(sessionToken);
  return {ok: true};
}

// ============================================================================
// PUBLIC API — dipanggil langsung dari index.html via google.script.run
// (semua fungsi di bawah TANPA underscore suffix sehingga terekspos ke client;
// masing-masing hanya tipis membungkus logic internal yang sudah diaudit di atas)
// ============================================================================

/** Gate 1 — verifikasi username & password. Dipanggil dari submitGate1(). */
function verifyGate1(username, password) {
  return verifyGate1_(username, password);
}

/** Gate 2 — minta OTP dikirim ke grup Telegram admin. */
function requestGate2OTP(gate1RequestId) {
  return requestGate2OTP_(gate1RequestId);
}

/**
 * Gate 2 + Gate 3 gabungan: verifikasi kode OTP Telegram DAN validasi
 * device/GPS dalam satu panggilan atomik, lalu kirim notifikasi login.
 * Ini fungsi yang dipanggil frontend via:
 *   google.script.run.withSuccessHandler(...).withFailureHandler(...)
 *     .verifyDeviceAndOTP(gate1RequestId, otpCode, macAddress, ipAddress, gpsData, email, deviceInfo)
 *
 * gpsData diterima sebagai OBJECT biasa (bukan string JSON) karena
 * google.script.run melakukan serialisasi otomatis — beda dengan pola
 * fetch()+FormData yang dipakai sebelumnya.
 */
function verifyDeviceAndOTP(gate1RequestId, otpCode, macAddress, ipAddress, gpsData, email, deviceInfo, userAgent) {
  const rid = makeRequestId_();

  try {
    if (!gate1RequestId || !otpCode) {
      return {ok: false, message: 'Request ID dan kode OTP diperlukan.'};
    }

    // 1) Verifikasi OTP Gate 2 lebih dulu — kalau gagal, jangan lanjut ke device.
    const otpResult = verifyTelegramOTP_(gate1RequestId, otpCode);
    if (!otpResult.ok) {
      logAudit_(rid, email || 'system', 'GATE2_OTP_FAILED', 'FAILED', otpResult.message, '', ipAddress || '', '');
      return otpResult;
    }
    logAudit_(rid, email || 'system', 'GATE2_OTP_SUCCESS', 'OK', 'Gate 2 terverifikasi', '', ipAddress || '', '');

    // 2) Validasi & registrasi device + GPS + ISP + reverse DNS + User Agent asli.
    const deviceResult = validateDeviceAndGPS_(macAddress, ipAddress, gpsData || {}, userAgent);
    if (!deviceResult.ok) {
      return deviceResult;
    }

    // 3) Kirim notifikasi login ke Telegram (best-effort, tidak menggagalkan login jika Telegram error).
    try {
      const locationText = (gpsData && gpsData.latitude && gpsData.longitude)
        ? `${gpsData.latitude}, ${gpsData.longitude}`
        : 'N/A';
      const networkInfo = [
        deviceResult.isp && deviceResult.isp.isp ? 'ISP: ' + deviceResult.isp.isp : '',
        deviceResult.isp && deviceResult.isp.city ? 'Kota: ' + deviceResult.isp.city + ', ' + deviceResult.isp.country : '',
        deviceResult.reverseDns ? 'Reverse DNS: ' + deviceResult.reverseDns : ''
      ].filter(Boolean).join(' | ');
      const fullDeviceInfo = [deviceInfo || '', networkInfo].filter(Boolean).join(' — ');
      telegramSendLoginNotification_(email || '', macAddress, ipAddress, locationText, fullDeviceInfo);
    } catch (notifErr) {
      logError_(rid, 'verifyDeviceAndOTP.notify', 'LOGIN_NOTIF_FAILED', notifErr);
    }

    logAudit_(rid, email || 'system', 'DEVICE_AND_OTP_SUCCESS', 'OK', 'Login lengkap berhasil', deviceResult.fingerprint, ipAddress || '', '');

    // Terbitkan session token dashboard. Identitas diambil ulang dari Script
    // Properties (bukan dipercaya mentah-mentah dari parameter client) untuk
    // menghindari client memalsukan email/nama sesi miliknya sendiri.
    const props = PropertiesService.getScriptProperties();
    const canonicalEmail = props.getProperty(TA_ADMIN_KEYS.email) || email || '';
    const canonicalName = props.getProperty(TA_ADMIN_KEYS.name) || '';
    const sessionToken = createSession_(canonicalEmail, canonicalName);

    return {
      ok: true,
      message: 'Verifikasi OTP & perangkat berhasil. Login diterima.',
      fingerprint: deviceResult.fingerprint,
      isTrusted: deviceResult.isTrusted,
      sessionToken: sessionToken,
      account: {email: canonicalEmail, name: canonicalName}
    };
  } catch (err) {
    logError_(rid, 'verifyDeviceAndOTP', 'DEVICE_OTP_ERROR', err);
    return {ok: false, message: 'Error: ' + publicErrorMessage_(err)};
  }
}

// ============================================================================
// PUBLIC API ENDPOINTS (HTTP fallback — opsional, untuk testing manual/Postman)
// ============================================================================

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || '').trim();
  try {
    if (action === 'track') return JsonResponse_(publicTrackOrder_(e.parameter.id));
    if (action === 'stats') return JsonResponse_(publicStats_());
    if (action === 'serviceConfig') return JsonResponse_(publicServiceConfig_());

    // Serve file index.html yang sesungguhnya (bukan lagi template string ganda),
    // sehingga hanya ada SATU sumber kebenaran untuk tampilan frontend.
    return HtmlService.createHtmlOutputFromFile('index')
      .setTitle('Tama Andrea Studio — Dual-Gate Authentication')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (err) {
    logError_(makeRequestId_(), 'doGet', 'PUBLIC_GET_ERROR', err);
    return JsonResponse_({status: 'error', message: publicErrorMessage_(err)});
  }
}

// Catatan arsitektur: frontend (index.html) TIDAK lagi memakai fetch()/doPost
// untuk alur login — semua memakai google.script.run (lihat blok PUBLIC API di
// atas). doPost tetap disediakan sebagai fallback HTTP untuk keperluan testing
// manual (curl/Postman) atau integrasi eksternal di luar halaman index.html.
function doPost(e) {
  let body = {};
  try {
    body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
  } catch (_) {
    body = {};
  }
  const action = String(body.action || (e && e.parameter && e.parameter.action) || '');

  try {
    switch (action) {
      case 'newOrder':
        return JsonResponse_(newOrderPublic_(body.data || body, body.clientRequestId || body.data?.clientRequestId || ''));
      case 'verifyOrder':
        return JsonResponse_(publicVerifyOrder_(body.id, body.name, body.email));
      case 'stats':
        return JsonResponse_(publicStats_());
      case 'serviceConfig':
        return JsonResponse_(publicServiceConfig_());
      case 'verifyGate1':
        return JsonResponse_(verifyGate1_(e.parameter.username, e.parameter.password));

      case 'requestGate2OTP':
        return JsonResponse_(requestGate2OTP_(e.parameter.gate1RequestId));

      case 'verifyDeviceAndOTP':
        return JsonResponse_(verifyDeviceAndOTP(
          e.parameter.gate1RequestId,
          e.parameter.otpCode,
          e.parameter.macAddress,
          e.parameter.ipAddress,
          JSON.parse(e.parameter.gpsData || '{}'),
          e.parameter.email,
          e.parameter.deviceInfo,
          e.parameter.userAgent
        ));

      case 'getAdminStatus':
        return JsonResponse_(adminSecurityStatus());

      case 'getProductionStatus':
        return JsonResponse_(productionReadiness());

      case 'getMaintenanceStatus':
        return JsonResponse_(maintenanceSnapshot());

      default:
        return JsonResponse_({ok: false, message: 'Action tidak diketahui.'});
    }
  } catch (err) {
    logError_(makeRequestId_(), 'doPost', 'API_ERROR', err);
    return JsonResponse_({ok: false, message: publicErrorMessage_(err)}, 500);
  }
}

function JsonResponse_(data, statusCode) {
  statusCode = statusCode || 200;
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setResponseCode(statusCode);
}

// ============================================================================
// ADMIN SECURITY SETUP
// ============================================================================

function setupAdminSecurityPermanent() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty(TA_ADMIN_KEYS.initialized) === 'true') {
      return {
        status: 'already_initialized',
        message: 'Credential permanen sudah ada.'
      };
    }

    const creds = {
      username: TA_ADMIN_SECURITY.identity.username,
      name: TA_ADMIN_SECURITY.identity.name,
      email: TA_ADMIN_SECURITY.identity.email,
      address: TA_ADMIN_SECURITY.identity.address,
      password: '#Atama230809RIku' // Default password from config
    };

    props.setProperties({
      [TA_ADMIN_KEYS.username]: taAdminHash_(creds.username),
      [TA_ADMIN_KEYS.password]: taAdminHash_(creds.password),
      [TA_ADMIN_KEYS.name]: creds.name,
      [TA_ADMIN_KEYS.email]: creds.email,
      [TA_ADMIN_KEYS.address]: creds.address,
      [TA_ADMIN_KEYS.version]: TA_ADMIN_SECURITY.version,
      [TA_ADMIN_KEYS.attempts]: '0',
      [TA_ADMIN_KEYS.lockedUntil]: '',
      [TA_ADMIN_KEYS.initialized]: 'true',
      'TA_ORDER_SEQ': '1000'
    }, false);

    // Create base sheets
    const ss = getSpreadsheet_();
    taEnsureSheet_(ss, SHEETS.ORDERS, ORDER_HEADERS);
    taEnsureSheet_(ss, SHEETS.CUSTOMERS, CUSTOMER_HEADERS);
    taEnsureSheet_(ss, SHEETS.AUDIT, AUDIT_HEADERS);
    taEnsureSheet_(ss, SHEETS.ERRORS, ERROR_HEADERS);
    taEnsureSheet_(ss, SHEETS.REQUESTS, REQUEST_HEADERS);
    taEnsureSheet_(ss, SHEETS.SETTINGS, SETTINGS_HEADERS);
    taEnsureSheet_(ss, SHEETS.DEVICES, DEVICE_HEADERS);
    taEnsureSheet_(ss, SHEETS.SERVICE_NOTES, ['Note ID','Kategori','Judul','Ringkasan','Langkah Kerja','Peringatan / Batasan','Updated At']);
    taEnsureSheet_(ss, SHEETS.BOOT_KEYS, ['Brand','Jenis Perangkat','Model / Motherboard','BIOS / UEFI','Boot Menu','Catatan','Updated At']);

    SpreadsheetApp.flush();
    
    return {
      status: 'success',
      version: TA_ADMIN_SECURITY.version,
      message: 'Admin security initialized. Credential tersimpan di Script Properties.'
    };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function adminSecurityStatus() {
  const p = PropertiesService.getScriptProperties();
  return {
    initialized: p.getProperty(TA_ADMIN_KEYS.initialized) === 'true',
    usernameConfigured: !!p.getProperty(TA_ADMIN_KEYS.username),
    passwordConfigured: !!p.getProperty(TA_ADMIN_KEYS.password),
    identityConfigured: !!p.getProperty(TA_ADMIN_KEYS.name) && !!p.getProperty(TA_ADMIN_KEYS.email),
    version: p.getProperty(TA_ADMIN_KEYS.version) || null,
    lockedUntil: p.getProperty(TA_ADMIN_KEYS.lockedUntil) || ''
  };
}

function resetAdminLockout() {
  taAdminClearFailures_();
  return {status: 'success', message: 'Lockout direset.'};
}

// ============================================================================
// SHEET MAINTENANCE & CLEANUP
// ============================================================================

function taEnsureSheet_(ss, name, headers) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const current = sh.getRange(1, 1, 1, Math.max(headers.length, sh.getLastColumn() || 1)).getDisplayValues()[0];
    headers.forEach((h, i) => {
      if (String(current[i] || '').trim() !== h) sh.getRange(1, i + 1).setValue(h);
    });
  }
  return sh;
}

function taFormatHeader_(sh, columnCount) {
  sh.setFrozenRows(1);
  sh.setHiddenGridlines(true);
  sh.getRange(1, 1, 1, columnCount)
    .setFontWeight('bold')
    .setVerticalAlignment('middle')
    .setWrap(true)
    .setBackground('#1f2937')
    .setFontColor('#ffffff');
  sh.setRowHeight(1, 34);
}

function taCapColumnWidth_(sh, column, minWidth, maxWidth) {
  const current = sh.getColumnWidth(column);
  sh.setColumnWidth(column, Math.max(minWidth, Math.min(maxWidth, current)));
}

function taApplyFilter_(sh, columnCount) {
  if (sh.getFilter()) return;
  const lastRow = Math.max(2, sh.getLastRow());
  sh.getRange(1, 1, lastRow, columnCount).createFilter();
}

function backendSheetMaintenance() {
  const started = Date.now();
  const ss = getSpreadsheet_();
  const result = {status: 'ok', version: '2026.09.2', spreadsheet: ss.getName(), sheets: [], elapsedMs: 0};

  const definitions = [
    [SHEETS.ORDERS, ORDER_HEADERS],
    [SHEETS.CUSTOMERS, CUSTOMER_HEADERS],
    [SHEETS.AUDIT, AUDIT_HEADERS],
    [SHEETS.ERRORS, ERROR_HEADERS],
    [SHEETS.REQUESTS, REQUEST_HEADERS],
    [SHEETS.SETTINGS, SETTINGS_HEADERS],
    [SHEETS.DEVICES, DEVICE_HEADERS],
    [SHEETS.SERVICE_NOTES, ['Note ID','Kategori','Judul','Ringkasan','Langkah Kerja','Peringatan / Batasan','Updated At']],
    [SHEETS.BOOT_KEYS, ['Brand','Jenis Perangkat','Model / Motherboard','BIOS / UEFI','Boot Menu','Catatan','Updated At']],
    [SHEETS.SERVICE_QUEUE, SERVICE_QUEUE_HEADERS],
    [SHEETS.SERVICE_VISITS, SERVICE_VISITS_HEADERS],
    [SHEETS.TRANSACTIONS, TRANSACTION_HEADERS],
    [SHEETS.RECEIPTS, RECEIPT_HEADERS],
    [SHEETS.NOTIFICATIONS, NOTIFICATION_HEADERS]
  ];

  definitions.forEach(d => {
    const sh = taEnsureSheet_(ss, d[0], d[1]);
    const n = d[1].length;
    taFormatHeader_(sh, n);
    taApplyFilter_(sh, n);
    result.sheets.push({name: d[0], rows: sh.getLastRow(), columns: n});
  });

  SpreadsheetApp.flush();
  result.elapsedMs = Date.now() - started;
  return result;
}

function cleanupOperationalLogs(retainRows) {
  const ss = getSpreadsheet_();
  const keep = Math.max(200, Math.min(Number(retainRows) || PRODUCTION_POLICY.maxLogRows, 10000));
  let removed = 0;
  
  [SHEETS.AUDIT, SHEETS.ERRORS].forEach(name => {
    const sh = ss.getSheetByName(name);
    if (!sh) return;
    const rows = sh.getLastRow();
    if (rows > keep + 1) {
      const n = rows - keep - 1;
      sh.deleteRows(2, n);
      removed += n;
    }
  });
  
  SpreadsheetApp.flush();
  return {status: 'success', removedRows: removed, retainedRows: keep};
}

// ============================================================================
// PRODUCTION MONITORING
// ============================================================================

function productionReadiness() {
  const started = Date.now();
  const result = {status: 'ok', version: PRODUCTION_POLICY.version, checkedAt: nowIso_(), latencyMs: 0, checks: {}};
  
  try {
    const ss = getSpreadsheet_();
    result.checks.spreadsheet = !!ss;
    result.checks.requiredSheets = Object.keys(SHEETS).every(k => !!ss.getSheetByName(SHEETS[k]));
    
    const props = PropertiesService.getScriptProperties();
    result.checks.adminConfigured = !!props.getProperty(TA_ADMIN_KEYS.username) && !!props.getProperty(TA_ADMIN_KEYS.password);
    result.checks.auditLog = !!ss.getSheetByName(SHEETS.AUDIT);
    result.checks.errorLog = !!ss.getSheetByName(SHEETS.ERRORS);
    result.checks.deviceTracking = !!ss.getSheetByName(SHEETS.DEVICES);
    
    result.status = Object.keys(result.checks).every(k => result.checks[k]) ? 'ready' : 'attention';
  } catch (err) {
    result.status = 'error';
    logError_(makeRequestId_(), 'productionReadiness', 'PRODUCTION_CHECK_FAILED', err);
  }
  
  result.latencyMs = Date.now() - started;
  return result;
}

// ============================================================================
// MAINTENANCE MONITORING
// ============================================================================

function maintenanceSnapshot() {
  const rid = makeRequestId_();
  const out = {status: 'ok', requestId: rid, version: TA_MAINTENANCE.version, time: nowIso_(), sheets: {}, config: {}, warnings: []};
  
  try {
    const ss = getSpreadsheet_();
    out.spreadsheet = ss.getName();
    
    Object.keys(SHEETS).forEach(k => {
      const name = SHEETS[k];
      const s = ss.getSheetByName(name);
      out.sheets[name] = {exists: !!s, rows: s ? s.getLastRow() : 0, columns: s ? s.getLastColumn() : 0};
      if (!s) out.warnings.push('Missing sheet: ' + name);
    });
    
    const p = PropertiesService.getScriptProperties();
    out.config.adminConfigured = !!p.getProperty(TA_ADMIN_KEYS.username);
    out.config.timezone = Session.getScriptTimeZone();
    out.config.backendVersion = APP.VERSION;
    out.status = out.warnings.length ? 'warning' : 'ok';
    
    return out;
  } catch (err) {
    out.status = 'error';
    out.error = publicErrorMessage_(err);
    logError_(rid, 'maintenanceSnapshot', 'MAINTENANCE_FAILED', err);
    return out;
  }
}

function maintenancePeriodicCheck() {
  const report = maintenanceSnapshot();
  if (report.status === 'error') {
    logError_(report.requestId, 'maintenancePeriodicCheck', 'MAINTENANCE_HEALTH_ERROR', new Error('Health check returned error.'));
  }
  try {
    report.otpCleanup = cleanupExpiredOtps_();
    report.sessionCleanup = cleanupExpiredSessions_();
  } catch (_) {}
  return report;
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Initialize on first run
function initializeBackend() {
  const maintenance = backendSheetMaintenance();
  const security = setupAdminSecurityPermanent();
  const triggers = installMaintenanceTriggers();
  return {maintenance, security, triggers};
}

/**
 * Memasang time-driven trigger agar sheet otomatis dirapikan/dibersihkan
 * secara berkala TANPA perlu dipanggil manual. Pencatatan data (audit log,
 * device baru, dsb) sendiri SUDAH real-time — setiap logAudit_()/
 * registerDevice_() langsung appendRow + SpreadsheetApp.flush() saat request
 * masuk. Yang butuh trigger cuma bagian "beres-beres" (hapus log lama,
 * bersihkan OTP basi), karena itu memang tugas periodik, bukan per-request.
 * Jalankan fungsi ini SEKALI secara manual dari editor Apps Script (perlu
 * otorisasi pemilik project) — dipanggil otomatis oleh initializeBackend().
 */
function installMaintenanceTriggers() {
  ['maintenancePeriodicCheck', 'cleanupOperationalLogsScheduled_'].forEach(handler => {
    ScriptApp.getProjectTriggers()
      .filter(t => t.getHandlerFunction() === handler)
      .forEach(t => ScriptApp.deleteTrigger(t));
  });

  ScriptApp.newTrigger('maintenancePeriodicCheck')
    .timeBased()
    .everyHours(TA_MAINTENANCE.triggerHours)
    .create();

  ScriptApp.newTrigger('cleanupOperationalLogsScheduled_')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();

  return {
    status: 'success',
    message: `Trigger terpasang: health-check + cleanup OTP tiap ${TA_MAINTENANCE.triggerHours} jam, pembersihan Audit_Log/Error_Log tiap hari pukul 03:00.`
  };
}

function cleanupOperationalLogsScheduled_() {
  return cleanupOperationalLogs(PRODUCTION_POLICY.maxLogRows);
}

/* ============================================================================
 * TA PUBLIC ORDER + OPERATIONS LAYER 2026
 * Additive integration layer: public order, queue, receipt, transaction,
 * appointment/visit, location share, customer linkage, and notifications.
 * Existing authentication/dashboard functions remain unchanged.
 * ========================================================================== */

function publicServiceConfig_() {
  return {
    status: 'success',
    config: {
      version: TA_PUBLIC_SERVICE_CONFIG.VERSION,
      studioName: TA_PUBLIC_SERVICE_CONFIG.STUDIO_NAME,
      locationLabel: TA_PUBLIC_SERVICE_CONFIG.LOCATION_LABEL,
      mapUrl: TA_PUBLIC_SERVICE_CONFIG.MAP_URL,
      visitFeeMin: TA_PUBLIC_SERVICE_CONFIG.VISIT_FEE_MIN,
      methods: TA_PUBLIC_SERVICE_CONFIG.METHODS,
      benefits: TA_PUBLIC_SERVICE_CONFIG.BENEFITS,
      basicSoftwareNote: TA_PUBLIC_SERVICE_CONFIG.BASIC_SOFTWARE_NOTE,
      accessibilityOptions: TA_PUBLIC_SERVICE_CONFIG.ACCESSIBILITY_OPTIONS,
      prices: TA_PUBLIC_SERVICE_CONFIG.PRICES
    }
  };
}

function ensureOperationalSheets_() {
  const ss = getSpreadsheet_();
  taEnsureSheet_(ss, SHEETS.SERVICE_QUEUE, SERVICE_QUEUE_HEADERS);
  taEnsureSheet_(ss, SHEETS.SERVICE_VISITS, SERVICE_VISITS_HEADERS);
  taEnsureSheet_(ss, SHEETS.TRANSACTIONS, TRANSACTION_HEADERS);
  taEnsureSheet_(ss, SHEETS.RECEIPTS, RECEIPT_HEADERS);
  taEnsureSheet_(ss, SHEETS.NOTIFICATIONS, NOTIFICATION_HEADERS);
  return ss;
}

function normalizePublicName_(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function normalizePublicEmail_(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePublicPhone_(value) {
  return String(value || '').replace(/[^\d+]/g, '').trim();
}

function publicOrderField_(data, key) {
  return data && data[key] !== undefined ? String(data[key] || '').trim() : '';
}

function serviceTextHas_(text, fragment) {
  return String(text || '').toLowerCase().indexOf(String(fragment || '').toLowerCase()) !== -1;
}

function calculatePublicEstimate_(data) {
  const service = publicOrderField_(data, 'Layanan Dipilih');
  const os = publicOrderField_(data, 'Pilihan OS');
  const prices = TA_PUBLIC_SERVICE_CONFIG.PRICES;

  if (serviceTextHas_(service, 'Paket OS + Office + Backup')) return prices.OS_OFFICE_BACKUP;
  if (serviceTextHas_(service, 'Paket OS + Office')) return prices.OS_OFFICE;
  if (serviceTextHas_(service, 'Paket OS + Backup')) return prices.OS_BACKUP;

  if (serviceTextHas_(service, 'Paket OS Basic')) {
    if (serviceTextHas_(os, 'Windows 10 Enterprise LTSC 2021')) return prices.WINDOWS_10_LTSC_2021;
    if (serviceTextHas_(os, 'Windows 11 Enterprise LTSC 2024')) return prices.WINDOWS_11_LTSC_2024;
    if (serviceTextHas_(os, 'Windows 10')) return prices.WINDOWS_10_BASIC;
    if (serviceTextHas_(os, 'Windows 11')) return prices.WINDOWS_11_BASIC;
    if (serviceTextHas_(os, 'Ubuntu') || serviceTextHas_(os, 'Debian') || serviceTextHas_(os, 'Kali')) return prices.LINUX;
  }

  const choices = [
    ['Microsoft Office 2024 Home', prices.OFFICE_2024_HOME],
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
  choices.forEach(([label, price]) => {
    if (serviceTextHas_(service, label)) total += Number(price || 0);
  });

  return total || '';
}

function nextPublicOrderId_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const props = PropertiesService.getScriptProperties();
    const day = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyMMdd');
    const key = 'TA_PUBLIC_ORDER_SEQ_' + day;
    const next = Number(props.getProperty(key) || 0) + 1;
    props.setProperty(key, String(next));
    return 'ORD-' + day + String(next).padStart(2, '0');
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function nextQueueNumber_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    const props = PropertiesService.getScriptProperties();
    const day = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'Asia/Jakarta', 'yyMMdd');
    const key = 'TA_QUEUE_SEQ_' + day;
    const next = Number(props.getProperty(key) || 0) + 1;
    props.setProperty(key, String(next));
    return {day: day, number: next, label: day + '-' + String(next).padStart(3, '0'), id: 'Q-' + day + '-' + String(next).padStart(3, '0')};
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function findExistingPublicOrderByRequest_(clientRequestId) {
  const sh = getOrdersSheet_();
  if (!clientRequestId || sh.getLastRow() < 2) return null;
  const col = ORDER_HEADERS.indexOf('Client Request ID');
  const rowNum = findRowByColumnValue_(sh, col, clientRequestId);
  if (rowNum === -1) return null;
  return sh.getRange(rowNum, 1, 1, ORDER_HEADERS.length).getValues()[0];
}

function customerIdForPublicOrder_(email, whatsapp) {
  const sh = getCustomersSheet_();
  if (sh.getLastRow() < 2) return 'CUS-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  const emailCol = CUSTOMER_HEADERS.indexOf('Email');
  const waCol = CUSTOMER_HEADERS.indexOf('WhatsApp');
  let rowNum = email ? findRowByColumnValue_(sh, emailCol, email) : -1;
  if (rowNum === -1 && whatsapp) rowNum = findRowByColumnValue_(sh, waCol, whatsapp);
  if (rowNum !== -1) return String(sh.getRange(rowNum, 1).getValue() || '');
  return 'CUS-' + Utilities.getUuid().slice(0, 8).toUpperCase();
}

function appendCustomerIfMissingPublic_(data, now) {
  const email = normalizePublicEmail_(publicOrderField_(data, 'Email'));
  const whatsapp = normalizePublicPhone_(publicOrderField_(data, 'WhatsApp'));
  const name = normalizePublicName_(publicOrderField_(data, 'Nama'));
  const sh = getCustomersSheet_();
  const emailCol = CUSTOMER_HEADERS.indexOf('Email');
  const waCol = CUSTOMER_HEADERS.indexOf('WhatsApp');
  let rowNum = email ? findRowByColumnValue_(sh, emailCol, email) : -1;
  if (rowNum === -1 && whatsapp) rowNum = findRowByColumnValue_(sh, waCol, whatsapp);

  if (rowNum === -1) {
    const customerId = 'CUS-' + Utilities.getUuid().slice(0, 8).toUpperCase();
    const row = CUSTOMER_HEADERS.map(h => {
      if (h === 'Customer ID') return customerId;
      if (h === 'First Contact' || h === 'Last Contact') return now;
      if (h === 'Name') return name;
      if (h === 'Email') return email;
      if (h === 'WhatsApp') return whatsapp;
      if (h === 'Order Count') return 1;
      if (h === 'Last Order Date') return now;
      if (h === 'Location') return publicOrderField_(data, 'Lokasi Layanan');
      return '';
    });
    sh.appendRow(row);
    return customerId;
  }

  const orderCountCol = CUSTOMER_HEADERS.indexOf('Order Count') + 1;
  const lastContactCol = CUSTOMER_HEADERS.indexOf('Last Contact') + 1;
  const lastOrderCol = CUSTOMER_HEADERS.indexOf('Last Order Date') + 1;
  const current = Number(sh.getRange(rowNum, orderCountCol).getValue()) || 0;
  sh.getRange(rowNum, lastContactCol).setValue(now);
  sh.getRange(rowNum, orderCountCol).setValue(current + 1);
  sh.getRange(rowNum, lastOrderCol).setValue(now);
  return String(sh.getRange(rowNum, 1).getValue() || '');
}

function publicOrderToRow_(orderId, data, estimate, now, clientRequestId) {
  const method = publicOrderField_(data, 'Metode Layanan');
  const appointmentDate = publicOrderField_(data, 'Jadwal Tanggal');
  const appointmentTime = publicOrderField_(data, 'Jadwal Waktu');
  return ORDER_HEADERS.map(h => {
    switch (h) {
      case 'Order ID': return orderId;
      case 'Created At':
      case 'Updated At': return now;
      case 'Customer Name': return normalizePublicName_(publicOrderField_(data, 'Nama'));
      case 'Email': return normalizePublicEmail_(publicOrderField_(data, 'Email'));
      case 'WhatsApp': return normalizePublicPhone_(publicOrderField_(data, 'WhatsApp'));
      case 'Category': return publicOrderField_(data, 'Jenis Desain');
      case 'Service': return publicOrderField_(data, 'Layanan Dipilih');
      case 'OS': return publicOrderField_(data, 'Pilihan OS');
      case 'Method': return method;
      case 'Brief': return publicOrderField_(data, 'Keterangan Proyek');
      case 'Deadline': return appointmentDate;
      case 'Status': return 'Pending';
      case 'Estimate': return estimate;
      case 'Payment': return 'Unpaid';
      case 'Priority': return 'Normal';
      case 'Source': return 'Website';
      case 'Client Request ID': return clientRequestId;
      case 'Tags': return publicOrderField_(data, 'Kebutuhan Aksesibilitas');
      case 'Notes': return publicOrderField_(data, 'Lokasi Layanan');
      case 'Internal Notes': return '';
      case 'Appointment Date': return appointmentDate;
      case 'Appointment Time': return appointmentTime;
      case 'Service Location': return publicOrderField_(data, 'Lokasi Layanan');
      case 'Location Link': return publicOrderField_(data, 'Link Lokasi');
      case 'Location Latitude': return publicOrderField_(data, 'Latitude');
      case 'Location Longitude': return publicOrderField_(data, 'Longitude');
      case 'Accessibility Preference': return publicOrderField_(data, 'Kebutuhan Aksesibilitas');
      default: return '';
    }
  });
}

function createOperationalRecords_(orderId, row, customerId) {
  ensureOperationalSheets_();
  const ss = getSpreadsheet_();
  const q = ss.getSheetByName(SHEETS.SERVICE_QUEUE);
  const v = ss.getSheetByName(SHEETS.SERVICE_VISITS);
  const tx = ss.getSheetByName(SHEETS.TRANSACTIONS);
  const rc = ss.getSheetByName(SHEETS.RECEIPTS);
  const orderService = String(row[ORDER_HEADERS.indexOf('Service')] || '');
  const method = String(row[ORDER_HEADERS.indexOf('Method')] || '');
  const appointmentDate = String(row[ORDER_HEADERS.indexOf('Appointment Date')] || '');
  const appointmentTime = String(row[ORDER_HEADERS.indexOf('Appointment Time')] || '');
  const location = String(row[ORDER_HEADERS.indexOf('Service Location')] || '');
  const locationLink = String(row[ORDER_HEADERS.indexOf('Location Link')] || '');
  const lat = String(row[ORDER_HEADERS.indexOf('Location Latitude')] || '');
  const lng = String(row[ORDER_HEADERS.indexOf('Location Longitude')] || '');
  const status = String(row[ORDER_HEADERS.indexOf('Status')] || 'Pending');
  const amount = Number(row[ORDER_HEADERS.indexOf('Estimate')]) || 0;
  const now = new Date();

  const qn = nextQueueNumber_();
  const queueId = qn.id;
  q.appendRow([queueId, qn.day, qn.label, orderId, customerId, orderService, method, appointmentDate, appointmentTime, status, locationLink, now, now]);

  const visitId = 'VIS-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  const visitFee = serviceTextHas_(method, 'Teknisi datang') ? TA_PUBLIC_SERVICE_CONFIG.VISIT_FEE_MIN : 0;
  v.appendRow([visitId, orderId, customerId, method, appointmentDate, appointmentTime, location, locationLink, lat, lng, visitFee, serviceTextHas_(method, 'Teknisi datang') ? 'Scheduled' : 'Studio', 'Jadwal dibuat dari website.', now, now]);

  const txId = 'TRX-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  tx.appendRow([txId, orderId, customerId, now, 'ORDER_ESTIMATE', amount, 'Unpaid', '', '', 'Estimasi awal pesanan website.']);

  const receiptId = 'NOTA-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  const appointment = [appointmentDate, appointmentTime].filter(Boolean).join(' · ');
  rc.appendRow([receiptId, orderId, customerId, now, orderService, amount, 'Unpaid', method, queueId, appointment, locationLink || TA_PUBLIC_SERVICE_CONFIG.MAP_URL, 'Nota layanan diterbitkan otomatis oleh website.']);

  return {queueId: queueId, queueNumber: qn.label, visitId: visitId, receiptId: receiptId};
}

function syncOperationalOrderRecords_(orderId, row, previousRow, previousPayment) {
  ensureOperationalSheets_();
  const ss = getSpreadsheet_();
  const q = ss.getSheetByName(SHEETS.SERVICE_QUEUE);
  const v = ss.getSheetByName(SHEETS.SERVICE_VISITS);
  const tx = ss.getSheetByName(SHEETS.TRANSACTIONS);
  const rc = ss.getSheetByName(SHEETS.RECEIPTS);

  const existingQueueRow = findRowByColumnValue_(q, 3, orderId); // orderId is col 4 in queue
  if (existingQueueRow === -1) {
    const customerId = customerIdForPublicOrder_(String(row[4] || ''), String(row[5] || ''));
    return createOperationalRecords_(orderId, row, customerId);
  }

  const now = new Date();
  const status = String(row[ORDER_HEADERS.indexOf('Status')] || 'Pending');
  q.getRange(existingQueueRow, 7).setValue(String(row[ORDER_HEADERS.indexOf('Method')] || ''));
  q.getRange(existingQueueRow, 8).setValue(String(row[ORDER_HEADERS.indexOf('Appointment Date')] || ''));
  q.getRange(existingQueueRow, 9).setValue(String(row[ORDER_HEADERS.indexOf('Appointment Time')] || ''));
  q.getRange(existingQueueRow, 10).setValue(status);
  q.getRange(existingQueueRow, 11).setValue(String(row[ORDER_HEADERS.indexOf('Location Link')] || ''));
  q.getRange(existingQueueRow, 13).setValue(now);

  const oldPayment = String(previousRow && previousRow.length ? previousRow[ORDER_HEADERS.indexOf('Payment')] || previousPayment || '' : previousPayment || '');
  const newPayment = String(row[ORDER_HEADERS.indexOf('Payment')] || '');
  if (oldPayment && oldPayment !== newPayment) {
    const customerId = customerIdForPublicOrder_(String(row[4] || ''), String(row[5] || ''));
    tx.appendRow(['TRX-' + Utilities.getUuid().slice(0, 8).toUpperCase(), orderId, customerId, now, 'PAYMENT_STATUS', Number(row[ORDER_HEADERS.indexOf('Estimate')]) || 0, newPayment, '', '', 'Status pembayaran berubah dari ' + oldPayment + ' menjadi ' + newPayment + '.']);
    enqueueOrderNotification_(orderId, 'PAYMENT_STATUS', 'Status pembayaran berubah menjadi ' + newPayment + '.');
  }

  const oldStatus = String(previousRow && previousRow.length ? previousRow[ORDER_HEADERS.indexOf('Status')] || '' : '');
  if (oldStatus && oldStatus !== status) {
    enqueueOrderNotification_(orderId, 'STATUS_CHANGE', 'Status pesanan berubah menjadi ' + status + '.');
  }
}

function enqueueOrderNotification_(orderId, event, message) {
  ensureOperationalSheets_();
  const sh = getSpreadsheet_().getSheetByName(SHEETS.NOTIFICATIONS);
  const id = 'NTF-' + Utilities.getUuid().slice(0, 8).toUpperCase();
  const now = new Date();
  sh.appendRow([id, orderId || '', now, event, 'Telegram', 'Pending', message, '']);
  try {
    if (typeof telegramSendMessage_ === 'function') {
      telegramSendMessage_(
        '🟦 <b>Tama Andrea Studio</b>\n' +
        '<b>Event:</b> ' + escapeTelegram_(event) + '\n' +
        '<b>Order:</b> ' + escapeTelegram_(orderId || '-') + '\n' +
        escapeTelegram_(message)
      );
      const row = sh.getLastRow();
      sh.getRange(row, 6).setValue('Sent');
      sh.getRange(row, 8).setValue(new Date());
    }
  } catch (err) {
    logError_(makeRequestId_(), 'enqueueOrderNotification_', 'ORDER_NOTIFICATION_FAILED', err);
  }
}

function newOrderPublic_(data, clientRequestId) {
  const rid = makeRequestId_();
  try {
    const d = data || {};
    const name = normalizePublicName_(publicOrderField_(d, 'Nama'));
    const email = normalizePublicEmail_(publicOrderField_(d, 'Email'));
    const whatsapp = normalizePublicPhone_(publicOrderField_(d, 'WhatsApp'));
    const service = publicOrderField_(d, 'Layanan Dipilih');
    const method = publicOrderField_(d, 'Metode Layanan');

    if (!name || !email || !whatsapp || !service || !method) {
      return {status: 'error', code: 'VALIDATION_ERROR', message: 'Nama, email, WhatsApp, layanan, dan metode layanan wajib diisi.'};
    }
    if (serviceTextHas_(service, 'Retain User’s Data iPhone')) {
      return {status: 'error', code: 'SERVICE_UNAVAILABLE', message: 'Layanan Retain User’s Data iPhone masih Coming Soon.'};
    }
    if (clientRequestId) {
      const duplicate = findExistingPublicOrderByRequest_(clientRequestId);
      if (duplicate) return publicOrderResponseFromRow_(duplicate, true);
    }

    const now = new Date().toISOString();
    const estimate = calculatePublicEstimate_(d);
    const orderId = nextPublicOrderId_();
    const row = publicOrderToRow_(orderId, d, estimate, now, clientRequestId);

    const sh = getOrdersSheet_();
    sh.appendRow(row);
    SpreadsheetApp.flush();

    const customerId = appendCustomerIfMissingPublic_(d, now);
    const ops = createOperationalRecords_(orderId, row, customerId);

    const notificationMessage = 'Pesanan baru ' + orderId + ' · Antrean ' + ops.queueNumber + ' · Nota ' + ops.receiptId + ' · ' + service;
    enqueueOrderNotification_(orderId, 'NEW_ORDER', notificationMessage);

    logAudit_(rid, email, 'PUBLIC_ORDER_CREATED', 'OK', notificationMessage, '', '', publicOrderField_(d, 'Link Lokasi'));
    return {
      status: 'success',
      orderId: orderId,
      queueId: ops.queueId,
      queueNumber: ops.queueNumber,
      receiptId: ops.receiptId,
      visitId: ops.visitId,
      estimate: estimate,
      payment: 'Unpaid',
      method: method
    };
  } catch (err) {
    logError_(rid, 'newOrderPublic_', 'PUBLIC_ORDER_CREATE_ERROR', err);
    return {status: 'error', code: 'ORDER_CREATE_ERROR', message: 'Pesanan tidak dapat disimpan saat ini.'};
  }
}

function publicOrderResponseFromRow_(row, duplicate) {
  const orderId = String(row[ORDER_HEADERS.indexOf('Order ID')] || '');
  const snap = publicOperationalSnapshot_(orderId);
  return {
    status: 'success',
    orderId: orderId,
    duplicate: !!duplicate,
    queueId: snap.queueId,
    queueNumber: snap.queueNumber,
    receiptId: snap.receiptId,
    estimate: row[ORDER_HEADERS.indexOf('Estimate')] || '',
    payment: row[ORDER_HEADERS.indexOf('Payment')] || 'Unpaid'
  };
}

function publicOperationalSnapshot_(orderId) {
  const ss = ensureOperationalSheets_();
  const q = ss.getSheetByName(SHEETS.SERVICE_QUEUE);
  const r = ss.getSheetByName(SHEETS.RECEIPTS);
  const v = ss.getSheetByName(SHEETS.SERVICE_VISITS);
  let queueNumber = '', queueId = '', receiptId = '', method = '', appointmentDate = '', appointmentTime = '', locationLink = '';
  const qr = findRowByColumnValue_(q, 3, orderId);
  if (qr !== -1) {
    queueId = String(q.getRange(qr, 1).getValue() || '');
    queueNumber = String(q.getRange(qr, 3).getValue() || '');
    method = String(q.getRange(qr, 7).getValue() || '');
    appointmentDate = String(q.getRange(qr, 8).getValue() || '');
    appointmentTime = String(q.getRange(qr, 9).getValue() || '');
    locationLink = String(q.getRange(qr, 11).getValue() || '');
  }
  const rr = findRowByColumnValue_(r, 1, orderId);
  if (rr !== -1) receiptId = String(r.getRange(rr, 1).getValue() || '');
  return {queueId, queueNumber, receiptId, method, appointmentDate, appointmentTime, locationLink};
}

function publicTrackOrder_(id) {
  const normalized = normalizePublicOrderId_(id);
  if (!normalized) return {status: 'error', code: 'INVALID_ORDER_ID', message: 'Nomor order tidak valid.'};
  const sh = getOrdersSheet_();
  const rowNum = findRowByColumnValue_(sh, 0, normalized);
  if (rowNum === -1) return {status: 'success', order: null};

  const row = sh.getRange(rowNum, 1, 1, ORDER_HEADERS.length).getValues()[0];
  const op = publicOperationalSnapshot_(normalized);
  return {
    status: 'success',
    order: {
      id: normalized,
      nama: String(row[3] || ''),
      layanan: String(row[7] || ''),
      status: String(row[12] || 'Pending'),
      queueNumber: op.queueNumber || '—'
    }
  };
}

function publicVerifyOrder_(id, name, email) {
  const normalized = normalizePublicOrderId_(id);
  if (!normalized) return {status: 'error', code: 'INVALID_ORDER_ID', message: 'Nomor order tidak valid.'};
  const sh = getOrdersSheet_();
  const rowNum = findRowByColumnValue_(sh, 0, normalized);
  if (rowNum === -1) return {status: 'error', code: 'NOT_FOUND', message: 'Pesanan tidak ditemukan.'};

  const row = sh.getRange(rowNum, 1, 1, ORDER_HEADERS.length).getValues()[0];
  const expectedName = normalizePublicName_(row[3]);
  const expectedEmail = normalizePublicEmail_(row[4]);
  if (expectedName !== normalizePublicName_(name) || expectedEmail !== normalizePublicEmail_(email)) {
    return {status: 'error', code: 'VERIFY_FAILED', message: 'Nama atau email tidak cocok dengan pesanan.'};
  }

  const op = publicOperationalSnapshot_(normalized);
  return {
    status: 'success',
    order: {
      id: normalized,
      nama: expectedName,
      email: expectedEmail,
      layanan: String(row[7] || '—'),
      status: String(row[12] || 'Pending'),
      queueNumber: op.queueNumber || '—',
      receiptId: op.receiptId || '—',
      estimasi: row[13] || '',
      payment: String(row[14] || 'Unpaid'),
      tanggal: formatDateTime_(row[1]),
      method: op.method || String(row[9] || ''),
      appointmentDate: op.appointmentDate || String(row[22] || ''),
      appointmentTime: op.appointmentTime || String(row[23] || ''),
      locationLink: op.locationLink || String(row[25] || '')
    }
  };
}

function normalizePublicOrderId_(value) {
  const raw = String(value || '').trim().toUpperCase();
  if (!/^ORD-[A-Z0-9-]{4,24}$/.test(raw)) return '';
  return raw;
}

function publicStats_() {
  const sh = getOrdersSheet_();
  if (sh.getLastRow() < 2) return {status: 'success', data: {totalPesanan: 0, selesai: 0}};
  const rows = sh.getRange(2, 1, sh.getLastRow() - 1, ORDER_HEADERS.length).getValues();
  let selesai = 0;
  rows.forEach(r => { if (String(r[12] || '') === 'Completed') selesai++; });
  return {status: 'success', data: {totalPesanan: rows.length, selesai: selesai}};
}
