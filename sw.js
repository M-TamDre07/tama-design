/**
 * Tama Andrea Studio — Service Worker v5.0
 * Strategi: Cache-First untuk aset statis, Network-First untuk halaman
 */

const CACHE_NAME   = 'ta-studio-v5';
const OFFLINE_URL  = '/index.html';

/* Aset yang di-cache saat install */
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/logo-tamaandreastudio.jpg',
  'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Manrope:wght@300;400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

/* ── Install: simpan aset ke cache ── */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Menyimpan aset ke cache...');
      return cache.addAll(STATIC_ASSETS.map(url => {
        /* Gunakan no-cors untuk CDN eksternal */
        return new Request(url, { mode: url.startsWith('http') && !url.includes(self.location.host) ? 'no-cors' : 'same-origin' });
      })).catch(err => {
        console.warn('[SW] Sebagian aset gagal di-cache (non-fatal):', err);
      });
    })
  );
  self.skipWaiting();
});

/* ── Activate: hapus cache lama ── */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
            .map(key => {
              console.log('[SW] Menghapus cache lama:', key);
              return caches.delete(key);
            })
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: strategi sesuai tipe request ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  /* Abaikan: API calls, Google Sheets, Analytics */
  if (
    url.hostname.includes('api.anthropic.com') ||
    url.hostname.includes('docs.google.com') ||
    url.hostname.includes('formspree.io') ||
    url.hostname.includes('googletagmanager.com') ||
    url.hostname.includes('wa.me') ||
    request.method !== 'GET'
  ) return;

  /* Aset statis: Cache-First */
  if (
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  /* Navigasi: Network-First, fallback ke cache/offline */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          return response;
        })
        .catch(() =>
          caches.match(request).then(cached => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  /* Default: Network with cache fallback */
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

/* ── Sinkronisasi di background (opsional) ── */
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
