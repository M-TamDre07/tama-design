/**
 * Tama Andrea Studio — Main Script v5.0 (Premium)
 * Features: Theme, Nav, Animations, Portfolio Slider,
 *           Counter, Google Sheets Live Sync, PWA Install,
 *           AI Assistant, Form, Lightbox, Scroll
 */

'use strict';

/* ============================================================
   CONFIGURATION — Edit to fit your setup
   ============================================================ */
const CONFIG = {
  WA_NUMBER:    '6281274852534',
  BRAND:        'Tama Andrea Studio',
  NOTIF_MS:     4000,

  /**
   * GOOGLE SHEETS INTEGRATION
   * ─────────────────────────
   * CARA SETUP (5 menit):
   *
   * 1. Buat Google Sheets baru dengan 3 kolom:
   *    A1: total_klien | B1: total_ulasan | C1: rata_rating
   *    A2: 52          | B2: 47           | C2: 4.9
   *
   * 2. Tambahkan sheet kedua bernama "ulasan" dengan kolom:
   *    A: nama | B: jabatan | C: isi_ulasan | D: rating (1-5)
   *
   * 3. File → Publish to web → Sheet1 → CSV → Publish
   *    Salin URL. Ganti /pub?... menjadi /gviz/tq?tqx=out:csv&sheet=Sheet1
   *
   * 4. Tempel URL di SHEETS_CSV_URL di bawah.
   *    Untuk tab ulasan, ganti sheet=Sheet1 → sheet=ulasan
   *
   * 5. Tidak perlu API key! Gratis & otomatis update.
   */
  SHEETS_CSV_URL: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/gviz/tq?tqx=out:csv&sheet=Sheet1',
  SHEETS_REVIEWS_URL: 'https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/gviz/tq?tqx=out:csv&sheet=ulasan',
  SHEETS_ENABLED: false, // Set true setelah setup Sheet

  AI_SYSTEM_PROMPT: `Kamu adalah AI Assistant premium untuk Tama Andrea Studio — jasa desain grafis profesional milik Tama Andrea.

TENTANG BISNIS:
- Nama: Tama Andrea Studio
- Pemilik: Tama Andrea (berbasis di Lampung Selatan, Indonesia)
- Layanan Premium: Poster & Flyer Digital, Banner Marketplace, Konten Media Sosial, Logo & Brand Identity, Desain Presentasi, Edit Foto Produk
- Harga (price range kelas menengah-atas):
  * Poster & Flyer Digital: Rp 75.000 – 250.000
  * Banner Marketplace: Rp 100.000 – 300.000
  * Konten Media Sosial: Rp 75.000 – 350.000 per paket
  * Logo & Brand Identity: Rp 200.000 – 750.000
  * Desain Presentasi: Rp 150.000 – 500.000
  * Edit Foto Produk: Rp 75.000 – 250.000
  * Paket Professional (all-in): Rp 350.000 – 750.000
- Software: Canva Pro (100%), Ibis Paint (100%), Adobe Illustrator (60%), Photoshop (40%), Figma (20%)
- Waktu pengerjaan: 1–3 hari kerja (sederhana), 3–7 hari kerja (kompleks)
- Revisi: 2–3x inklusif, lebih dari itu bisa nego untuk paket custom
- Format file: JPG, PNG, PDF. File mentah (.AI/.PSD) dengan biaya tambahan
- Pembayaran: GoPay, DANA, Tunai (QRIS & Transfer Bank segera hadir)
- Kontak WA: +62 812-7485-2534
- Konsultasi: https://konsultasidesignbytamaandrea.vercel.app/
- Instagram: @m.andreatama
- Penghargaan: Juara 3 Poster Islami Tingkat Kabupaten (APPM Fosar Lampung Selatan)

CARA MENJAWAB:
- Jawab dalam Bahasa Indonesia yang ramah, profesional, dan mencerminkan brand premium
- Jelaskan nilai/value dari layanan, bukan hanya harga
- Selalu arahkan ke konsultasi: https://konsultasidesignbytamaandrea.vercel.app/
- Jika ditanya harga, berikan range dan jelaskan apa yang klien dapatkan
- Jawaban singkat dan to the point (3–4 kalimat)
- Jangan menjawab pertanyaan di luar bisnis ini`
};

/* ============================================================
   UTILITIES
   ============================================================ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

/* ============================================================
   CSV PARSER — untuk data Google Sheets
   ============================================================ */
function parseCSV(text) {
  const lines = text.trim().split('\n');
  return lines.map(line => {
    const cols = [];
    let inQ = false, cur = '';
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') { inQ = !inQ; }
      else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = ''; }
      else { cur += ch; }
    }
    cols.push(cur.trim());
    return cols;
  });
}

