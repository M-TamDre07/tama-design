/**
 * Tama Andrea Studio — Service Worker v2.0
 * Strategi: Cache-first untuk aset statis, Network-first untuk halaman
 * Mendukung: offline browsing, perangkat kentang, sinyal lemah
 */

const CACHE_NAME    = 'ta-studio-v2';
const FONT_CACHE    = 'ta-fonts-v2';
const IMG_CACHE     = 'ta-images-v2';

/* Aset shell yang di-cache saat install */
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/logo-tamaandreastudio.jpg',
];

/* CDN & Font yang di-cache terpisah (lebih jarang berubah) */
const STATIC_THIRD_PARTY = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
];

/* ── Install: simpan shell ── */
self.addEventListener('install', event => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(c =>
        c.addAll(SHELL_ASSETS).catch(err =>
          console.warn('[SW] Gagal cache shell:', err)
        )
      ),
      caches.open(FONT_CACHE).then(c =>
        c.addAll(STATIC_THIRD_PARTY).catch(() => {})
      ),
    ])
  );
  self.skipWaiting(); // Aktif segera tanpa menunggu tab ditutup
});

/* ── Activate: hapus cache lama ── */
self.addEventListener('activate', event => {
  const VALID = [CACHE_NAME, FONT_CACHE, IMG_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => !VALID.includes(k)).map(k => {
          console.info('[SW] Hapus cache lama:', k);
          return caches.delete(k);
        })
      )
    )
  );
  self.clients.claim();
});

/* ── Fetch: strategi cerdas berdasarkan tipe request ── */
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Lewati: non-GET, analytics, API calls eksternal
  if (request.method !== 'GET') return;
  if (url.hostname.includes('googletagmanager')) return;
  if (url.hostname.includes('google-analytics')) return;
  if (url.hostname.includes('script.google.com')) return;
  if (url.hostname.includes('formspree.io')) return;
  if (url.hostname.includes('api.anthropic.com')) return;

  // Font Google (immutable, cache-first agresif)
  if (url.hostname.includes('fonts.gstatic.com') || url.hostname.includes('fonts.googleapis.com')) {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(request).then(cached =>
          cached || fetch(request).then(res => {
            cache.put(request, res.clone());
            return res;
          })
        )
      ).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // Font Awesome & CDN statis (cache-first)
  if (url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      caches.open(FONT_CACHE).then(cache =>
        cache.match(request).then(cached =>
          cached || fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          }).catch(() => cached || new Response('', { status: 503 }))
        )
      )
    );
    return;
  }

  // Gambar lokal (cache-first, dengan lazy caching)
  if (request.destination === 'image') {
    event.respondWith(
      caches.open(IMG_CACHE).then(cache =>
        cache.match(request).then(cached =>
          cached || fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          }).catch(() => {
            // Offline: kembalikan cached jika ada
            return cached || new Response('', { status: 503 });
          })
        )
      )
    );
    return;
  }

  // Dokumen HTML (network-first, fallback ke cache)
  if (request.destination === 'document' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const cloned = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, cloned));
          return res;
        })
        .catch(() =>
          caches.match(request).then(c => c || caches.match('/'))
        )
    );
    return;
  }

  // CSS & JS (stale-while-revalidate)
  if (request.destination === 'script' || request.destination === 'style') {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(request).then(cached => {
          const fetchPromise = fetch(request).then(res => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Default: network-first dengan fallback cache
  event.respondWith(
    fetch(request)
      .then(res => {
        if (res.ok) {
          const cloned = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, cloned));
        }
        return res;
      })
      .catch(() => caches.match(request))
  );
});
