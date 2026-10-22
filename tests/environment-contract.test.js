'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getSupabaseConfig, safeError } = require('../api/_lib/db');
const { sendTelegramMessage, isTelegramConfigured } = require('../api/_lib/telegram');
const configHandler = require('../api/config');

const ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID'
];

function snapshotEnv() {
  return Object.fromEntries(ENV_KEYS.map(key => [key, process.env[key]]));
}

function restoreEnv(snapshot) {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
}

function clearEnv() {
  for (const key of ENV_KEYS) delete process.env[key];
}

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: '',
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    end(value) { this.body = String(value || ''); }
  };
}

test('Supabase backend config requires URL, publishable key, and a server secret', t => {
  const original = snapshotEnv();
  t.after(() => restoreEnv(original));
  clearEnv();
  assert.throws(
    () => getSupabaseConfig(),
    error => error.statusCode === 503 && /SUPABASE_URL/.test(error.message)
  );

  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
  assert.throws(() => getSupabaseConfig(), error => error.statusCode === 503);
});

test('Supabase config normalizes the base URL and prefers the current secret key', t => {
  const original = snapshotEnv();
  t.after(() => restoreEnv(original));
  clearEnv();
  process.env.SUPABASE_URL = ' https://example.supabase.co/// ';
  process.env.SUPABASE_PUBLISHABLE_KEY = ' sb_publishable_test_only ';
  process.env.SUPABASE_SECRET_KEY = ' sb_secret_test_only ';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy_fallback_test_only';

  assert.deepEqual(getSupabaseConfig(), {
    url: 'https://example.supabase.co',
    publishableKey: 'sb_publishable_test_only',
    secretKey: 'sb_secret_test_only'
  });
});

test('legacy service-role variable remains a compatibility fallback', t => {
  const original = snapshotEnv();
  t.after(() => restoreEnv(original));
  clearEnv();
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'legacy_fallback_test_only';

  assert.equal(getSupabaseConfig().secretKey, 'legacy_fallback_test_only');
});

test('/api/config returns only the public URL and publishable key', t => {
  const original = snapshotEnv();
  t.after(() => restoreEnv(original));
  clearEnv();
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
  process.env.SUPABASE_SECRET_KEY = 'sb_' + 'secret_' + 'must_not_leave_server';

  const req = { method: 'GET' };
  const res = mockResponse();
  configHandler(req, res);

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.deepEqual(Object.keys(payload).sort(), ['publishableKey', 'status', 'url']);
  assert.equal(payload.url, 'https://example.supabase.co');
  assert.equal(payload.publishableKey, 'sb_publishable_test_only');
  assert.equal(res.body.includes('must_not_leave_server'), false);
});

test('admin HTML, JavaScript, and stylesheets remain connected without inline code', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  assert.match(html, /<script[^>]+src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2\.\d+\.\d+"[^>]*defer/);
  assert.match(html, /<script[^>]+src="\/js\/admin\.js"[^>]*defer/);
  const scriptTags = [...html.matchAll(/<script\b[^>]*>/gi)].map(match => match[0]);
  assert.ok(scriptTags.length > 0, 'admin page should load its required script files');
  assert.ok(scriptTags.every(tag => /\bsrc=/i.test(tag)), 'admin page should use external script files');
  assert.doesNotMatch(html, /<style\b/i, 'admin styles should be external');
  assert.doesNotMatch(html, /\sstyle=/i, 'admin must not use inline style attributes');

  const linkedAssets = [...html.matchAll(/(?:href|src)="(\/[^"]+\.(?:css|js))"/gi)].map(match => match[1]);
  assert.ok(linkedAssets.includes('/js/admin.js'), 'admin controller must be linked from HTML');
  assert.ok(linkedAssets.includes('/css/admin.css'), 'admin stylesheet must be linked from HTML');
  for (const asset of linkedAssets) {
    assert.ok(fs.existsSync(path.join(root, asset.slice(1))), 'missing HTML dependency: ' + asset);
  }

  const cssRoot = path.join(root, 'css');
  for (const name of fs.readdirSync(cssRoot).filter(name => name.endsWith('.css'))) {
    const css = fs.readFileSync(path.join(cssRoot, name), 'utf8');
    assert.equal((css.match(/{/g) || []).length, (css.match(/}/g) || []).length,
      'unbalanced CSS braces in css/' + name);
  }
});

test('Telegram delivery is server-side and fails closed without configuration', async t => {
  const original = snapshotEnv();
  const originalFetch = global.fetch;
  t.after(() => { restoreEnv(original); global.fetch = originalFetch; });
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_CHAT_ID;
  assert.equal(isTelegramConfigured(), false);
  assert.deepEqual(await sendTelegramMessage('test only'), { status: 'not_configured', messageId: null });

  process.env.TELEGRAM_BOT_TOKEN = '1234567890:' + 'A'.repeat(32);
  process.env.TELEGRAM_CHAT_ID = '-1001234567890';
  assert.equal(isTelegramConfigured(), true);
  global.fetch = async () => ({
    ok: true,
    json: async () => ({ ok: true, result: { message_id: 321 } })
  });
  assert.deepEqual(await sendTelegramMessage('message test'), { status: 'sent', messageId: 321 });

  global.fetch = async () => ({ ok: true, json: async () => ({ ok: false }) });
  assert.deepEqual(await sendTelegramMessage('message test'), { status: 'failed', messageId: null });

  global.fetch = async () => { throw new Error('network unavailable'); };
  assert.deepEqual(await sendTelegramMessage('message test'), { status: 'failed', messageId: null });
});

