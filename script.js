/**
 * Tama Andrea Studio — script.js v5.1
 * Ocean Blue Premium Edition
 * ─────────────────────────────────────────────────
 * Google Apps Script URL terhubung langsung ke
 * database pesanan (Google Sheets).
 * ─────────────────────────────────────────────────
 */
'use strict';

/* ============================================================
   KONFIGURASI
   ============================================================ */
const CONFIG = {
  WA_NUMBER:   '6281274852534',
  BRAND:       'Tama Andrea Studio',
  NOTIF_MS:    4000,
  CONSULT_URL: 'https://konsultasidesignbytamaandrea.vercel.app/',

  /**
   * ── Google Apps Script URL ──
   * URL ini terhubung ke spreadsheet database pesanan Anda.
   * Endpoint yang didukung:
   *   GET /exec               → data dashboard (stats)
   *   GET /exec?action=track&id=ORD-0001 → status pesanan spesifik
   */
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycby0_tdaozPTM0IvGRkxVdqRi4GD2kJtgm-f6j7cKslqseq9nB54uiYjogZfXq2yDKL40w/exec',

  AI_SYSTEM_PROMPT: `Kamu adalah AI Assistant untuk Tama Andrea Studio — studio desain grafis premium milik Tama Andrea.

TENTANG STUDIO:
- Nama: Tama Andrea Studio | Pemilik: Tama Andrea (Lampung Selatan, Indonesia)
- Positioning: Studio desain premium — kualitas, presisi, dan kepuasan klien di atas segalanya
- Penghargaan: Juara 3 Lomba Poster Islami Tingkat Kabupaten (APPM Fosar Lampung Selatan)

LAYANAN & KISARAN HARGA:
- Poster & Flyer Digital : Rp 50.000 – Rp 150.000
- Banner Marketplace      : Rp 75.000 – Rp 250.000
- Konten Media Sosial     : Rp 60.000 – Rp 200.000 (per konten)
- Logo Profesional        : Rp 200.000 – Rp 600.000
- Desain Presentasi       : Rp 100.000 – Rp 400.000
- Edit Foto Produk        : Rp 50.000 – Rp 200.000
Harga fleksibel tergantung kompleksitas dan scope proyek.

SOFTWARE: Canva Pro 100% | Ibis Paint 100% | Adobe Illustrator 60% | Photoshop 40% | Figma 20%

PROSES: 1–3 hari (sederhana) · 3–7 hari (kompleks) · 2–3x revisi termasuk
FORMAT: JPG, PNG, PDF — file source dengan biaya tambahan
BAYAR: GoPay · DANA · Tunai (QRIS & Transfer segera hadir)
KONTAK: WA +62 812-7485-2534 | IG @m.andreatama | TikTok @tamaandrea.id
KONSULTASI GRATIS: https://konsultasidesignbytamaandrea.vercel.app/

CARA MENJAWAB:
- Bahasa Indonesia ramah, santai, profesional (maks 3–4 kalimat)
- Harga selalu dalam bentuk rentang, bukan angka pasti
- Tekankan kualitas, bukan murah
- Arahkan ke WA untuk order, ke konsultasi URL untuk diskusi desain
- Jangan jawab di luar topik studio ini`
};

/* ============================================================
   UTILITIES
   ============================================================ */
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ============================================================
   APPS SCRIPT — Pengambilan data live dari Google Sheets
   ============================================================ */
