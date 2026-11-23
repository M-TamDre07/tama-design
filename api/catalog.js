'use strict';

const { sendJson, parseRequestBody, getSupabaseConfig, rest, enforceRateLimit, safeError } = require('./_lib/db');

const CATALOG_CACHE_CONTROL = 'public, max-age=15, s-maxage=60, stale-while-revalidate=180';
function sendCatalogJson(res, payload) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', CATALOG_CACHE_CONTROL);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(payload));
}

function publicObjectUrl(bucket, path) {
  const config = getSupabaseConfig();
  return config.url + '/storage/v1/object/public/' + encodeURIComponent(bucket) + '/' + String(path || '').split('/').map(encodeURIComponent).join('/');
}
function isMissingCmsSchema(error) {
  return ['42P01', '42703', 'PGRST204', 'PGRST205'].includes(String(error && error.databaseCode || ''));
}
async function readPublicMedia(ids) {
  const unique = Array.from(new Set((ids || []).filter(id => /^[0-9a-f-]{36}$/i.test(String(id || '')))));
  if (!unique.length) return new Map();
  let rows;
  try {
    rows = await rest('studio_media_assets', {
      query: {
        select: 'id,bucket_id,object_path,mime_type,width,height,alt_text,caption,visibility,status',
        id: 'in.(' + unique.join(',') + ')',
        bucket_id: 'eq.studio-media-public',
        visibility: 'eq.public',
        status: 'eq.ready'
      }
    });
  } catch (error) {
    if (isMissingCmsSchema(error)) return new Map();
    throw error;
  }
  return new Map((Array.isArray(rows) ? rows : []).map(row => [row.id, {
    ...row,
    image_url: publicObjectUrl(row.bucket_id, row.object_path)
  }]));
}
async function readPublicPortfolio(req) {
  let rows;
  try {
    rows = await rest('studio_portfolio', {
      query: {
        select: 'id,title,category,description,image_url,alt_text,featured,sort_order,media_asset_id,service_id',
        active: 'eq.true',
        order: 'featured.desc,sort_order.asc,created_at.desc',
        limit: '100'
      }
    });
  } catch (error) {
    if (!isMissingCmsSchema(error)) throw error;
    rows = await rest('studio_portfolio', {
      query: {
        select: 'id,title,category,description,image_url,alt_text,featured,sort_order',
        active: 'eq.true',
        order: 'featured.desc,sort_order.asc,created_at.desc',
        limit: '100'
      }
    });
  }
  const services = await rest('studio_services', { query: { select: 'id,slug,name', limit: '100' } });
  const serviceMap = new Map((Array.isArray(services) ? services : []).map(item => [item.id, item]));
  const media = await readPublicMedia((Array.isArray(rows) ? rows : []).map(item => item.media_asset_id));
  let items = (Array.isArray(rows) ? rows : []).map(item => {
    const asset = item.media_asset_id ? media.get(item.media_asset_id) : null;
    const service = item.service_id ? serviceMap.get(item.service_id) : null;
    return {
      ...item,
      image_url: asset ? asset.image_url : item.image_url,
      alt_text: asset && asset.alt_text ? asset.alt_text : item.alt_text,
      service_slug: service ? service.slug : '',
      service_name: service ? service.name : ''
    };
  }).filter(item => item.image_url);
  const serviceSlug = clean(req.query && req.query.service, 120);
  const serviceId = clean(req.query && req.query.serviceId, 64);
  const category = clean(req.query && req.query.category, 80).toLocaleLowerCase('id');
  if (serviceSlug) items = items.filter(item => item.service_slug === serviceSlug);
  if (serviceId && /^[0-9a-f-]{36}$/i.test(serviceId)) items = items.filter(item => item.service_id === serviceId);
  if (category) items = items.filter(item => String(item.category || '').toLocaleLowerCase('id') === category);
  return items;
}
async function readPublicAchievements() {
  let rows;
  try {
    rows = await rest('studio_achievements', {
      query: { select: 'id,title,issuer,description,achieved_on,media_asset_id,featured,sort_order,published_at', status: 'eq.published', order: 'featured.desc,sort_order.asc,achieved_on.desc.nullslast', limit: '60' }
    });
  } catch (error) {
    if (isMissingCmsSchema(error)) return [];
    throw error;
  }
  const media = await readPublicMedia((Array.isArray(rows) ? rows : []).map(item => item.media_asset_id));
  return (Array.isArray(rows) ? rows : []).map(item => {
    const asset = media.get(item.media_asset_id);
    return { ...item, image_url: asset ? asset.image_url : '', alt_text: asset ? asset.alt_text : item.title };
  }).filter(item => item.image_url);
}
async function readPublicNews(req) {
  let rows;
  try {
    rows = await rest('studio_news', {
      query: { select: 'id,title,slug,excerpt,content,category,cover_media_id,cover_image_url,published_at', status: 'eq.published', order: 'published_at.desc', limit: '60' }
    });
  } catch (error) {
    if (isMissingCmsSchema(error)) return [];
    throw error;
  }
  const media = await readPublicMedia((Array.isArray(rows) ? rows : []).map(item => item.cover_media_id));
  let items = (Array.isArray(rows) ? rows : []).map(item => {
    const asset = item.cover_media_id ? media.get(item.cover_media_id) : null;
    return { ...item, image_url: asset ? asset.image_url : (item.cover_image_url || ''), alt_text: asset && asset.alt_text ? asset.alt_text : item.title };
  });
  const slug = clean(req.query && req.query.slug, 180);
  if (slug) items = items.filter(item => item.slug === slug);
  return items;
}