test('server error logging redacts secrets and keeps client responses generic', async t => {
  const original = snapshotEnv();
  const originalFetch = global.fetch;
  t.after(() => { restoreEnv(original); global.fetch = originalFetch; });
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
  const secretKey = 'sb_' + 'secret_' + 'fixture_not_for_output';
  const telegramToken = '1234567890:' + 'B'.repeat(32);
  process.env.SUPABASE_SECRET_KEY = secretKey;
  let recorded = null;
  global.fetch = async (_url, options) => {
    recorded = JSON.parse(options.body);
    return { ok: true, status: 201, text: async () => '', headers: { get: () => null } };
  };

  const error = new Error('Failed for https://example.invalid/private ' + secretKey + ' token ' + telegramToken + ' email admin@example.invalid');
  error.statusCode = 502;
  const res = mockResponse();
  await safeError(res, error, 'api/test', { headers: { 'x-vercel-id': 'test-request-001' } });

  assert.equal(res.statusCode, 502);
  assert.equal(res.body.includes(secretKey), false);
  assert.equal(res.body.includes(telegramToken), false);
  assert.equal(res.body.includes('admin@example.invalid'), false);
  assert.ok(recorded && recorded[0]);
  assert.equal(recorded[0].handler, 'api/test');
  assert.equal(recorded[0].request_id, 'test-request-001');
  assert.ok(recorded[0].message.includes('[SUPABASE_SECRET_KEY]'));
  assert.ok(recorded[0].message.includes('[TELEGRAM_TOKEN]'));
  assert.ok(recorded[0].message.includes('[URL]'));
  assert.ok(recorded[0].message.includes('[EMAIL]'));
});

test('operations dashboard exposes inbox, Telegram delivery, error log, and retry controls', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const root = path.join(__dirname, '..');
  const html = fs.readFileSync(path.join(root, 'admin.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'js/admin.js'), 'utf8');
  const api = fs.readFileSync(path.join(root, 'api/admin.js'), 'utf8');
  for (const marker of ['id="testTelegramBtn"', 'id="errorLogsBody"', 'data-tab="errors"']) {
    assert.ok(html.includes(marker), 'missing operations UI marker: ' + marker);
  }
  for (const marker of ["action:'testTelegram'", "action:'retryNotification'", 'renderErrors()', 'renderNotifications()']) {
    assert.ok(js.includes(marker), 'missing dashboard handler marker: ' + marker);
  }
  for (const marker of ['updateWebsiteMessage', 'retryNotification', 'testTelegram', 'error_logs', 'systemStatus']) {
    assert.ok(api.includes(marker), 'missing API operations marker: ' + marker);
  }
});

test('explicit browser-deny policy migration preserves zero direct grants', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase/migrations/20261022200359_explicit_deny_browser_policies.sql'), 'utf8').toLowerCase();
  assert.ok(migration.includes('block_direct_browser_access'));
  assert.ok(migration.includes('to anon, authenticated using (false) with check (false)'));
  assert.ok(migration.includes('revoke all'));
});

test('Vercel configuration preserves maintenance redirects and private admin headers', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'vercel.json'), 'utf8'));
  const headers = config.headers || [];
  const global = headers.find(item => item.source === '/(.*)');
  const hsts = (global?.headers || []).find(item => item.key.toLowerCase() === 'strict-transport-security');
  assert.ok(hsts, 'HSTS should be configured globally');

  for (const route of ['/admin', '/admin.html']) {
    const rule = headers.find(item => item.source === route);
    const map = Object.fromEntries((rule?.headers || []).map(item => [item.key.toLowerCase(), item.value]));
    assert.match(map['cache-control'] || '', /no-store/);
    assert.match(map['x-robots-tag'] || '', /noindex/);
    assert.ok(map['content-security-policy'], 'admin route must have a CSP');
    const scriptSrc = map['content-security-policy'].split('script-src ')[1]?.split(';')[0] || '';
    const styleSrc = map['content-security-policy'].split('style-src ')[1]?.split(';')[0] || '';
    assert.doesNotMatch(scriptSrc, /unsafe-inline/);
    assert.doesNotMatch(styleSrc, /unsafe-inline/);
  }

  for (const route of ['/pesan.html', '/keluhan.html']) {
    assert.ok(
      (config.redirects || []).some(item => item.source === route && item.destination === '/maintenance.html'),
      route + ' must remain in maintenance until release gates pass'
    );
  }
});
