/**
 * Tama Andrea Studio — Main Script v5.0
 * Premium Design Studio Edition
 * ─────────────────────────────────────────────────────────────
 * Fitur:
 *  - Google Sheets integration (stats & testimonials live)
 *  - AI Assistant (Claude-powered, premium prompt)
 *  - Theme toggle, Navbar, Mobile nav, Smooth scroll
 *  - Counter animation, Portfolio slider, Lightbox
 *  - Contact form with captcha, WA buttons
 *  - PWA Install, Service Worker, Scroll top
 * ─────────────────────────────────────────────────────────────
 */

'use strict';

/* ============================================================
   KONFIGURASI UTAMA
   ============================================================ */
const CONFIG = {
  WA_NUMBER: '6281274852534',
  BRAND:     'Tama Andrea Studio',
  NOTIF_MS:  4000,
  CONSULT_URL: 'https://konsultasidesignbytamaandrea.vercel.app/',

  /* ──────────────────────────────────────────────────────────
     GOOGLE SHEETS — CARA SETUP:
     1. Buka Google Spreadsheet Anda
     2. Buat 2 sheet dengan nama persis: "Stats" dan "Testimoni"

     Sheet "Stats" — format kolom:
       A: nama (contoh: Klien Puas)
       B: nilai (contoh: 87)
       C: suffix (contoh: +)

     Sheet "Testimoni" — format kolom:
       A: nama
       B: asal (contoh: Pemilik UMKM)
       C: pesan
       D: rating (1–5)
       E: layanan (contoh: Logo Design)
       F: inisial (2 huruf, contoh: BS)

     3. File → Share → Publish to web
        → Pilih tab sheet → Pilih format CSV → Klik Publish
     4. Salin URL yang muncul, paste di bawah ini
     ────────────────────────────────────────────────────────── */
  GOOGLE_SHEETS: {
    STATS_CSV_URL: '',     // ← tempel URL CSV sheet "Stats" di sini
    TESTI_CSV_URL: '',     // ← tempel URL CSV sheet "Testimoni" di sini
  },

  /* Prompt AI Assistant — positioning premium, harga range */
  AI_SYSTEM_PROMPT: `Kamu adalah AI Assistant untuk Tama Andrea Studio — studio desain grafis premium milik Tama Andrea.

TENTANG STUDIO:
- Nama: Tama Andrea Studio
- Pemilik: Tama Andrea (desainer grafis kreatif, berdomisili di Lampung Selatan, Indonesia)
- Positioning: Studio desain premium yang mengedepankan kualitas, presisi, dan kepuasan klien
- Penghargaan: Juara 3 Lomba Poster Islami Tingkat Kabupaten (APPM Fosar Lampung Selatan)

LAYANAN & KISARAN HARGA:
- Poster & Flyer Digital: Rp 50.000 – Rp 150.000
- Banner Marketplace: Rp 75.000 – Rp 250.000
- Konten Media Sosial: Rp 60.000 – Rp 200.000 (per konten)
- Logo Profesional: Rp 200.000 – Rp 600.000
- Desain Presentasi: Rp 100.000 – Rp 400.000
- Edit Foto Produk: Rp 50.000 – Rp 200.000
- Harga bersifat fleksibel tergantung kompleksitas, scope, dan deadline proyek

SOFTWARE YANG DIGUNAKAN:
- Canva Pro: mahir (100%)
- Ibis Paint: mahir (100%)
- Adobe Illustrator: berkembang (60%)
- Adobe Photoshop: berkembang (40%)
- Figma: berkembang (20%)

PROSES KERJA:
- Waktu pengerjaan: 1–3 hari kerja (sederhana), 3–7 hari kerja (kompleks)
- Revisi termasuk 2–3 kali, bisa negosiasi untuk paket custom
- Format file: JPG (resolusi tinggi), PNG (transparan), PDF (print-ready)
- File source (.AI/.PSD) tersedia dengan biaya tambahan

KONTAK & LINKS:
- WhatsApp: +62 812-7485-2534
- Konsultasi gratis: https://konsultasidesignbytamaandrea.vercel.app/
- Instagram: @m.andreatama | TikTok: @tamaandrea.id
- Pembayaran: GoPay, DANA, Tunai (QRIS & Bank segera hadir)

CARA MENJAWAB:
- Gunakan Bahasa Indonesia yang ramah, santai, tapi tetap profesional
- Sampaikan harga dalam bentuk rentang, bukan angka pasti
- Tekankan nilai kualitas dan kepuasan, bukan harga murah
- Untuk pemesanan atau konsultasi lebih lanjut, arahkan ke WhatsApp
- Untuk konsultasi desain dan belajar desain, arahkan ke: https://konsultasidesignbytamaandrea.vercel.app/
- Jawab singkat dan to the point (maksimal 3–4 kalimat per jawaban)
- Jangan menjawab pertanyaan di luar topik layanan desain grafis ini`
};