const AppsScript = {

  /**
   * Fetch data dari Apps Script URL.
   * Menangani redirect Google (script.google.com → googleusercontent.com)
   * dan berbagai format respons (JSON object / JSON array / HTML fallback).
   */
  async fetch(params = {}) {
    try {
      const url = new URL(CONFIG.APPS_SCRIPT_URL);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

      const res  = await fetch(url.toString(), { redirect: 'follow' });
      const text = await res.text();

      // Coba parse JSON
      try {
        return JSON.parse(text);
      } catch {
        // Bukan JSON — kemungkinan HTML (Apps Script belum dikonfigurasi untuk JSON)
        console.warn('[AppsScript] Respons bukan JSON. Pastikan doGet() mengembalikan ContentService JSON.');
        return null;
      }
    } catch (err) {
      console.warn('[AppsScript] Fetch error:', err.message);
      return null;
    }
  },

  /**
   * Parse berbagai format respons Apps Script menjadi objek stats standar.
   * Mendukung:
   *  - { status:'ok', data: { totalPesanan, pending, proses, selesai, … } }
   *  - { status:'ok', rows: [[...],[...]] }   ← 2D array sheet rows
   *  - Array langsung: [[...],[...]]
   */
  parseStats(raw) {
    if (!raw) return null;

    // Format 1 — objek terstruktur (ideal)
    if (raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
      const d = raw.data;
      return {
        total:   parseInt(d.totalPesanan || d.total || 0),
        pending: parseInt(d.pending || 0),
        proses:  parseInt(d.proses  || 0),
        review:  parseInt(d.review  || 0),
        selesai: parseInt(d.selesai || 0),
      };
    }

    // Format 2 — 2D array (raw sheet values)
    const rows = raw.rows || raw.values || (Array.isArray(raw) ? raw : null);
    if (rows && Array.isArray(rows)) {
      // Cari baris yang mengandung "Total Pesanan" atau angka di posisi ke-1
      for (const row of rows) {
        if (String(row[0]).toLowerCase().includes('total pesanan') ||
            String(row[0]).toLowerCase().includes('total')) {
          return {
            total:   parseInt(row[1] || 0),
            pending: parseInt(row[3] || 0),
            proses:  parseInt(row[5] || 0),
            review:  parseInt(row[7] || 0),
            selesai: parseInt(row[9] || 0),
          };
        }
      }
    }
    return null;
  },

  /**
   * Parse respons order untuk tracker.
   * Mendukung { order: {...} } atau baris dari 2D array yang cocok.
   */
  parseOrder(raw, id) {
    if (!raw) return null;

    // Format ideal — Apps Script mengembalikan object order
    if (raw.order) return raw.order;
    if (raw.data  && raw.data.id) return raw.data;

    // Format 2D array — cari baris dengan ID yang cocok
    const rows = raw.rows || raw.values || (Array.isArray(raw) ? raw : null);
    if (rows && Array.isArray(rows)) {
      // Temukan header row
      let headers = [];
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][0]).toLowerCase().includes('id pesanan')) {
          headers = rows[i].map(h => String(h).toLowerCase().trim());
          // Cari baris data yang cocok
          for (let j = i + 1; j < rows.length; j++) {
            if (String(rows[j][0]).toUpperCase() === id.toUpperCase()) {
              const obj = {};
              headers.forEach((h, k) => { obj[h] = rows[j][k] || ''; });
              return this._normalizeOrder(obj);
            }
          }
        }
      }
    }
    return null;
  },

  _normalizeOrder(obj) {
    // Normalisasi key dari berbagai nama kolom
    const get = (...keys) => {
      for (const k of keys) {
        const v = obj[k] || obj[k.toLowerCase()] || obj[k.replace(/ /g,'_')] || '';
        if (v) return String(v);
      }
      return '—';
    };
    return {
      id:          get('id pesanan', 'id'),
      layanan:     get('kategori layanan', 'layanan', 'kategori'),
      tenggat:     get('tenggat waktu', 'tenggat', 'deadline'),
      status:      get('status'),
      statusBayar: get('status pembayaran', 'pembayaran'),
      revisi:      get('jumlah revisi', 'revisi', '0'),
      hariTersisa: get('hari tersisa', 'hari'),
      prioritas:   get('prioritas deadline', 'prioritas'),
      biaya:       get('estimasi biaya', 'biaya'),
    };
  }
};

/* ============================================================
   LIVE STATS — Hero card stats dari Apps Script
   ============================================================ */
const LiveStats = {
  async init() {
    const raw   = await AppsScript.fetch();
    const stats = AppsScript.parseStats(raw);
    if (!stats) return;

    // Update hero stats
    const map = {
      statKlien: stats.selesai   || stats.total,
      statKarya: stats.total,
    };
    Object.entries(map).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el && val > 0) {
        el.dataset.count = val;
        Counter.animate(el);
      }
    });

    // Update availability badge
    const aktif = (stats.pending || 0) + (stats.proses || 0);
    this.updateBadge(aktif);

    console.log('[LiveStats] Stats diperbarui:', stats);
  },

  updateBadge(aktif) {
    const badge = document.getElementById('availBadge');
    const dot   = document.querySelector('.badge-dot');
    if (!badge) return;

    if (aktif >= 5) {
      badge.className = 'busy';
      badge.innerHTML = '⏳ Antrian Penuh';
      if (dot) { dot.style.background = '#CA8A04'; dot.style.boxShadow = '0 0 8px #CA8A04'; }
    } else {
      badge.className = 'open';
      badge.innerHTML = '✦ Terbuka untuk Proyek';
      if (dot) { dot.style.background = 'var(--green)'; dot.style.boxShadow = '0 0 8px var(--green)'; }
    }
    badge.style.display = 'flex';
  }
};