/* ============================================================
   GOOGLE SHEETS SYNC
   ── Mengambil data stats & ulasan dari Google Sheets
   ── Auto-refresh setiap 5 menit
   ============================================================ */
const SheetsSync = {
  interval: null,

  init() {
    if (!CONFIG.SHEETS_ENABLED) {
      // Fallback: pakai data statis + animasi counter
      Counter.init();
      return;
    }
    this.fetchStats();
    this.fetchReviews();
    // Auto-refresh setiap 5 menit
    this.interval = setInterval(() => {
      this.fetchStats();
      this.fetchReviews();
    }, 5 * 60 * 1000);
  },

  async fetchStats() {
    try {
      const res = await fetch(CONFIG.SHEETS_CSV_URL + '&cachebust=' + Date.now());
      if (!res.ok) throw new Error('Sheets fetch failed');
      const text = await res.text();
      const rows = parseCSV(text);
      // Row 0 = header, Row 1 = data
      if (rows.length >= 2) {
        const [klien, ulasan, rating] = rows[1];
        this.updateStat('stat-klien', klien, true);
        this.updateStat('stat-karya', Math.floor(parseInt(klien || 50) * 1.8), true);
        this.updateStat('totalClients', klien);
        this.updateStat('totalReviews', ulasan);
        this.updateStat('avgRating', rating || '4.9');
        this.updateStars(parseFloat(rating || 4.9));
      }
    } catch (e) {
      console.warn('[Sheets] Stats fetch failed, using defaults:', e);
      Counter.init(); // fallback ke animasi statis
    }
  },

  async fetchReviews() {
    try {
      const res = await fetch(CONFIG.SHEETS_REVIEWS_URL + '&cachebust=' + Date.now());
      if (!res.ok) throw new Error('Reviews fetch failed');
      const text = await res.text();
      const rows = parseCSV(text);
      // Skip header row (row[0])
      const reviews = rows.slice(1).filter(r => r[0] && r[2]);
      if (!reviews.length) return;

      const grid = $('#testiGrid');
      if (!grid) return;

      grid.innerHTML = '';
      reviews.slice(0, 6).forEach((row, i) => {
        const [nama, jabatan, isi, ratingRaw] = row;
        const rating = Math.min(5, Math.max(1, parseInt(ratingRaw || 5)));
        const stars = '★'.repeat(rating) + (rating < 5 ? '☆'.repeat(5 - rating) : '');
        const initial = (nama || 'K').charAt(0).toUpperCase();
        const card = document.createElement('div');
        card.className = 'testi-card reveal';
        if (i > 0) card.style.animationDelay = (i * 0.1) + 's';
        card.innerHTML = `
          <div class="testi-stars">${stars}</div>
          <blockquote>${this.escapeHtml(isi)}</blockquote>
          <div class="testi-author">
            <div class="ta-avatar">${initial}</div>
            <div>
              <strong>${this.escapeHtml(nama)}</strong>
              <span>${this.escapeHtml(jabatan || '')}</span>
            </div>
          </div>`;
        grid.appendChild(card);
        // Trigger reveal animation
        setTimeout(() => {
          Reveal.observer?.observe(card);
          // Immediate show if already in viewport
          requestAnimationFrame(() => card.classList.add('visible'));
        }, 100);
      });
    } catch (e) {
      console.warn('[Sheets] Reviews fetch failed, keeping static:', e);
    }
  },

  updateStat(id, value, animate = false) {
    const el = $('#' + id);
    if (!el) return;
    const num = parseInt((value || '').replace(/\D/g, '')) || 0;
    if (animate && num > 0) {
      CounterAnim.run(el, num);
    } else {
      el.textContent = value || '—';
    }
  },

  updateStars(rating) {
    const el = $('#avgStars');
    if (!el) return;
    const full = Math.floor(rating);
    const half = rating - full >= 0.5;
    el.textContent = '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
  },

  escapeHtml(str) {
    return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
};

/* ============================================================
   COUNTER ANIMATION (standalone)
   ============================================================ */
const CounterAnim = {
  run(el, target, suffix = '') {
    const duration = 1800;
    const step = 16;
    const increment = target / (duration / step);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      el.textContent = Math.floor(current) + suffix;
      if (current >= target) clearInterval(timer);
    }, step);
  }
};

