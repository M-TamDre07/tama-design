// sw.js - Tama Andrea Official (Smart Service Worker)
const CACHE_VERSION = 'v3';
const CACHE_NAME = `tamaandrea-cache-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE_ASSETS = [
  '/',                    // root (index.html)
  '/index.html',
  OFFLINE_URL,
  '/manifest.json',
  '/favicon.ico',
  '/IMG-20250804-WA0015(3).jpg',            // ganti jika nama logo beda
  '/IMG-20250804-WA0015(3).jpg',  // aman kalau ada
  '/style.css',           // ganti jika CSS berbeda
  '/script.js'            // ganti jika JS berbeda
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }))
    ).then(() => self.clients.claim())
  );
});

// Helper: try network, fallback cache
async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    return cached || caches.match(OFFLINE_URL);
  }
}

// Helper: cache-first for images/assets
async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    return caches.match(OFFLINE_URL);
  }
}

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const request = event.request;
  const url = new URL(request.url);

  // Navigation requests (HTML) -> network-first (so users get newest page)
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request));
    return;
  }

  // Images -> cache-first (fast)
  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // CSS/JS/Fonts -> stale-while-revalidate style
  if (['style', 'script', 'font'].includes(request.destination)) {
    event.respondWith(
      caches.match(request).then(cached => {
        const networkFetch = fetch(request).then(resp => {
          if (resp && resp.ok) {
            caches.open(CACHE_NAME).then(cache => cache.put(request, resp.clone()));
          }
          return resp;
        }).catch(()=>null);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Default: try network then cache fallback
  event.respondWith(
    fetch(request).then(resp => {
      if (resp && resp.ok) {
        caches.open(CACHE_NAME).then(cache => cache.put(request, resp.clone()));
      }
      return resp;
    }).catch(() => caches.match(request))
  );
});

// Message handler (allow skipWaiting from page)
self.addEventListener('message', event => {
  if (!event.data) return;
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});