function catalogConfigFallback() {
  return { version: '2026.11', studioName: 'Tama Andrea Studio', serviceFocus: 'Desain Grafis', locationLabel: 'Kalianda · Lampung Selatan', currency: 'IDR', revisionPolicy: 'Revisi mengikuti ruang lingkup yang disepakati sebelum pengerjaan.' };
}
async function readCatalogBootstrap(req, res) {
  const available = ['config','services','portfolio','faqs','payments','reviews','achievements','news'];
  const raw = String(req.query && req.query.include || '').trim();
  const include = new Set((raw ? raw.split(',') : available).map(x => x.trim()).filter(x => available.includes(x)));
  if (!include.size) include.add('config');
  const tasks = [];
  const keys = [];
  const add = (key, promise) => { keys.push(key); tasks.push(promise); };
  if (include.has('config')) add('config', rest('site_config', { query: { select: 'config', id: 'eq.default', limit: '1' } }));
  if (include.has('services')) add('services', rest('studio_services', { query: { select: 'id,slug,name,category,description,price_min,price_max,price_label,featured,sort_order', active: 'eq.true', order: 'sort_order.asc,name.asc', limit: '60' } }));
  if (include.has('portfolio')) add('portfolio', readPublicPortfolio(req));
  if (include.has('faqs')) add('faqs', rest('studio_faq', { query: { select: 'id,question,answer,category,sort_order', active: 'eq.true', order: 'sort_order.asc,created_at.asc', limit: '100' } }));
  if (include.has('payments')) add('paymentMethods', rest('studio_payment_methods', { query: { select: 'id,name,account_name,account_number,instructions,logo_url,sort_order', active: 'eq.true', order: 'sort_order.asc,name.asc', limit: '50' } }));
  if (include.has('reviews')) add('reviews', rest('studio_reviews', { query: { select: 'id,customer_name,customer_role,rating,review_text,published_at', status: 'eq.published', order: 'published_at.desc', limit: '24' } }));
  if (include.has('achievements')) add('achievements', readPublicAchievements());
  if (include.has('news')) add('news', readPublicNews(req));
  const values = await Promise.all(tasks);
  const payload = { status: 'ok' };
  keys.forEach((key,index) => {
    if (key === 'config') {
      const row = Array.isArray(values[index]) ? values[index][0] : null;
      payload.config = { ...catalogConfigFallback(), ...((row && row.config) || {}), serviceFocus: 'Desain Grafis' };
    } else payload[key] = Array.isArray(values[index]) ? values[index] : [];
  });
  return sendCatalogJson(res, payload);
}
const { sendTelegramMessage } = require('./_lib/telegram');