/* ============================================================
   ORDER TRACKER — Cek status pesanan by ID
   ============================================================ */
const OrderTracker = {
  init() {
    const btn   = $('#trackBtn');
    const input = $('#trackInput');
    if (!btn || !input) return;
    btn.addEventListener('click',   () => this.track());
    input.addEventListener('keydown', e => { if (e.key === 'Enter') this.track(); });
  },

  async track() {
    const input = $('#trackInput');
    const raw   = (input?.value || '').trim().toUpperCase().replace(/^ORD-?/, '');
    if (!raw) { Notif.show('Masukkan nomor pesanan terlebih dahulu.', 'error'); return; }

    const id = `ORD-${raw.padStart(4, '0')}`;
    this.setState('loading');

    // Coba fetch dengan action=track
    const data  = await AppsScript.fetch({ action: 'track', id });
    const order = AppsScript.parseOrder(data, id);

    if (order && order.id && order.id !== '—') {
      this.showResult(order);
    } else {
      // Coba fetch semua data dan cari client-side
      const allData  = await AppsScript.fetch({ action: 'getAll' });
      const allOrder = AppsScript.parseOrder(allData, id);
      if (allOrder && allOrder.id && allOrder.id !== '—') {
        this.showResult(allOrder);
      } else {
        this.setState('error', id);
      }
    }
  },

  showResult(o) {
    const el = $('#trackResult');
    if (!el) return;

    const statusClass = {
      'pending':   'status-pending',
      'proses':    'status-proses',
      'review':    'status-review',
      'selesai':   'status-selesai',
      'terlambat': 'status-terlambat',
    }[o.status?.toLowerCase()] || 'status-pending';

    const statusEmoji = {
      'pending': '⏳', 'proses': '🎨', 'review': '🔍',
      'selesai': '✅', 'terlambat': '⚠️',
    }[o.status?.toLowerCase()] || '📋';

    const hari      = parseInt(o.hariTersisa) || 0;
    const deadClass = hari < 0 ? 'order-deadline-urgent' :
                      hari <= 2 ? 'order-deadline-soon' : 'order-deadline-safe';
    const deadLabel = hari < 0  ? `${Math.abs(hari)} hari terlambat` :
                      hari === 0 ? 'Hari ini!' :
                      hari === 1 ? 'Besok' : `${hari} hari lagi`;

    el.innerHTML = `
      <div class="order-result-card">
        <div class="order-result-header">
          <span class="order-result-id">${this.esc(o.id)}</span>
          <span class="order-status-badge ${statusClass}">${statusEmoji} ${this.esc(o.status)}</span>
        </div>
        <div class="order-result-body">
          <div class="order-detail-grid">
            <div class="order-detail-item">
              <span class="order-detail-label"><i class="fas fa-paint-brush"></i> Layanan</span>
              <span class="order-detail-value">${this.esc(o.layanan)}</span>
            </div>
            <div class="order-detail-item">
              <span class="order-detail-label"><i class="fas fa-calendar-alt"></i> Tenggat</span>
              <span class="order-detail-value ${deadClass}">${this.esc(o.tenggat)} · ${deadLabel}</span>
            </div>
            <div class="order-detail-item">
              <span class="order-detail-label"><i class="fas fa-credit-card"></i> Pembayaran</span>
              <span class="order-detail-value">${this.esc(o.statusBayar)}</span>
            </div>
            <div class="order-detail-item">
              <span class="order-detail-label"><i class="fas fa-redo-alt"></i> Revisi Digunakan</span>
              <span class="order-detail-value">${this.esc(o.revisi)}x</span>
            </div>
            ${o.biaya && o.biaya !== '—' ? `
            <div class="order-detail-item">
              <span class="order-detail-label"><i class="fas fa-tag"></i> Estimasi Biaya</span>
              <span class="order-detail-value">${this.esc(o.biaya)}</span>
            </div>` : ''}
            ${o.prioritas && o.prioritas !== '—' ? `
            <div class="order-detail-item">
              <span class="order-detail-label"><i class="fas fa-flag"></i> Prioritas</span>
              <span class="order-detail-value">${this.esc(o.prioritas)}</span>
            </div>` : ''}
          </div>
        </div>
        <div class="order-result-footer">
          <p>Ada pertanyaan tentang pesanan ini?</p>
          <a href="https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(`Halo, saya ingin tanya tentang pesanan ${o.id}`)}"
             target="_blank" rel="noopener" class="btn-primary" style="padding:0.5rem 1rem;font-size:0.85rem">
            <i class="fab fa-whatsapp"></i> Chat WA
          </a>
        </div>
      </div>`;
    el.hidden = false;
    $('#trackLoading').hidden = true;
    $('#trackError').hidden   = true;
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  setState(state, id = '') {
    const loading = $('#trackLoading');
    const result  = $('#trackResult');
    const errEl   = $('#trackError');
    if (loading) loading.hidden = state !== 'loading';
    if (result)  result.hidden  = true;
    if (errEl) {
      errEl.hidden = state !== 'error';
      if (state === 'error') {
        errEl.innerHTML = `
          <div class="tracker-error-box">
            <p>Pesanan <strong>${id}</strong> tidak ditemukan. Pastikan ID pesanan benar.</p>
            <a href="https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(`Halo, saya ingin cek status pesanan ${id}`)}"
               target="_blank" rel="noopener" class="btn-ghost" style="font-size:0.85rem;padding:0.5rem 1rem">
              <i class="fab fa-whatsapp"></i> Tanya via WA
            </a>
          </div>`;
      }
    }
  },

  esc(str) {
    return String(str || '')
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};

/* ============================================================
   THEME
   ============================================================ */
const Theme = {
  init() {
    const btn   = $('#theme-toggle');
    if (!btn) return;
    const saved = localStorage.getItem('ta-theme') ||
      (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    this.apply(saved);
    btn.addEventListener('click', () =>
      this.apply(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  },
  apply(mode) {
    document.documentElement.dataset.theme = mode;
    localStorage.setItem('ta-theme', mode);
  }
};

/* ============================================================
   LOADER
   ============================================================ */
const Loader = {
  init() {
    const el  = $('#loader');
    if (!el) return;
    const hide = () => {
      el.classList.add('fade-out');
      setTimeout(() => el.classList.add('gone'), 600);
    };
    document.readyState === 'complete' ? setTimeout(hide, 300)
      : window.addEventListener('load', () => setTimeout(hide, 400));
  }
};

/* ============================================================
   CURSOR GLOW
   ============================================================ */
const Cursor = {
  init() {
    const g = $('#cursorGlow');
    if (!g || window.matchMedia('(pointer:coarse)').matches) return;
    let raf;
    document.addEventListener('mousemove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        g.style.left = e.clientX + 'px';
        g.style.top  = e.clientY + 'px';
      });
    });
  }
};

/* ============================================================
   NAVBAR
   ============================================================ */
const Navbar = {
  init() {
    const nav = $('#navbar');
    if (!nav) return;
    const fn = () => nav.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', fn, { passive: true });
    fn();
  }
};

/* ============================================================
   MOBILE NAV
   ============================================================ */
const MobileNav = {
  init() {
    const btn = $('#hamburger'), overlay = $('#mobileOverlay'),
          nav = $('#mobile-nav'), close   = $('#mobileClose');
    if (!btn || !overlay || !nav) return;
    const open = () => {
      nav.classList.add('open'); overlay.classList.add('open');
      nav.removeAttribute('aria-hidden'); btn.setAttribute('aria-expanded','true');
      document.body.style.overflow = 'hidden';
    };
    const shut = () => {
      nav.classList.remove('open'); overlay.classList.remove('open');
      nav.setAttribute('aria-hidden','true'); btn.setAttribute('aria-expanded','false');
      document.body.style.overflow = '';
    };
    btn.addEventListener('click', open);
    overlay.addEventListener('click', shut);
    close?.addEventListener('click', shut);
    $$('.mobile-link, .mobile-cta', nav).forEach(a => a.addEventListener('click', shut));
    window.addEventListener('keydown', e => { if (e.key === 'Escape') shut(); });
  }
};

/* ============================================================
   SMOOTH SCROLL
   ============================================================ */
const SmoothScroll = {
  init() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const t = $(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    });
  }
};

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
const Reveal = {
  init() {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach(el => el.classList.add('visible')); return;
    }
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(el => obs.observe(el));
  }
};

