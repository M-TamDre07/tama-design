'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8');
const migration = read('supabase/migrations/20261123170100_studio_media_news_achievements.sql');
const adminApi = read('api/admin.js');
const publicApi = read('api/public.js');
const catalogApi = read('api/catalog.js');
const adminUi = read('js/admin.js');
const siteUi = read('js/site.js');
const adminHtml = read('admin.html');
const orderPage = read('pesan.html');

test('media schema stores metadata while image bytes use separate Storage buckets', () => {
  for (const marker of ['studio_media_assets', 'studio_achievements', 'studio_news', 'studio-media-public', 'studio-media-private', 'image/webp']) {
    assert.ok(migration.includes(marker), 'missing migration marker: ' + marker);
  }
  assert.match(migration, /file_size_limit/);
  assert.match(migration, /8388608/);
  assert.match(migration, /object_path text not null unique/);
});

test('CMS tables deny browser roles and grant the server role explicitly', () => {
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on public\.studio_media_assets, public\.studio_achievements, public\.studio_news\s+from public, anon, authenticated/i);
  assert.match(migration, /to service_role/i);
  assert.match(migration, /using \(false\) with check \(false\)/i);
});

test('upload API is admin-gated, rate-limited, scoped, and verifies WebP bytes', () => {
  assert.match(adminApi, /async function authenticateAdmin/);
  assert.match(adminApi, /const actor = await authenticateAdmin\(req\)/);
  assert.match(adminApi, /createMediaUpload/);
  assert.match(adminApi, /completeMediaUpload/);
  assert.match(adminApi, /admin-media-upload/);
  assert.match(adminApi, /admin-media-complete/);
  assert.match(adminApi, /randomUUID\(\)/);
  assert.match(adminApi, /mimeType !== 'image\/webp'/);
  assert.match(adminApi, /bytes\.toString\('ascii', 0, 4\) === 'RIFF'/);
  assert.match(adminApi, /bytes\.toString\('ascii', 8, 12\) === 'WEBP'/);
  assert.match(adminApi, /PRIVATE_MEDIA_NOT_PUBLISHABLE/);
});

test('public catalogue only resolves ready objects from the public bucket', () => {
  assert.match(catalogApi, /bucket_id: 'eq\.studio-media-public'/);
  assert.match(catalogApi, /visibility: 'eq\.public'/);
  assert.match(catalogApi, /status: 'eq\.ready'/);
  assert.match(catalogApi, /readPublicAchievements/);
  assert.match(catalogApi, /readPublicNews/);
});

test('browser converts to WebP and does not contain a Supabase secret key', () => {
  assert.match(adminUi, /createImageBitmap/);
  assert.match(adminUi, /image\/webp/);
  assert.match(adminUi, /uploadToSignedUrl/);
  assert.doesNotMatch(adminUi, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|sb_secret_/);
  assert.match(adminHtml, /value="private" selected/);
});

test('portfolio filters, service examples, achievements and news are wired to pages', () => {
  assert.match(siteUi, /portfolioCategoryFilter/);
  assert.match(siteUi, /serviceWorkPreview/);
  assert.match(siteUi, /renderAchievements/);
  assert.match(siteUi, /renderNews/);
  assert.match(siteUi, /escapeHtml\(p\)/);
  assert.match(adminHtml, /data-tab="media"/);
  assert.match(adminHtml, /data-tab="achievements"/);
  assert.match(adminHtml, /data-tab="news"/);
  assert.match(adminHtml, /class="admin-skip" href="#adminMain"/);
  assert.match(adminHtml, /aria-controls="tab-orders"/);
  assert.match(orderPage, /orderQuantity/);
  assert.match(orderPage, /briefHelp/);
});


test('order quantity, size and reference are preserved in the existing customer brief', () => {
  assert.match(publicApi, /Jumlah desain\/variasi/);
  assert.match(publicApi, /quantity < 1 \|\| quantity > 20/);
  assert.match(publicApi, /Ukuran\/format/);
  assert.match(publicApi, /Referensi/);
});

test('published news require a public cover image', () => {
  assert.match(adminApi, /status === 'published' && !coverMediaId/);
  assert.match(adminApi, /status === 'published' && !existing\[0\]\.cover_media_id/);
  assert.match(adminApi, /NEWS_COVER_REQUIRED/);
});

test('portfolio edits clear stale media and service relationships', () => {
  assert.match(adminApi, /media_asset_id: mediaAssetId \|\| null/);
  assert.match(adminApi, /service_id: serviceId \|\| null/);
});

test('date and Unicode normalization regexes use valid single escapes', () => {
  assert.ok(adminApi.includes('/^\\d{4}-\\d{2}-\\d{2}$/.test(achievedOn)'));
  assert.ok(adminApi.includes('/[\\u0300-\\u036f]/g'));
  assert.ok(adminUi.includes('/[\\u0300-\\u036f]/g'));
  assert.ok(!adminApi.includes('/^\\\\d{4}'));
  assert.ok(!adminApi.includes('/[\\\\u0300'));
  assert.ok(!adminUi.includes('/[\\\\u0300'));
});


test('launch news supports a constrained same-origin WebP cover image', () => {
  assert.match(migration, /cover_image_url text not null default ''/);
  assert.match(adminApi, /hasStaticCover/);
  assert.match(adminApi, /cover_image_url: coverMediaId/);
  assert.match(catalogApi, /item\\.cover_image_url/);
  assert.match(adminHtml, /newsCoverImageUrl/);
  assert.match(adminUi, /coverImageUrl:/);
});
