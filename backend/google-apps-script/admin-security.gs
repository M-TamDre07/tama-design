/**
 * Tama Andrea Studio — Admin Security
 *
 * Secret values are NEVER stored in this source file.
 * Run configureAdminSecurity() once from Apps Script to generate
 * Gate 1, Gate 2 and the admin password. The plaintext values are
 * shown only in the Apps Script execution log; Script Properties
 * stores only hashes.
 */

const TA_ADMIN_SECURITY = Object.freeze({
  identity: Object.freeze({
    name: 'muhammad andreatama',
    email: 'tamaandrea92@gmail.com',
    address: 'Kalianda'
  }),
  typo: Object.freeze({
    name: 0.88,
    emailLocal: 0.90,
    address: 0.85
  }),
  maxAttempts: 5,
  lockMinutes: 15,
  sessionMinutes: 60
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
  lockedUntil: 'TA_ADMIN_LOCKED_UNTIL'
});

function taAdminNormalize_(value) {
  return String(value == null ? '' : value)
    .normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function taAdminNormalizeEmail_(value) {
  return taAdminNormalize_(value).replace(/\s+/g, '');
}

function taAdminHash_(value, namespace) {
  const input = 'TA-AS-2026|' + namespace + '|' + String(value == null ? '' : value);
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  return bytes.map(function(b) {
    const n = b < 0 ? b + 256 : b;
    return ('0' + n.toString(16)).slice(-2);
  }).join('');
}

function taAdminUuid_() {
  return Utilities.getUuid().replace(/-/g, '');
}

function taAdminMemorableCode_() {
  const words = ['Langit','Kalianda','Lampung','Pixel','Server','Jaringan','Studio','Kirana','Nusantara','Teknologi','Komputer','Andromeda'];
  const word = words[Math.floor(Math.random() * words.length)];
  const number = String(Math.floor(10 + Math.random() * 90));
  const suffix = taAdminUuid_().slice(0, 3).toUpperCase();
  return word + number + suffix;
}

function taAdminPassword_() {
  return taAdminMemorableCode_() + '-' + taAdminMemorableCode_();
}

/** Generate a fresh 3-layer admin credential set. */
function configureAdminSecurity() {
  const gate1 = taAdminMemorableCode_();
  const gate2 = taAdminMemorableCode_();
  const password = taAdminPassword_();
  const props = PropertiesService.getScriptProperties();

  props.setProperties({
    [TA_ADMIN_KEYS.gate1]: taAdminHash_(gate1, 'gate1'),
    [TA_ADMIN_KEYS.gate2]: taAdminHash_(gate2, 'gate2'),
    [TA_ADMIN_KEYS.password]: taAdminHash_(password, 'password'),
    [TA_ADMIN_KEYS.name]: TA_ADMIN_SECURITY.identity.name,
    [TA_ADMIN_KEYS.email]: TA_ADMIN_SECURITY.identity.email,
    [TA_ADMIN_KEYS.address]: TA_ADMIN_SECURITY.identity.address,
    [TA_ADMIN_KEYS.version]: '2026.09.1',
    [TA_ADMIN_KEYS.attempts]: '0',
    [TA_ADMIN_KEYS.lockedUntil]: ''
  }, false);

  Logger.log('=== TAMA ANDREA STUDIO — ADMIN CREDENTIAL ===');
  Logger.log('GERBANG 1: %s', gate1);
  Logger.log('GERBANG 2: %s', gate2);
  Logger.log('PASSWORD GERBANG 3: %s', password);
  Logger.log('NAMA: %s', TA_ADMIN_SECURITY.identity.name);
  Logger.log('EMAIL: %s', TA_ADMIN_SECURITY.identity.email);
  Logger.log('KONTEKS: %s', TA_ADMIN_SECURITY.identity.address);
  Logger.log('Credential plaintext hanya ditampilkan di Execution Log. Jangan commit ke GitHub.');

  return { status: 'success', message: 'Credential dibuat. Cek Execution Log.' };
}

function adminSecurityStatus() {
  const p = PropertiesService.getScriptProperties();
  return {
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
  if (taAdminHash_(value, 'gate1') !== stored) {
    const locked = taAdminFailure_();
    return { ok: false, locked: locked, message: locked ? 'Terlalu banyak percobaan.' : 'Kode Gerbang 1 salah.' };
  }
  return { ok: true };
}

function verifyAdminGate2_(value) {
  if (taAdminLocked_()) return { ok: false, locked: true, message: 'Akses sementara dikunci.' };
  const stored = PropertiesService.getScriptProperties().getProperty(TA_ADMIN_KEYS.gate2);
  if (!stored) return { ok: false, configured: false, message: 'Gerbang 2 belum dikonfigurasi.' };
  if (taAdminHash_(value, 'gate2') !== stored) {
    const locked = taAdminFailure_();
    return { ok: false, locked: locked, message: locked ? 'Terlalu banyak percobaan.' : 'Kode Gerbang 2 salah.' };
  }
  return { ok: true };
}

function taAdminDistance_(a, b) {
  a = String(a || ''); b = String(b || '');
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, function(_, i) { return i; });
  for (let i = 1; i <= a.length; i++) {
    let left = i;
    for (let j = 1; j <= b.length; j++) {
      const old = prev[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      prev[j] = Math.min(prev[j] + 1, left + 1, prev[j - 1] + cost);
      left = prev[j];
      if (j === b.length) prev[j] = Math.min(prev[j], old + cost);
    }
  }
  return prev[b.length];
}

function taAdminSimilarity_(a, b) {
  a = String(a || ''); b = String(b || '');
  const max = Math.max(a.length, b.length);
  return max ? 1 - taAdminDistance_(a, b) / max : 1;
}

function taAdminEmailValid_(input, expected) {
  const actual = taAdminNormalizeEmail_(input);
  const target = taAdminNormalizeEmail_(expected);
  if (actual === target) return true;
  const a = actual.split('@'); const e = target.split('@');
  if (a.length !== 2 || e.length !== 2 || a[1] !== e[1]) return false;
  return taAdminSimilarity_(a[0], e[0]) >= TA_ADMIN_SECURITY.typo.emailLocal;
}

function verifyAdminIdentity_(name, email, address) {
  if (taAdminLocked_()) return { ok: false, locked: true, message: 'Akses sementara dikunci.' };
  const p = PropertiesService.getScriptProperties();
  const expectedName = p.getProperty(TA_ADMIN_KEYS.name) || TA_ADMIN_SECURITY.identity.name;
  const expectedEmail = p.getProperty(TA_ADMIN_KEYS.email) || TA_ADMIN_SECURITY.identity.email;
  const expectedAddress = p.getProperty(TA_ADMIN_KEYS.address) || TA_ADMIN_SECURITY.identity.address;
  const nameOk = taAdminSimilarity_(taAdminNormalize_(name), taAdminNormalize_(expectedName)) >= TA_ADMIN_SECURITY.typo.name;
  const emailOk = taAdminEmailValid_(email, expectedEmail);
  const addressOk = taAdminSimilarity_(taAdminNormalize_(address), taAdminNormalize_(expectedAddress)) >= TA_ADMIN_SECURITY.typo.address;
  if (!nameOk || !emailOk || !addressOk) {
    const locked = taAdminFailure_();
    return { ok: false, locked: locked, message: locked ? 'Terlalu banyak percobaan.' : 'Identitas admin tidak cocok.' };
  }
  return { ok: true };
}

function verifyAdminPassword_(value) {
  if (taAdminLocked_()) return { ok: false, locked: true, message: 'Akses sementara dikunci.' };
  const stored = PropertiesService.getScriptProperties().getProperty(TA_ADMIN_KEYS.password);
  if (!stored) return { ok: false, configured: false, message: 'Password admin belum dikonfigurasi.' };
  if (taAdminHash_(value, 'password') !== stored) {
    const locked = taAdminFailure_();
    return { ok: false, locked: locked, message: locked ? 'Terlalu banyak percobaan.' : 'Password admin salah.' };
  }
  taAdminClearFailures_();
  return { ok: true };
}

function resetAdminLockout() {
  taAdminClearFailures_();
  return { status: 'success' };
}

function resetAdminSecurity() {
  return configureAdminSecurity();
}