/* ============================================================
   UTILITIES
   ============================================================ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ============================================================
   GOOGLE SHEETS INTEGRATION
   ============================================================ */
const GoogleSheets = {

  /* Parse CSV teks menjadi array of objects */
  parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());

    return lines.slice(1).map(line => {
      // Handle quoted commas dalam CSV
      const values = [];
      let inQuote = false, current = '';
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') { inQuote = !inQuote; }
        else if (ch === ',' && !inQuote) { values.push(current.trim()); current = ''; }
        else { current += ch; }
      }
      values.push(current.trim());

      const obj = {};
      headers.forEach((h, i) => { obj[h] = (values[i] || '').replace(/"/g, '').trim(); });
      return obj;
    }).filter(row => Object.values(row).some(v => v));
  },

  /* Fetch CSV dari Google Sheets (published to web) */
  async fetchCSV(url) {
    if (!url) return null;
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      console.warn('[Sheets] Fetch gagal:', err.message);
      return null;
    }
  },

  /* ── STATS: perbarui angka dari sheet "Stats" ── */
  async loadStats() {
    const url = CONFIG.GOOGLE_SHEETS.STATS_CSV_URL;
    if (!url) return;

    const csv = await this.fetchCSV(url);
    if (!csv) return;

    const rows = this.parseCSV(csv);
    if (!rows.length) return;

    /* Mapping nama kolom ke elemen DOM */
    const keyMap = {
      'klien puas':        'statKlien',
      'klien':             'statKlien',
      'proyek selesai':    'statKarya',
      'karya selesai':     'statKarya',
      'karya':             'statKarya',
      'tahun berkarya':    'statTahun',
      'tahun':             'statTahun',
    };

    rows.forEach(row => {
      const key  = (row['nama'] || row['label'] || '').toLowerCase();
      const val  = parseInt(row['nilai'] || row['value'] || '0', 10);
      const elId = keyMap[key];
      if (!elId || isNaN(val)) return;

      const el = document.getElementById(elId);
      if (!el) return;
      el.dataset.count = val;
      el.textContent   = val;
    });

    /* Re-jalankan counter dengan nilai baru */
    Counter.init();
    console.log('[Sheets] Stats diperbarui dari Google Sheets.');
  },

  /* ── TESTIMONIALS: render dari sheet "Testimoni" ── */
  async loadTestimonials() {
    const url = CONFIG.GOOGLE_SHEETS.TESTI_CSV_URL;
    if (!url) return;

    /* Tampilkan loading */
    const loading = $('#testiLoading');
    const grid    = $('#testiGrid');
    if (loading) loading.hidden = false;
    if (grid) grid.style.opacity = '0.3';

    const csv = await this.fetchCSV(url);

    if (loading) loading.hidden = true;
    if (grid) grid.style.opacity = '1';

    if (!csv) return;

    const rows = this.parseCSV(csv);
    if (!rows.length) return;

    /* Render kartu testimonial */
    const html = rows.map(row => {
      const nama    = this.escape(row['nama']    || 'Anonim');
      const asal    = this.escape(row['asal']    || '');
      const pesan   = this.escape(row['pesan']   || '');
      const rating  = Math.min(5, Math.max(1, parseInt(row['rating'] || '5', 10)));
      const layanan = this.escape(row['layanan'] || '');
      const inisial = this.escape(row['inisial'] || nama.substring(0, 2).toUpperCase());
      const stars   = '★'.repeat(rating) + '☆'.repeat(5 - rating);

      return `
        <article class="testi-card reveal visible">
          <div class="testi-stars">${stars}</div>
          ${layanan ? `<div class="testi-service-tag">${layanan}</div>` : ''}
          <blockquote>"${pesan}"</blockquote>
          <div class="testi-author">
            <div class="ta-avatar">${inisial}</div>
            <div>
              <strong>${nama}</strong>
              <span>${asal}</span>
            </div>
          </div>
        </article>`;
    }).join('');

    if (grid) grid.innerHTML = html;

    /* Perbarui counter "Klien Puas" dari jumlah baris */
    const klienEl = $('#statKlien');
    if (klienEl && rows.length > 0) {
      const current = parseInt(klienEl.dataset.count || '0', 10);
      if (rows.length > current) {
        klienEl.dataset.count = rows.length;
        Counter.animate(klienEl);
      }
    }
    console.log(`[Sheets] ${rows.length} testimoni diperbarui dari Google Sheets.`);
  },

  /* Escape HTML untuk mencegah XSS */
  escape(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  /* Init: panggil keduanya */
  async init() {
    await Promise.allSettled([
      this.loadStats(),
      this.loadTestimonials()
    ]);
  }
};