function clean(value, max) {
  return String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max || 1200);
}
function fail(message, statusCode, code) {
  const error = new Error(message);
  error.statusCode = statusCode || 400;
  error.code = code || 'CATALOG_ERROR';
  throw error;
}
async function handle(req, res) {
  if (req.method === 'GET') {
    const action = String(req.query && req.query.action || '').trim();
    if (action === 'bootstrap') return await readCatalogBootstrap(req, res);
    if (action === 'services') {
      const rows = await rest('studio_services', {
        query: {
          select: 'id,slug,name,category,description,price_min,price_max,price_label,featured,sort_order',
          active: 'eq.true',
          order: 'sort_order.asc,name.asc'
        }
      });
      return sendJson(res, 200, { status: 'ok', services: Array.isArray(rows) ? rows : [] });
    }

    if (action === 'portfolio') {
      const items = await readPublicPortfolio(req);
      return sendJson(res, 200, { status: 'ok', portfolio: items });
    }
    if (action === 'achievements') {
      return sendJson(res, 200, { status: 'ok', achievements: await readPublicAchievements() });
    }
    if (action === 'news') {
      return sendJson(res, 200, { status: 'ok', news: await readPublicNews(req) });
    }
    if (action === 'faqs') {
      const rows = await rest('studio_faq', {
        query: { select: 'id,question,answer,category,sort_order', active: 'eq.true', order: 'sort_order.asc,created_at.asc', limit: '100' }
      });
      return sendJson(res, 200, { status: 'ok', faqs: Array.isArray(rows) ? rows : [] });
    }
    if (action === 'paymentMethods') {
      const rows = await rest('studio_payment_methods', {
        query: { select: 'id,name,account_name,account_number,instructions,logo_url,sort_order', active: 'eq.true', order: 'sort_order.asc,name.asc', limit: '50' }
      });
      return sendJson(res, 200, { status: 'ok', paymentMethods: Array.isArray(rows) ? rows : [] });
    }
    if (action === 'reviews') {
      const rows = await rest('studio_reviews', {
        query: {
          select: 'id,customer_name,customer_role,rating,review_text,published_at',
          status: 'eq.published',
          order: 'published_at.desc',
          limit: '24'
        }
      });
      return sendJson(res, 200, { status: 'ok', reviews: Array.isArray(rows) ? rows : [] });
    }
    return sendJson(res, 404, { status: 'error', message: 'Katalog tidak ditemukan.' });
  }
  if (req.method === 'POST') {
    await enforceRateLimit(req, 'studio-review-submit', 3, 86400);
    const body = await parseRequestBody(req);
    if (body.action !== 'submitReview') fail('Action ulasan tidak dikenal.', 400, 'UNKNOWN_ACTION');
    if (clean(body._gotcha, 120)) return sendJson(res, 200, { status: 'ok', message: 'Terima kasih. Ulasan telah diterima untuk ditinjau.' });
    const name = clean(body.customerName || body.name, 100);
    const role = clean(body.customerRole || body.role, 100);
    const rating = Number(body.rating);
    const reviewText = clean(body.reviewText || body.review, 1200);
    if (name.length < 2 || !Number.isInteger(rating) || rating < 1 || rating > 5 || reviewText.length < 10) {
      fail('Nama, rating 1–5, dan ulasan minimal 10 karakter wajib diisi.', 400, 'INVALID_REVIEW');
    }
    const rows = await rest('studio_reviews', {
      method: 'POST',
      body: [{
        customer_name: name,
        customer_role: role,
        rating,
        review_text: reviewText,
        status: 'pending',
        source: 'website'
      }],
      prefer: 'return=representation'
    });
    const row = Array.isArray(rows) ? rows[0] : null;
    if (!row || !row.id) fail('Ulasan belum berhasil disimpan. Coba kembali.', 502, 'REVIEW_SAVE_FAILED');
    await sendTelegramMessage(
      'Ulasan baru menunggu moderasi — Tama Andrea Studio\\n' +
      'Nama: ' + name + '\\nRating: ' + rating + '/5\\n' +
      'Isi: ' + reviewText.slice(0, 700) + '\\nID: ' + row.id
    ).catch(() => {});
    return sendJson(res, 200, {
      status: 'ok',
      message: 'Ulasan berhasil dikirim dan akan ditampilkan setelah ditinjau.'
    });
  }
  res.setHeader('Allow', 'GET, POST');
  return sendJson(res, 405, { status: 'error', message: 'Metode tidak diizinkan.' });
}
module.exports = async function catalogHandler(req, res) {
  try { await handle(req, res); }
  catch (error) { return safeError(res, error, 'api/catalog', req); }
};
