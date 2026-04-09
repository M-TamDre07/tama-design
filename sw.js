// sw.js — Tama Andrea Studio Service Worker v4.0
const CACHE_VERSION  = 'v4';
const CACHE_STATIC   = `ta-static-${CACHE_VERSION}`;
const CACHE_DYNAMIC  = `ta-dynamic-${CACHE_VERSION}`;
const OFFLINE_URL    = '/offline.html';

// Assets to precache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/offline.html',
  '/manifest.json'
];

/* ---- INSTALL ---- */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_STATIC)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] Precache failed:', err))
  );
});

/* ---- ACTIVATE ---- */
self.addEventListener('activate', event => {
  const allowedCaches = [CACHE_STATIC, CACHE_DYNAMIC];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !allowedCaches.includes(k))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ---- FETCH STRATEGIES ---- */

// Network-first → fallback to cache → fallback offline
async function networkFirst(request) {
  try {
    const resp = await fetch(request, { credentials: 'same-origin' });
    if (resp && resp.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, resp.clone());
    }
    return resp;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match(OFFLINE_URL);
  }
}

// Cache-first → background refresh
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    // Background revalidate
    fetch(request).then(resp => {
      if (resp?.ok) {
        caches.open(CACHE_DYNAMIC).then(c => c.put(request, resp));
      }
    }).catch(() => {});
    return cached;
  }
  try {
    const resp = await fetch(request);
    if (resp?.ok) {
      const cache = await caches.open(CACHE_DYNAMIC);
      cache.put(request, resp.clone());
    }
    return resp;
  } catch {
    return caches.match(OFFLINE_URL);
  }
}

// Stale-while-revalidate
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkFetch = fetch(request).then(resp => {
    if (resp?.ok) {
      caches.open(CACHE_DYNAMIC).then(c => c.put(request, resp.clone()));
    }
    return resp;
  }).catch(() => null);
  return cached || await networkFetch;
}

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin requests (analytics, fonts cdn etc)
  if (url.origin !== self.location.origin) return;

  // Navigation (HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Images → cache-first (fast visual loading)
  if (event.request.destination === 'image') {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // CSS / JS / Fonts → stale-while-revalidate
  if (['style', 'script', 'font'].includes(event.request.destination)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  // Default
  event.respondWith(
    fetch(event.request)
      .then(resp => {
        if (resp?.ok) {
          caches.open(CACHE_DYNAMIC).then(c => c.put(event.request, resp.clone()));
        }
        return resp;
      })
      .catch(() => caches.match(event.request))
  );
});

/* ---- MESSAGE HANDLER ---- */
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