/* ============================================================
   THEME
   ============================================================ */
const Theme = {
  init() {
    const btn = $('#theme-toggle');
    if (!btn) return;
    const saved = localStorage.getItem('ta-theme') ||
      (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
    this.apply(saved);
    btn.addEventListener('click', () => {
      const current = document.documentElement.dataset.theme;
      this.apply(current === 'dark' ? 'light' : 'dark');
    });
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
    const loader = $('#loader');
    if (!loader) return;
    const hide = () => {
      loader.classList.add('fade-out');
      setTimeout(() => loader.classList.add('gone'), 600);
    };
    if (document.readyState === 'complete') setTimeout(hide, 300);
    else window.addEventListener('load', () => setTimeout(hide, 400));
  }
};

/* ============================================================
   CURSOR GLOW (desktop only)
   ============================================================ */
const Cursor = {
  init() {
    const glow = $('#cursorGlow');
    if (!glow || window.matchMedia('(pointer: coarse)').matches) return;
    let raf;
    document.addEventListener('mousemove', e => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        glow.style.left = e.clientX + 'px';
        glow.style.top  = e.clientY + 'px';
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
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
};

/* ============================================================
   MOBILE NAV
   ============================================================ */
const MobileNav = {
  init() {
    const btn      = $('#hamburger');
    const overlay  = $('#mobileOverlay');
    const nav      = $('#mobile-nav');
    const closeBtn = $('#mobileClose');
    if (!btn || !overlay || !nav) return;

    const open = () => {
      nav.classList.add('open');
      overlay.classList.add('open');
      nav.removeAttribute('aria-hidden');
      btn.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    };
    const close = () => {
      nav.classList.remove('open');
      overlay.classList.remove('open');
      nav.setAttribute('aria-hidden', 'true');
      btn.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    };

    btn.addEventListener('click', open);
    overlay.addEventListener('click', close);
    closeBtn?.addEventListener('click', close);
    $$('.mobile-link, .mobile-cta', nav).forEach(a => a.addEventListener('click', close));
    window.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
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
      const href = a.getAttribute('href');
      if (href === '#') return;
      const target = $(href);
      if (!target) return;
      e.preventDefault();
      const offset = target.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    });
  }
};

/* ============================================================
   SCROLL REVEAL
   ============================================================ */
const Reveal = {
  observer: null,
  init() {
    if (!('IntersectionObserver' in window)) {
      $$('.reveal').forEach(el => el.classList.add('visible'));
      return;
    }
    this.observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          this.observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(el => this.observer.observe(el));
  }
};

/* ============================================================
   COUNTER ANIMATION
   ============================================================ */
const Counter = {
  init() {
    const els = $$('[data-count]');
    if (!els.length) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    els.forEach(el => observer.observe(el));
  },

  animate(el) {
    const target   = parseInt(el.dataset.count, 10);
    if (isNaN(target)) return;
    const duration = 1800;
    const step     = 16;
    const inc      = target / (duration / step);
    let current    = 0;
    const timer    = setInterval(() => {
      current = Math.min(current + inc, target);
      el.textContent = Math.floor(current);
      if (current >= target) clearInterval(timer);
    }, step);
  }
};

/* ============================================================
   PORTFOLIO SLIDER
   ============================================================ */
const Portfolio = {
  track: null,
  dots: null,
  items: [],
  current: 0,
  itemsVisible: 3,
  dragging: false,
  startX: 0,
  scrollX: 0,

  init() {
    this.track = $('#portfolioTrack');
    const dotsWrap = $('#portDots');
    if (!this.track) return;

    this.items = $$('.port-item', this.track);
    if (!this.items.length) return;

    this.calcVisible();
    this.buildDots(dotsWrap);
    this.render();

    $('#portPrev')?.addEventListener('click', () => this.go(this.current - 1));
    $('#portNext')?.addEventListener('click', () => this.go(this.current + 1));

    /* Touch/pointer drag */
    this.track.addEventListener('pointerdown', e => {
      this.dragging = true; this.startX = e.clientX;
      this.track.setPointerCapture(e.pointerId);
    });
    this.track.addEventListener('pointermove', e => {
      if (!this.dragging) return;
      this.scrollX = this.startX - e.clientX;
    });
    this.track.addEventListener('pointerup', () => {
      if (!this.dragging) return;
      this.dragging = false;
      if (this.scrollX > 60)       this.go(this.current + 1);
      else if (this.scrollX < -60) this.go(this.current - 1);
      this.scrollX = 0;
    });

    /* Keyboard nav */
    document.addEventListener('keydown', e => {
      const section = document.getElementById('portfolio');
      if (!section) return;
      const rect = section.getBoundingClientRect();
      if (rect.top > window.innerHeight || rect.bottom < 0) return;
      if (e.key === 'ArrowLeft')  this.go(this.current - 1);
      if (e.key === 'ArrowRight') this.go(this.current + 1);
    });

    window.addEventListener('resize', () => { this.calcVisible(); this.render(); });
  },

  calcVisible() {
    const w = window.innerWidth;
    this.itemsVisible = w < 540 ? 1 : w < 900 ? 2 : 3;
    this.current = Math.min(this.current, this.maxIndex());
  },
  maxIndex() { return Math.max(0, this.items.length - this.itemsVisible); },

  buildDots(wrap) {
    if (!wrap) return;
    this.dots = [];
    wrap.innerHTML = '';
    const count = this.maxIndex() + 1;
    for (let i = 0; i < count; i++) {
      const d = document.createElement('button');
      d.className = 'port-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', `Pergi ke karya ${i + 1}`);
      d.addEventListener('click', () => this.go(i));
      wrap.appendChild(d);
      this.dots.push(d);
    }
  },

  go(idx) {
    this.current = Math.max(0, Math.min(idx, this.maxIndex()));
    this.render();
  },

  render() {
    if (!this.items.length) return;
    const itemW  = this.items[0].offsetWidth + 20;
    const offset = this.current * itemW;
    this.track.style.transform = `translateX(-${offset}px)`;
    this.dots?.forEach((d, i) => d.classList.toggle('active', i === this.current));
  }
};

