/**
 * Tama Andrea Studio — Admin Security
 *
 * Credential hashes are stored in Script Properties.
 * A private ADMIN_CREDENTIALS sheet is created once as a recovery copy.
 * setupAdminSecurityPermanent() is one-time by default and will not regenerate
 * credentials after initialization.
 *
 * IMPORTANT: standards.gs owns the public adminGate/adminCode/adminVerify
 * endpoints. They use the hashes written here.
 */

const TA_ADMIN_SECURITY = Object.freeze({
  identity: Object.freeze({
    name: 'muhammad andreatama',
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
  version: 'TA_ADMIN_SECURITY_VERSION',
  attempts: 'TA_ADMIN_FAILED_ATTEMPTS',
  lockedUntil: 'TA_ADMIN_LOCKED_UNTIL',
  initialized: 'TA_ADMIN_PERMANENT_INITIALIZED'
});

function taAdminNormalize_(value) {
  return String(value == null ? '' : value)
    .normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function taAdminNormalizeEmail_(value) {
  return taAdminNormalize_(value).replace(/\s+/g, '');
}

function taAdminEntropy_() {
  const uuid = Utilities.getUuid().replace(/-/g, '').toUpperCase();
  const digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    uuid + '|' + Date.now(),
    Utilities.Charset.UTF_8
  );
  return digest.map(function(b) {
    const n = b < 0 ? b + 256 : b;
    return ('0' + n.toString(16)).slice(-2);
  }).join('').toUpperCase();
}

function taAdminHash_(value) {
  if (typeof hashShort_ === 'function') return hashShort_(value);
  throw new Error('hashShort_ belum tersedia. Pastikan standards.gs ikut disalin ke Apps Script.');
}

function taAdminMemorableCode_() {
  const words = [
    'Langit','Kalianda','Lampung','Pixel','Server','Jaringan',
    'Studio','Kirana','Nusantara','Teknologi','Komputer','Andromeda'
  ];
  const entropy = taAdminEntropy_();
  const wordIndex = parseInt(entropy.slice(0, 4), 16) % words.length;
  const number = 10 + (parseInt(entropy.slice(4, 8), 16) % 90);
  const suffix = entropy.slice(8, 12);
  return words[wordIndex] + number + suffix;
}

function taAdminPassword_() {
  return taAdminMemorableCode_() + '-' + taAdminMemorableCode_();
}

function taAdminCredentialSheet_() {
  const ss = getSpreadsheet_();
  let sh = ss.getSheetByName('ADMIN_CREDENTIALS');
  if (!sh) sh = ss.insertSheet('ADMIN_CREDENTIALS');
  return sh;
}

function taAdminWriteRecoverySheet_(creds) {
  const sh = taAdminCredentialSheet_();
  sh.clear();
  sh.getRange(1, 1, 1, 2).setValues([['Tama Andrea Studio — Admin Credentials', 'PRIVATE / SENSITIVE']]);
  sh.getRange(3, 1, 7, 2).setValues([
    ['Gerbang 1', creds.gate1],
    ['Gerbang 2', creds.gate2],
    ['Password', creds.password],
    ['Nama Admin', creds.name],
    ['Email Admin', creds.email],
    ['Konteks', creds.address],
    ['Security Version', TA_ADMIN_SECURITY.version]
  ]);
  sh.getRange(11, 1, 2, 2).setValues([
    ['Dibuat', new Date()],
    ['Catatan', 'Jangan bagikan sheet ini. Credential utama tetap disimpan sebagai hash di Script Properties.']
  ]);
  sh.setFrozenRows(1);
  sh.setHiddenGridlines(true);
  sh.getRange(1, 1, 1, 2).setFontWeight('bold').setBackground('#1f2937').setFontColor('#ffffff');
  sh.getRange(3, 1, 7, 1).setFontWeight('bold');
  sh.getRange(1, 1, 12, 2).setWrap(true);
  sh.setColumnWidth(1, 180);
  sh.setColumnWidth(2, 520);
}

/**
 * One-time credential initializer. Existing initialized credentials are never regenerated.
 * Run this once from Apps Script; the recovery values are written to ADMIN_CREDENTIALS.
 */
function setupAdminSecurityPermanent() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const props = PropertiesService.getScriptProperties();
    if (props.getProperty(TA_ADMIN_KEYS.initialized) === 'true') {
      return {
        status: 'already_initialized',
        version: props.getProperty(TA_ADMIN_KEYS.version) || TA_ADMIN_SECURITY.version,
        recoverySheet: 'ADMIN_CREDENTIALS',
        message: 'Credential permanen sudah ada. Tidak dibuat ulang.'
      };
    }

    const creds = {
      gate1: taAdminMemorableCode_(),
      gate2: taAdminMemorableCode_(),
      password: taAdminPassword_(),
      name: TA_ADMIN_SECURITY.identity.name,
      email: TA_ADMIN_SECURITY.identity.email,
      address: TA_ADMIN_SECURITY.identity.address
    };

    props.setProperties({
      [TA_ADMIN_KEYS.gate1]: taAdminHash_(creds.gate1),
      [TA_ADMIN_KEYS.gate2]: taAdminHash_(creds.gate2),
      [TA_ADMIN_KEYS.password]: taAdminHash_(creds.password),
      [TA_ADMIN_KEYS.name]: creds.name,
      [TA_ADMIN_KEYS.email]: creds.email,
      [TA_ADMIN_KEYS.address]: creds.address,
      [TA_ADMIN_KEYS.version]: TA_ADMIN_SECURITY.version,
      [TA_ADMIN_KEYS.attempts]: '0',
      [TA_ADMIN_KEYS.lockedUntil]: '',
      [TA_ADMIN_KEYS.initialized]: 'true'
    }, false);

    taAdminWriteRecoverySheet_(creds);
    SpreadsheetApp.flush();
    Logger.log('Admin security initialized. Recovery credentials are stored in ADMIN_CREDENTIALS.');
    return {
      status: 'success',
      version: TA_ADMIN_SECURITY.version,
      recoverySheet: 'ADMIN_CREDENTIALS',
      message: 'Credential permanen dibuat. Gunakan nilai di ADMIN_CREDENTIALS untuk login.'
    };
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function adminSecurityStatus() {
  const p = PropertiesService.getScriptProperties();
  return {
    initialized: p.getProperty(TA_ADMIN_KEYS.initialized) === 'true',
    gate1Configured: !!p.getProperty(TA_ADMIN_KEYS.gate1),
    gate2Configured: !!p.getProperty(TA_ADMIN_KEYS.gate2),
    passwordConfigured: !!p.getProperty(TA_ADMIN_KEYS.password),
    identityConfigured: !!p.getProperty(TA_ADMIN_KEYS.name) && !!p.getProperty(TA_ADMIN_KEYS.email),
    version: p.getProperty(TA_ADMIN_KEYS.version) || null,
    lockedUntil: p.getProperty(TA_ADMIN_KEYS.lockedUntil) || ''
  };
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

function verifyAdminGate1_(value) {
  if (taAdminLocked_()) return { ok: false, locked: true, message: 'Akses sementara dikunci.' };
  const stored = PropertiesService.getScriptProperties().getProperty(TA_ADMIN_KEYS.gate1);
  if (!stored) return { ok: false, configured: false, message: 'Gerbang 1 belum dikonfigurasi.' };
  if (taAdminHash_(value) !== stored) {
    const locked = taAdminFailure_();
    return { ok: false, locked: locked, message: locked ? 'Terlalu banyak percobaan.' : 'Kode Gerbang 1 salah.' };
  }
  return { ok: true };
}

function verifyAdminGate2_(value) {
  if (taAdminLocked_()) return { ok: false, locked: true, message: 'Akses sementara dikunci.' };
  const stored = PropertiesService.getScriptProperties().getProperty(TA_ADMIN_KEYS.gate2);
  if (!stored) return { ok: false, configured: false, message: 'Gerbang 2 belum dikonfigurasi.' };
  if (taAdminHash_(value) !== stored) {
    const locked = taAdminFailure_();
    return { ok: false, locked: locked, message: locked ? 'Terlalu banyak percobaan.' : 'Kode Gerbang 2 salah.' };
  }
  return { ok: true };
}

function resetAdminLockout() {
  taAdminClearFailures_();
  return { status: 'success' };
}

/** Explicitly destructive reset. Requires the exact confirmation string. */
function resetPermanentAdminSecurity(confirmation) {
  if (String(confirmation || '') !== 'RESET-TA-ADMIN-2026') {
    throw appError_('FORBIDDEN', 'Konfirmasi reset tidak valid.');
  }
  const p = PropertiesService.getScriptProperties();
  p.deleteProperty(TA_ADMIN_KEYS.initialized);
  return setupAdminSecurityPermanent();
}
