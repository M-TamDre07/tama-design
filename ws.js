// Tama Andrea Official - Service Worker (PWA & Cache Optimization)
const CACHE_NAME = 'tamaandrea-cache-v1';

// Daftar file yang ingin disimpan agar bisa diakses offline
const urlsToCache = [
  '/',
  '/index.html',
  '/Index3.html',
  '/manifest.json',
  '/logo.png',
  '/favicon.ico',
  '/style.css',
  '/script.js'
];

// Install service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching assets...');
      return cache.addAll(urlsToCache);
    })
  );
  self.skipWaiting();
});

// Aktivasi SW dan hapus cache lama
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(name => {
          if (name !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch handler (online-first dengan fallback offline)
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});