/* ============================================================
   LIGHTBOX
   ============================================================ */
const Lightbox = {
  init() {
    const box     = $('#lightbox');
    const content = $('#lightboxContent');
    const close   = $('#lightboxClose');
    if (!box) return;

    document.addEventListener('click', e => {
      const btn  = e.target.closest('.port-zoom');
      const item = btn?.closest('.port-item');
      const cred = e.target.closest('.cred-card[data-src]');
      if (!btn && !cred) return;
      const src  = item?.querySelector('img')?.src || cred?.dataset.src;
      if (!src) return;
      content.innerHTML = `<img src="${src}" alt="Preview karya" />`;
      box.classList.add('open');
      box.removeAttribute('aria-hidden');
      document.body.style.overflow = 'hidden';
    });

    const closeBox = () => {
      box.classList.remove('open');
      box.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      setTimeout(() => { content.innerHTML = ''; }, 300);
    };

    close?.addEventListener('click', closeBox);
    box.addEventListener('click', e => { if (e.target === box) closeBox(); });
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && box.classList.contains('open')) closeBox();
    });
  }
};

/* ============================================================
   NOTIFICATION
   ============================================================ */
const Notif = {
  timer: null,
  show(msg, type = 'info') {
    const el = $('#notif');
    if (!el) return;
    el.textContent = msg;
    el.className   = `notif show ${type}`;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => el.classList.remove('show'), CONFIG.NOTIF_MS);
  }
};