/* ============================================================
   COUNTER ANIMATION
   ============================================================ */
const Counter = {
  init() {
    if (!('IntersectionObserver' in window)) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { this.animate(e.target); obs.unobserve(e.target); } });
    }, { threshold: 0.5 });
    $$('[data-count]').forEach(el => obs.observe(el));
  },
  animate(el) {
    const target = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    const step = Math.ceil(target / 60);
    let cur = 0;
    const t = setInterval(() => {
      cur = Math.min(cur + step, target);
      el.textContent = cur;
      if (cur >= target) clearInterval(t);
    }, 22);
  }
};

/* ============================================================
   PORTFOLIO SLIDER
   ============================================================ */
const Portfolio = {
  track: null, items: [], dots: [], cur: 0,

  init() {
    this.track = $('#portfolioTrack');
    if (!this.track) return;
    this.items = $$('.port-item', this.track);
    if (!this.items.length) return;
    this.buildDots($('#portDots'));
    this.go(0);
    $('#portPrev')?.addEventListener('click', () => this.go(this.cur - 1));
    $('#portNext')?.addEventListener('click', () => this.go(this.cur + 1));

    // Touch drag
    let sx = 0, drag = false;
    this.track.addEventListener('pointerdown', e => { drag = true; sx = e.clientX; this.track.setPointerCapture(e.pointerId); });
    this.track.addEventListener('pointerup',   e => { if (!drag) return; drag = false; const dx = sx - e.clientX; if (Math.abs(dx) > 50) this.go(this.cur + (dx > 0 ? 1 : -1)); });

    window.addEventListener('resize', () => this.go(this.cur));
  },

  visible() { return window.innerWidth < 540 ? 1 : window.innerWidth < 900 ? 2 : 3; },
  max()     { return Math.max(0, this.items.length - this.visible()); },

  buildDots(wrap) {
    if (!wrap) return;
    wrap.innerHTML = '';
    this.dots = [];
    for (let i = 0; i <= this.max(); i++) {
      const d = document.createElement('button');
      d.className = 'port-dot'; d.setAttribute('aria-label', `Karya ${i+1}`);
      d.addEventListener('click', () => this.go(i));
      wrap.appendChild(d); this.dots.push(d);
    }
  },

  go(idx) {
    this.cur = Math.max(0, Math.min(idx, this.max()));
    const w  = this.items[0] ? this.items[0].offsetWidth + 20 : 0;
    this.track.style.transform = `translateX(-${this.cur * w}px)`;
    this.dots.forEach((d, i) => d.classList.toggle('active', i === this.cur));
  }
};