const Counter = {
  init() {
    const statKlien = $('#stat-klien');
    const statKarya = $('#stat-karya');
    const totalClients = $('#totalClients');
    const totalReviews = $('#totalReviews');

    // Trigger count on viewport entry
    const targets = [statKlien, statKarya].filter(Boolean);
    if (!targets.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const count = parseInt(el.dataset.count || '0', 10);
          if (count) CounterAnim.run(el, count);
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    targets.forEach(el => observer.observe(el));

    // Summary counters
    if (totalClients) totalClients.textContent = '50+';
    if (totalReviews) totalReviews.textContent = '47';
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
    if (document.readyState === 'complete') {
      setTimeout(hide, 600);
    } else {
      window.addEventListener('load', () => setTimeout(hide, 600));
    }
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
    this.observer = new IntersectionObserver((entries) => {
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
   PORTFOLIO SLIDER
   ============================================================ */
const Portfolio = {
  track: null,
  items: [],
  dots: [],
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

    this.track.addEventListener('pointerdown', e => {
      this.dragging = true;
      this.startX = e.clientX;
      this.track.setPointerCapture(e.pointerId);
    });
    this.track.addEventListener('pointermove', e => {
      if (!this.dragging) return;
      this.scrollX = this.startX - e.clientX;
    });
    this.track.addEventListener('pointerup', () => {
      if (!this.dragging) return;
      this.dragging = false;
      if (this.scrollX > 60) this.go(this.current + 1);
      else if (this.scrollX < -60) this.go(this.current - 1);
      this.scrollX = 0;
    });

    window.addEventListener('resize', () => {
      this.calcVisible();
      this.buildDots(dotsWrap);
      this.render();
    });
  },

  calcVisible() {
    const w = window.innerWidth;
    this.itemsVisible = w < 540 ? 1 : w < 900 ? 2 : 3;
    this.current = Math.min(this.current, this.maxIndex());
  },

  maxIndex() {
    return Math.max(0, this.items.length - this.itemsVisible);
  },

  buildDots(wrap) {
    if (!wrap) return;
    this.dots = [];
    wrap.innerHTML = '';
    const count = this.maxIndex() + 1;
    for (let i = 0; i < count; i++) {
      const d = document.createElement('button');
      d.className = 'port-dot' + (i === 0 ? ' active' : '');
      d.setAttribute('aria-label', `Karya ${i + 1}`);
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
    const itemW = this.items[0].offsetWidth + 20;
    this.track.style.transform = `translateX(-${this.current * itemW}px)`;
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

      const src = item?.querySelector('img')?.src || cred?.dataset.src;
      if (!src) return;

      content.innerHTML = `<img src="${src}" alt="Preview" />`;
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
    el.className = `notif show ${type}`;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => el.classList.remove('show'), CONFIG.NOTIF_MS);
  }
};

/* ============================================================
   WHATSAPP
   ============================================================ */
const WA = {
  send(msg) {
    window.open(`https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener,noreferrer');
  }
};

const WAButtons = {
  init() {
    document.addEventListener('click', e => {
      const btn = e.target.closest('.wa-btn, #quickChat');
      if (!btn) return;
      WA.send(`Halo ${CONFIG.BRAND} 👋, saya ingin berkonsultasi tentang kebutuhan desain grafis saya. Bisa kita diskusi?`);
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
      if (errEl) errEl.textContent = 'Jawaban tidak sesuai. Coba lagi.';
      return;
    }
    if (errEl) errEl.textContent = '';

    const btn = $('#submitBtn');
    if (btn) { btn.textContent = 'Mengirim...'; btn.disabled = true; }
    setTimeout(() => {
      Notif.show('Pesan berhasil dikirim! Saya akan segera menghubungi Anda.', 'success');
    }, 500);
  }
};

/* ============================================================
   TOOL BARS — animate progress on scroll
   ============================================================ */
const ToolBars = {
  init() {
    const fills = $$('.tool-fill');
    if (!fills.length) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const fill = getComputedStyle(el).getPropertyValue('--fill').trim() || '0%';
          el.style.width = fill;
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
   SCROLL TOP
   ============================================================ */
const ScrollTop = {
  init() {
    const btn = $('#scrollTop');
    if (!btn) return;
    window.addEventListener('scroll', () => { btn.hidden = window.scrollY < 300; }, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
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
          .then(reg => console.log('[SW] Registered:', reg.scope))
          .catch(err => console.warn('[SW] Failed:', err));
      });
    }
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
      body.hidden = isOpen;
      toggle.setAttribute('aria-expanded', String(!isOpen));
      toggle.classList.toggle('open', !isOpen);
    };

    toggle.addEventListener('click', toggleBody);
    header?.addEventListener('click', e => {
      if (!e.target.closest('button')) toggleBody();
    });

    chips?.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const q = chip.dataset.q;
      if (q && input) {
        input.value = q;
        this.send();
      }
    });

    form?.addEventListener('submit', e => {
      e.preventDefault();
      this.send();
    });
  },

  async send() {
    const input   = $('#aiInput');
    const sendBtn = $('#aiSend');
    const text    = input?.value.trim();
    if (!text || this.isLoading) return;

    this.isLoading = true;
    if (sendBtn) sendBtn.disabled = true;
    if (input) input.value = '';

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
          model: 'claude-sonnet-4-20250514',
          max_tokens: 400,
          system: CONFIG.AI_SYSTEM_PROMPT,
          messages: this.messages.slice(-10)
        })
      });

      if (!response.ok) throw new Error(`API ${response.status}`);
      const data = await response.json();
      const reply = data.content?.[0]?.text || 'Maaf, saya tidak dapat merespons saat ini. Silakan hubungi via WhatsApp.';

      this.messages.push({ role: 'assistant', content: reply });
      this.showTyping(false);
      this.appendMsg(reply, 'bot');

    } catch (err) {
      console.warn('[AI] API error, fallback:', err);
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
    div.style.opacity = '0';
    div.style.transform = 'translateY(8px)';
    wrap.appendChild(div);
    requestAnimationFrame(() => {
      div.style.transition = 'opacity 0.3s, transform 0.3s';
      div.style.opacity = '1';
      div.style.transform = 'translateY(0)';
    });
    wrap.scrollTop = wrap.scrollHeight;
  },

  showTyping(show) {
    const el = $('#aiTyping');
    if (el) el.hidden = !show;
    const wrap = $('#aiMessages');
    if (wrap) wrap.scrollTop = wrap.scrollHeight;
  },

  localFallback(input) {
    const q = input.toLowerCase();
    if (q.includes('harga') || q.includes('biaya') || q.includes('tarif') || q.includes('berapa'))
      return 'Harga layanan kami mulai dari Rp 75.000 untuk desain sederhana, hingga Rp 750.000 untuk paket brand identity lengkap. Setiap paket sudah termasuk revisi dan file resolusi tinggi. Untuk estimasi tepat, konsultasikan proyek Anda di https://konsultasidesignbytamaandrea.vercel.app/';
    if (q.includes('waktu') || q.includes('lama') || q.includes('deadline'))
      return 'Pengerjaan 1–3 hari kerja untuk desain sederhana, 3–7 hari untuk proyek kompleks seperti brand identity. Ada kebutuhan ekspres? Beritahu deadline Anda dan kami atur prioritasnya.';
    if (q.includes('revisi'))
      return 'Setiap paket sudah termasuk 2–3 revisi. Kepuasan Anda adalah prioritas — jika butuh revisi lebih, bisa kita diskusikan dalam paket custom.';
    if (q.includes('paket') || q.includes('professional'))
      return 'Paket Professional kami (Rp 350.000–750.000) mencakup logo & panduan brand, paket konten sosial, dan semua format file. Cocok untuk brand yang serius ingin berkembang.';
    if (q.includes('format') || q.includes('file'))
      return 'Anda akan mendapatkan file JPG resolusi tinggi, PNG (transparan), dan PDF print-ready. File source (.AI/.PSD) tersedia dengan biaya tambahan.';
    if (q.includes('pesan') || q.includes('order') || q.includes('cara'))
      return 'Mudah sekali! Kunjungi https://konsultasidesignbytamaandrea.vercel.app/ untuk konsultasi, atau isi form di halaman ini. Setelah diskusi dan sepakat, saya langsung mulai kerjakan.';
    return 'Pertanyaan yang bagus! Untuk jawaban yang lebih detail dan sesuai kebutuhan spesifik Anda, silakan konsultasi langsung di https://konsultasidesignbytamaandrea.vercel.app/ atau WhatsApp +62 812-7485-2534. 😊';
  }
};

/* ============================================================
   BOOTSTRAP
   ============================================================ */
function boot() {
  Theme.init();
  Loader.init();
  Cursor.init();
  Navbar.init();
  MobileNav.init();
  SmoothScroll.init();
  Reveal.init();
  SheetsSync.init(); // replaces Counter.init() when sheets enabled
  Portfolio.init();
  Lightbox.init();
  WAButtons.init();
  ContactForm.init();
  ScrollTop.init();
  ToolBars.init();
  PWA.init();
  Year.init();
  SW.init();
  AIAssistant.init();

  console.log(`✦ ${CONFIG.BRAND} v5.0 — Premium Ready`);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