/* ============================================================
   WHATSAPP
   ============================================================ */
const WA = {
  send(msg) {
    const url = `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

/* ============================================================
   WA BUTTONS
   ============================================================ */
const WAButtons = {
  init() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.wa-btn, #orderNow, #quickChat, #ctaHero');
      if (!btn) return;
      WA.send(
        `Halo ${CONFIG.BRAND} 👋\n\nSaya ingin konsultasi tentang layanan desain grafis premium Anda.\nBisakah kita diskusi lebih lanjut?`
      );
    });
  }
};

/* ============================================================
   SERVICE CARD CTA
   ============================================================ */
const ServiceCTA = {
  init() {
    document.addEventListener('click', e => {
      const btn  = e.target.closest('.sc-cta');
      if (!btn) return;
      const card = btn.closest('.service-card');
      const name = card?.querySelector('h3')?.textContent || 'desain';
      WA.send(
        `Halo ${CONFIG.BRAND} 👋\n\nSaya tertarik dengan layanan *${name}*.\nBoleh saya tanya lebih detail mengenai harga dan proses pengerjaannya?`
      );
    });
  }
};

/* ============================================================
   CONTACT FORM
   ============================================================ */
const ContactForm = {
  a: 0, b: 0,

  init() {
    const form     = $('#orderForm');
    const captchaQ = $('#captchaQ');
    if (!form || !captchaQ) return;

    this.a = Math.floor(Math.random() * 10) + 1;
    this.b = Math.floor(Math.random() * 10) + 1;
    captchaQ.textContent = `${this.a} + ${this.b}`;

    form.addEventListener('submit', e => this.handleSubmit(e));
  },

  handleSubmit(e) {
    const input = parseInt($('#captcha')?.value, 10);
    const errEl = $('#captchaErr');
    if (input !== this.a + this.b) {
      e.preventDefault();
      if (errEl) errEl.textContent = 'Jawaban captcha salah. Coba lagi!';
      return;
    }
    if (errEl) errEl.textContent = '';
    const btn = $('#submitBtn');
    if (btn) { btn.textContent = 'Mengirim...'; btn.disabled = true; }
    setTimeout(() => {
      Notif.show('Pesan berhasil dikirim! Saya akan segera membalas. 🙌', 'success');
    }, 500);
  }
};

/* ============================================================
   SCROLL TOP
   ============================================================ */
const ScrollTop = {
  init() {
    const btn = $('#scrollTop');
    if (!btn) return;
    const onScroll = () => { btn.hidden = window.scrollY < 300; };
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    onScroll();
  }
};

/* ============================================================
   PWA INSTALL
   ============================================================ */
const PWA = {
  deferredPrompt: null,
  init() {
    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.deferredPrompt = e;
      const wrap = $('#installPWA');
      if (wrap) wrap.hidden = false;
      $('#pwaInstallBtn')?.addEventListener('click', () => this.install());
    });
    window.addEventListener('appinstalled', () => {
      const wrap = $('#installPWA');
      if (wrap) wrap.hidden = true;
      Notif.show('Aplikasi berhasil diinstal! 🎉', 'success');
    });
  },
  install() {
    if (!this.deferredPrompt) return;
    this.deferredPrompt.prompt();
    this.deferredPrompt.userChoice.then(c => {
      if (c.outcome === 'accepted') Notif.show('Terima kasih sudah menginstal! 🙌', 'success');
      this.deferredPrompt = null;
    });
  }
};

/* ============================================================
   YEAR
   ============================================================ */
const Year = {
  init() {
    const el = $('#year');
    if (el) el.textContent = new Date().getFullYear();
  }
};

/* ============================================================
   SERVICE WORKER
   ============================================================ */
const SW = {
  init() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('[SW] Terdaftar:', reg.scope))
          .catch(err => console.warn('[SW] Gagal:', err));
      });
    }
  }
};

/* ============================================================
   TOOL BARS (animate on scroll)
   ============================================================ */
const ToolBars = {
  init() {
    const fills = $$('.tool-fill');
    if (!fills.length) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const fill = el.style.getPropertyValue('--fill') || '0%';
          /* Reset lalu animate */
          el.style.width = '0%';
          requestAnimationFrame(() => {
            setTimeout(() => { el.style.width = fill; }, 50);
          });
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    fills.forEach(el => {
      el.style.width = '0%';
      observer.observe(el);
    });
  }
};

/* ============================================================
   AI ASSISTANT (Claude API-powered)
   ============================================================ */
const AIAssistant = {
  messages: [],
  isLoading: false,

  init() {
    const toggle  = $('#aiToggle');
    const header  = $('.ai-header');
    const body    = $('#aiBody');
    const form    = $('#aiForm');
    const input   = $('#aiInput');
    const chips   = $('#aiChips');
    if (!toggle || !body) return;

    const toggleBody = () => {
      const isOpen = !body.hidden;
      body.hidden  = isOpen;
      toggle.setAttribute('aria-expanded', String(!isOpen));
      toggle.classList.toggle('open', !isOpen);
    };
    toggle.addEventListener('click', toggleBody);
    header.addEventListener('click', e => {
      if (!e.target.closest('button')) toggleBody();
    });

    chips?.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const q = chip.dataset.q;
      if (q && input) { input.value = q; this.send(); }
    });

    form?.addEventListener('submit', e => { e.preventDefault(); this.send(); });
  },

  async send() {
    const input   = $('#aiInput');
    const sendBtn = $('#aiSend');
    const text    = input?.value.trim();
    if (!text || this.isLoading) return;

    this.isLoading = true;
    if (sendBtn) sendBtn.disabled = true;
    if (input)   input.value = '';

    /* Buka panel jika tersembunyi */
    const body = $('#aiBody');
    if (body?.hidden) {
      body.hidden = false;
      $('#aiToggle')?.setAttribute('aria-expanded', 'true');
      $('#aiToggle')?.classList.add('open');
    }

    this.appendMsg(text, 'user');
    this.messages.push({ role: 'user', content: text });
    this.showTyping(true);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 450,
          system:     CONFIG.AI_SYSTEM_PROMPT,
          messages:   this.messages.slice(-10)
        })
      });

      if (!response.ok) throw new Error(`API ${response.status}`);
      const data  = await response.json();
      const reply = data.content?.[0]?.text ||
        'Maaf, saya tidak dapat merespons saat ini. Silakan hubungi via WhatsApp.';

      this.messages.push({ role: 'assistant', content: reply });
      this.showTyping(false);
      this.appendMsg(reply, 'bot');

    } catch (err) {
      console.warn('[AI] Fallback lokal:', err.message);
      this.showTyping(false);
      const fallback = this.localFallback(text);
      this.messages.push({ role: 'assistant', content: fallback });
      this.appendMsg(fallback, 'bot');
    }

    this.isLoading = false;
    if (sendBtn) sendBtn.disabled = false;
    $('#aiInput')?.focus();
  },

  appendMsg(text, type) {
    const wrap = $('#aiMessages');
    if (!wrap) return;
    const div  = document.createElement('div');
    div.className = `ai-msg ${type}`;
    const span = document.createElement('span');
    span.textContent = text;
    div.appendChild(span);
    div.style.cssText = 'opacity:0;transform:translateY(8px)';
    wrap.appendChild(div);
    requestAnimationFrame(() => {
      div.style.transition = 'opacity 0.3s, transform 0.3s';
      div.style.opacity    = '1';
      div.style.transform  = 'translateY(0)';
    });
    wrap.scrollTop = wrap.scrollHeight;
  },

  showTyping(show) {
    const el   = $('#aiTyping');
    if (el) el.hidden = !show;
    const wrap = $('#aiMessages');
    if (wrap) wrap.scrollTop = wrap.scrollHeight;
  },

  /* Fallback offline jika API tidak tersedia */
  localFallback(input) {
    const q = input.toLowerCase();
    if (q.match(/harga|biaya|tarif|berapa|kisaran/))
      return 'Harga layanan kami dalam bentuk rentang tergantung kompleksitas. Poster (Rp 50–150rb), Logo (Rp 200–600rb), Konten Sosial (Rp 60–200rb). Untuk estimasi tepat sesuai kebutuhan Anda, langsung chat WA ya! 😊';
    if (q.match(/waktu|lama|deadline|cepat|hari/))
      return 'Pengerjaan 1–3 hari kerja untuk desain sederhana, 3–7 hari untuk yang kompleks. Ada layanan ekspres jika Anda punya deadline mendesak — beritahu di awal ya!';
    if (q.match(/revisi/))
      return 'Revisi 2–3x sudah termasuk dalam paket standar. Jika butuh lebih atau perubahan mayor, bisa diatur lewat paket custom. Kepuasan Anda adalah prioritas utama! 🙌';
    if (q.match(/software|aplikasi|tools|program/))
      return 'Saat ini mahir di Canva Pro & Ibis Paint (100%). Sedang mengembangkan kemampuan di Adobe Illustrator (60%), Photoshop (40%), dan Figma (20%) untuk layanan yang makin lengkap!';
    if (q.match(/format|file|ekstensi/))
      return 'File dikirim dalam JPG (resolusi tinggi), PNG (background transparan), atau PDF (print-ready). File source (.AI/.PSD) tersedia dengan biaya tambahan.';
    if (q.match(/pesan|order|cara|proses/))
      return 'Mudah! Chat WA +62 812-7485-2534 atau isi form di halaman ini. Setelah diskusi konsep & sepakat harga, bayar, dan pengerjaan langsung dimulai! 🎨';
    if (q.match(/bayar|pembayaran|gopay|dana|transfer/))
      return 'Bisa bayar via GoPay, DANA, atau Tunai. QRIS & Transfer Bank akan segera hadir. Konfirmasi pembayaran agar langsung diproses!';
    if (q.match(/konsultasi|konsul|belajar|learn/))
      return `Tersedia konsultasi desain gratis! Kunjungi ${CONFIG.CONSULT_URL} untuk berdiskusi tentang kebutuhan visual bisnis Anda atau belajar desain bersama kami. 💡`;
    if (q.match(/logo/))
      return 'Layanan Logo Profesional kami dengan kisaran Rp 200.000–600.000 — mencakup konsep awal, revisi, dan file final siap pakai. Logo adalah wajah brand Anda, jadi kami kerjakan dengan serius!';
    if (q.match(/kontak|hubungi|wa|whatsapp/))
      return 'Bisa langsung WA ke +62 812-7485-2534 atau klik tombol Chat WhatsApp di halaman ini. Saya biasanya merespons cepat di jam aktif! 📱';
    return 'Pertanyaan menarik! Untuk jawaban lebih detail dan estimasi sesuai kebutuhan spesifik Anda, langsung chat WhatsApp di +62 812-7485-2534 ya. Saya siap membantu! 😊';
  }
};

/* ============================================================
   PARTNERS AUTO-SCROLL
   ============================================================ */
const Partners = {
  init() {
    const track = $('#partnersTrack');
    if (!track) return;
    /* Animasi dihandle CSS, hanya pastikan elemen ada */
  }
};

/* ============================================================
   BOOTSTRAP — panggil semua modul
   ============================================================ */
async function boot() {
  /* Sync inits */
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
  ScrollTop.init();
  PWA.init();
  Year.init();
  SW.init();
  AIAssistant.init();
  ToolBars.init();
  Partners.init();

  /* Async: Google Sheets (non-blocking) */
  GoogleSheets.init().catch(err => console.warn('[Sheets]', err));

  console.log(`✦ ${CONFIG.BRAND} v5.0 — Studio Desain Premium · Siap!`);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