/* ============================================================
   LIGHTBOX
   ============================================================ */
const Lightbox = {
  init() {
    const box = $('#lightbox'), cnt = $('#lightboxContent'), cls = $('#lightboxClose');
    if (!box) return;
    const open = src => {
      cnt.innerHTML = `<img src="${src}" alt="Preview" />`;
      box.classList.add('open'); box.removeAttribute('aria-hidden');
      document.body.style.overflow = 'hidden';
    };
    const shut = () => {
      box.classList.remove('open'); box.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
      setTimeout(() => { cnt.innerHTML = ''; }, 300);
    };
    document.addEventListener('click', e => {
      const btn  = e.target.closest('.port-zoom');
      const cred = e.target.closest('.cred-card[data-src]');
      if (btn)  open(btn.closest('.port-item')?.querySelector('img')?.src);
      if (cred) open(cred.dataset.src);
    });
    cls?.addEventListener('click', shut);
    box.addEventListener('click', e => { if (e.target === box) shut(); });
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('open')) shut(); });
  }
};

/* ============================================================
   NOTIFICATION
   ============================================================ */
const Notif = {
  t: null,
  show(msg, type = 'info') {
    const el = $('#notif'); if (!el) return;
    el.textContent = msg; el.className = `notif show ${type}`;
    clearTimeout(this.t);
    this.t = setTimeout(() => el.classList.remove('show'), CONFIG.NOTIF_MS);
  }
};

