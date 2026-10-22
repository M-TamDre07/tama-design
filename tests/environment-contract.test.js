'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getSupabaseConfig } = require('../api/_lib/db');
const configHandler = require('../api/config');

const ENV_KEYS = [
  'SUPABASE_URL',
  'SUPABASE_PUBLISHABLE_KEY',
  'SUPABASE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY'
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
  process.env.SUPABASE_SECRET_KEY = 'sb_secret_must_not_leave_server';

  const req = { method: 'GET' };
  const res = mockResponse();
  configHandler(req, res);

  assert.equal(res.statusCode, 200);
  const payload = JSON.parse(res.body);
  assert.deepEqual(Object.keys(payload).sort(), ['publishableKey', 'status', 'url']);
  assert.equal(payload.url, 'https://example.supabase.co');
  assert.equal(payload.publishableKey, 'sb_publishable_test_only');
  assert.equal(res.body.includes('sb_secret_must_not_leave_server'), false);
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
    assert.doesNotMatch(scriptSrc, /unsafe-inline/);
  }

  for (const route of ['/pesan.html', '/keluhan.html']) {
    assert.ok(
      (config.redirects || []).some(item => item.source === route && item.destination === '/maintenance.html'),
      route + ' must remain in maintenance until release gates pass'
    );
  }
});