/* ============================================================
   WA BUTTONS
   ============================================================ */
const WA = {
  send: (msg) => window.open(`https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer')
};

const WAButtons = {
  init() {
    document.addEventListener('click', e => {
      if (!e.target.closest('.wa-btn, #orderNow, #quickChat, #ctaHero')) return;
      WA.send(`Halo ${CONFIG.BRAND} 👋\n\nSaya ingin konsultasi tentang layanan desain grafis premium Anda.\nBoleh diskusi lebih lanjut?`);
    });
  }
};

const ServiceCTA = {
  init() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.sc-cta'); if (!btn) return;
      const nama = btn.closest('.service-card')?.querySelector('h3')?.textContent || 'desain';
      WA.send(`Halo ${CONFIG.BRAND} 👋\n\nSaya tertarik dengan layanan *${nama}*.\nBoleh info lebih detail harga dan prosesnya?`);
    });
  }
};

/* ============================================================
   CONTACT FORM
   ============================================================ */
const ContactForm = {
  a: 0, b: 0,
  init() {
    const form = $('#orderForm'), q = $('#captchaQ');
    if (!form || !q) return;
    this.a = Math.floor(Math.random() * 10) + 1;
    this.b = Math.floor(Math.random() * 10) + 1;
    q.textContent = `${this.a} + ${this.b}`;
    form.addEventListener('submit', e => {
      if (parseInt($('#captcha')?.value) !== this.a + this.b) {
        e.preventDefault();
        const err = $('#captchaErr'); if (err) err.textContent = 'Jawaban salah, coba lagi!';
        return;
      }
      const btn = $('#submitBtn');
      if (btn) { btn.textContent = 'Mengirim…'; btn.disabled = true; }
      setTimeout(() => Notif.show('Pesan terkirim! Akan segera dibalas. 🙌', 'success'), 500);
    });
  }
};

/* ============================================================
   TOOL BARS
   ============================================================ */
const ToolBars = {
  init() {
    const fills = $$('.tool-fill'); if (!fills.length) return;
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target, fill = el.style.getPropertyValue('--fill');
        el.style.width = '0%';
        requestAnimationFrame(() => setTimeout(() => { el.style.width = fill; }, 50));
        obs.unobserve(el);
      });
    }, { threshold: 0.5 });
    fills.forEach(el => { el.style.width = '0%'; obs.observe(el); });
  }
};

/* ============================================================
   SCROLL TOP
   ============================================================ */
const ScrollTop = {
  init() {
    const btn = $('#scrollTop'); if (!btn) return;
    window.addEventListener('scroll', () => { btn.hidden = window.scrollY < 300; }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
};

/* ============================================================
   PWA
   ============================================================ */
const PWA = {
  deferredPrompt: null,
  init() {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault(); this.deferredPrompt = e;
      const w = $('#installPWA'); if (w) w.hidden = false;
      $('#pwaInstallBtn')?.addEventListener('click', () => this.install());
    });
  },
  install() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then(() => { this.deferredPrompt = null; });
  }
};

/* ============================================================
   AI ASSISTANT
   ============================================================ */
const AI = {
  msgs: [], busy: false,

  init() {
    const toggle = $('#aiToggle'), body = $('#aiBody');
    if (!toggle || !body) return;

    const flip = () => {
      body.hidden = !body.hidden;
      toggle.setAttribute('aria-expanded', String(!body.hidden));
      toggle.classList.toggle('open', !body.hidden);
    };
    toggle.addEventListener('click', flip);
    $('.ai-header')?.addEventListener('click', e => { if (!e.target.closest('button')) flip(); });

    $('#aiChips')?.addEventListener('click', e => {
      const c = e.target.closest('.chip'); if (!c) return;
      const inp = $('#aiInput'); if (inp) inp.value = c.dataset.q || '';
      this.send();
    });
    $('#aiForm')?.addEventListener('submit', e => { e.preventDefault(); this.send(); });
  },

  async send() {
    const inp = $('#aiInput'), sendBtn = $('#aiSend');
    const txt = inp?.value.trim(); if (!txt || this.busy) return;
    this.busy = true; if (sendBtn) sendBtn.disabled = true;
    if (inp) inp.value = '';
    const body = $('#aiBody');
    if (body?.hidden) { body.hidden = false; $('#aiToggle')?.classList.add('open'); }
    this.append(txt, 'user');
    this.msgs.push({ role: 'user', content: txt });
    this.typing(true);

    try {
      const res  = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 450, system: CONFIG.AI_SYSTEM_PROMPT, messages: this.msgs.slice(-10) })
      });
      const data  = await res.json();
      const reply = data.content?.[0]?.text || 'Maaf, coba lagi ya atau hubungi via WhatsApp.';
      this.msgs.push({ role: 'assistant', content: reply });
      this.typing(false); this.append(reply, 'bot');
    } catch {
      this.typing(false);
      const fb = this.fallback(txt);
      this.msgs.push({ role: 'assistant', content: fb });
      this.append(fb, 'bot');
    }
    this.busy = false; if (sendBtn) sendBtn.disabled = false;
  },

  append(txt, role) {
    const wrap = $('#aiMessages'); if (!wrap) return;
    const div = document.createElement('div'); div.className = `ai-msg ${role}`;
    const sp  = document.createElement('span'); sp.textContent = txt;
    div.appendChild(sp);
    div.style.cssText = 'opacity:0;transform:translateY(8px)';
    wrap.appendChild(div);
    requestAnimationFrame(() => { div.style.transition = 'opacity .3s,transform .3s'; div.style.opacity = '1'; div.style.transform = 'none'; });
    wrap.scrollTop = wrap.scrollHeight;
  },

  typing(show) {
    const el = $('#aiTyping'); if (el) el.hidden = !show;
    const w  = $('#aiMessages'); if (w) w.scrollTop = w.scrollHeight;
  },

  fallback(q) {
    q = q.toLowerCase();
    if (q.match(/harga|biaya|tarif|berapa/))   return 'Harga kami dalam rentang fleksibel: Poster (Rp 50–150rb), Logo (Rp 200–600rb), Konten Sosial (Rp 60–200rb). Chat WA untuk estimasi tepat ya! 😊';
    if (q.match(/lama|waktu|deadline|hari/))   return 'Pengerjaan 1–3 hari (sederhana) atau 3–7 hari (kompleks). Ada layanan ekspres — beritahu di awal!';
    if (q.match(/revisi/))                     return 'Revisi 2–3x sudah termasuk di paket standar. Perubahan mayor bisa diatur via paket custom.';
    if (q.match(/software|tools|pakai/))       return 'Canva Pro & Ibis Paint (mahir 100%), Adobe Illustrator (60%), Photoshop (40%), Figma (20%).';
    if (q.match(/konsultasi|belajar/))         return `Konsultasi desain gratis di: ${CONFIG.CONSULT_URL} 💡`;
    if (q.match(/bayar|gopay|dana/))           return 'Bisa via GoPay, DANA, atau Tunai. QRIS & Transfer Bank segera hadir!';
    if (q.match(/pesan|order|cara/))           return 'Mudah! Chat WA +62 812-7485-2534 atau isi form kontak. Diskusi → sepakat → bayar → dikerjakan! 🎨';
    if (q.match(/cek|status|pesanan|lacak/))   return 'Gunakan fitur "Cek Status Pesanan" di halaman ini dengan memasukkan ID Pesanan (ORD-XXXX) kamu! 🔍';
    return 'Pertanyaan bagus! Untuk jawaban lebih detail, langsung chat WA +62 812-7485-2534 ya. Siap membantu! 😊';
  }
};

/* ============================================================
   SERVICE WORKER
   ============================================================ */
const SW = {
  init() {
    if ('serviceWorker' in navigator)
      window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
  }
};

/* ============================================================
   BOOT
   ============================================================ */
async function boot() {
  Theme.init();
  Loader.init();
  Cursor.init();
  Navbar.init();
  MobileNav.init();
  SmoothScroll.init();
  Reveal.init();
  Counter.init();
  Portfolio.init();
  Lightbox.init();
  WAButtons.init();
  ServiceCTA.init();
  ContactForm.init();
  ToolBars.init();
  ScrollTop.init();
  PWA.init();
  AI.init();
  OrderTracker.init();
  SW.init();

  const yearEl = $('#year'); if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Live stats dari Apps Script (non-blocking)
  LiveStats.init().catch(err => console.warn('[LiveStats]', err));

  console.log(`✦ ${CONFIG.BRAND} v5.1 — Ocean Blue Edition · Siap!`);
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', boot)
  : boot();
