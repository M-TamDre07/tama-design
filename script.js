/**
 * Tama Andrea Studio — Main Script v4.0
 * Features: Theme, Nav, Animations, Portfolio Slider,
 *           Counter, PWA Install, Claude AI Assistant, Form
 */

'use strict';

/* ============================================================
   CONFIGURATION
   ============================================================ */
const CONFIG = {
  WA_NUMBER:    '6281274852534',
  BRAND:        'Tama Andrea Studio',
  START_PRICE:  'Rp 10.000',
  NOTIF_MS:     4000,
  AI_SYSTEM_PROMPT: `Kamu adalah AI Assistant untuk Tama Andrea Studio — jasa desain grafis profesional milik Tama Andrea.

TENTANG BISNIS:
- Nama: Tama Andrea Studio
- Pemilik: Tama Andrea (siswa/remaja, berdomisili di Lampung Selatan, Indonesia)
- Layanan: Poster & Flyer Digital, Banner Marketplace, Konten Media Sosial, Logo Sederhana, Desain Presentasi, Edit Foto Produk
- Harga mulai dari Rp 10.000 (terjangkau & fleksibel sesuai kesulitan)
- Software dikuasai: Canva Pro (100%), Ibis Paint (100%)
- Software dipelajari: Adobe Illustrator (60%), Photoshop (40%), Figma (20%)
- Waktu pengerjaan: 1–3 hari kerja (sederhana), 3–7 hari kerja (kompleks)
- Revisi: inklusif 2–3 kali, bisa negosiasi untuk paket custom
- Format file: JPG, PNG, PDF. File mentah (.AI/.PSD) dengan biaya tambahan
- Pembayaran: GoPay, DANA, Tunai (QRIS & Transfer Bank segera hadir)
- Kontak WA: +62 812-7485-2534
- Instagram: @m.andreatama | TikTok: @tama_andrea
- Website: https://tamaandrea.vercel.app
- Konsultasi: https://konsultasidesignbytamaandrea.vercel.app
- Donasi: https://saweria.co/tamaandrea
- Penghargaan: Juara 3 Poster Islami Tingkat Kabupaten (APPM Fosar Lampung Selatan)

CARA MENJAWAB:
- Jawab dalam Bahasa Indonesia yang ramah, santai tapi profesional
- Berikan informasi yang akurat dan bermanfaat
- Jika ditanya tentang harga, jelaskan bahwa harga bersifat fleksibel dan dimulai dari Rp 10.000 tergantung kompleksitas
- Arahkan ke WhatsApp (+62 812-7485-2534) untuk diskusi lebih lanjut atau pemesanan
- Jangan menjawab pertanyaan di luar topik jasa desain grafis dan bisnis ini
- Jawaban harus singkat dan to the point (maksimal 3-4 kalimat)
- Jika tidak tahu sesuatu, katakan dengan jujur dan sarankan untuk menghubungi langsung via WA`
};

/* ============================================================
   UTILITIES
   ============================================================ */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

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
      setTimeout(hide, 300);
    } else {
      window.addEventListener('load', () => setTimeout(hide, 400));
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
    document.addEventListener('mousemove', e => {
      glow.style.left = e.clientX + 'px';
      glow.style.top  = e.clientY + 'px';
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
    const btn       = $('#hamburger');
    const overlay   = $('#mobileOverlay');
    const nav       = $('#mobile-nav');
    const closeBtn  = $('#mobileClose');
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
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
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
    const observer = new IntersectionObserver((entries) => {
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
    const target = parseInt(el.dataset.count, 10);
    const duration = 1600;
    const step = 16;
    const increment = target / (duration / step);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
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

    // Touch / pointer drag
    this.track.addEventListener('pointerdown', e => { this.dragging = true; this.startX = e.clientX; this.track.setPointerCapture(e.pointerId); });
    this.track.addEventListener('pointermove', e => { if (!this.dragging) return; this.scrollX = this.startX - e.clientX; });
    this.track.addEventListener('pointerup', () => {
      if (!this.dragging) return;
      this.dragging = false;
      if (this.scrollX > 60) this.go(this.current + 1);
      else if (this.scrollX < -60) this.go(this.current - 1);
      this.scrollX = 0;
    });
    window.addEventListener('resize', () => { this.calcVisible(); this.render(); });
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
    const itemW = this.items[0].offsetWidth + 20; // gap
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
    const box = $('#lightbox');
    const content = $('#lightboxContent');
    const close = $('#lightboxClose');
    if (!box) return;

    document.addEventListener('click', e => {
      const btn = e.target.closest('.port-zoom');
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
    window.addEventListener('keydown', e => { if (e.key === 'Escape' && box.classList.contains('open')) closeBox(); });
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
      WA.send(`Halo ${CONFIG.BRAND} 👋, saya ingin konsultasi tentang jasa desain grafis. Bisakah kita diskusi lebih lanjut?`);
    });
  }
};

/* ============================================================
   CONTACT FORM
   ============================================================ */
const ContactForm = {
  a: 0,
  b: 0,

  init() {
    const form = $('#orderForm');
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
      Notif.show('Pesan berhasil dikirim! Saya akan segera membalas.', 'success');
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
      const btn = $('#pwaInstallBtn');
      btn?.addEventListener('click', () => this.install());
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
    const toggle   = $('#aiToggle');
    const header   = $('.ai-header');
    const body     = $('#aiBody');
    const form     = $('#aiForm');
    const sendBtn  = $('#aiSend');
    const input    = $('#aiInput');
    const chips    = $('#aiChips');

    if (!toggle || !body) return;

    // Toggle open/close
    const toggleBody = () => {
      const isOpen = !body.hidden;
      body.hidden = isOpen;
      toggle.setAttribute('aria-expanded', String(!isOpen));
      toggle.classList.toggle('open', !isOpen);
    };
    toggle.addEventListener('click', toggleBody);
    header.addEventListener('click', e => {
      if (!e.target.closest('button')) toggleBody();
    });

    // Quick chips
    chips?.addEventListener('click', e => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const q = chip.dataset.q;
      if (q && input) {
        input.value = q;
        this.send();
      }
    });

    // Form submit
    form?.addEventListener('submit', (e) => {
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

    // Open body if hidden
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
          messages: this.messages.slice(-10) // keep last 10 for context
        })
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const reply = data.content?.[0]?.text || 'Maaf, saya tidak dapat merespons saat ini. Silakan hubungi via WhatsApp.';

      this.messages.push({ role: 'assistant', content: reply });
      this.showTyping(false);
      this.appendMsg(reply, 'bot');

    } catch (err) {
      console.warn('AI API error, falling back to local:', err);
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
    const div = document.createElement('div');
    div.className = `ai-msg ${type}`;
    const span = document.createElement('span');
    span.textContent = text;
    div.appendChild(span);

    // Animate in
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

  // Local fallback when API unavailable
  localFallback(input) {
    const q = input.toLowerCase();
    if (q.includes('harga') || q.includes('biaya') || q.includes('tarif') || q.includes('berapa'))
      return 'Harga desain mulai dari Rp 10.000 — tergantung kompleksitas dan jenis. Poster/konten sosial Rp 10–25rb, logo Rp 15–50rb, presentasi Rp 20–75rb. Untuk estimasi tepat, yuk chat WA dulu! 😊';
    if (q.includes('waktu') || q.includes('lama') || q.includes('deadline') || q.includes('cepat'))
      return 'Pengerjaan 1–3 hari kerja untuk desain sederhana, 3–7 hari untuk yang kompleks. Butuh super cepat (express)? Bisa! Beritahu deadline kamu di WA ya.';
    if (q.includes('revisi'))
      return 'Revisi 2–3x sudah termasuk dalam harga. Jika butuh revisi lebih atau perubahan besar, bisa kita atur di paket custom. Tujuanku kepuasan kamu! 🙌';
    if (q.includes('software') || q.includes('aplikasi') || q.includes('tools'))
      return 'Saat ini saya mahir di Canva Pro & Ibis Paint (keduanya 100%). Sedang belajar Adobe Illustrator, Photoshop, dan Figma untuk layanan yang makin lengkap!';
    if (q.includes('format') || q.includes('file'))
      return 'Kamu akan dapat file JPG (resolusi tinggi), PNG (transparan jika perlu), atau PDF (print-ready). File mentah (.AI/.PSD) tersedia dengan biaya tambahan.';
    if (q.includes('pesan') || q.includes('order') || q.includes('cara'))
      return 'Mudah banget! Chat WA +62 812-7485-2534 atau isi form di halaman ini. Setelah diskusi konsep & setuju harga, bayar, dan saya langsung kerjakan! 🎨';
    if (q.includes('bayar') || q.includes('pembayaran') || q.includes('gopay') || q.includes('dana'))
      return 'Bisa bayar via GoPay, DANA, atau Tunai. QRIS & Transfer Bank akan segera hadir. Konfirmasi pembayaran ya biar langsung diproses!';
    if (q.includes('kontak') || q.includes('hubungi') || q.includes('whatsapp') || q.includes('wa'))
      return 'Bisa langsung WA ke +62 812-7485-2534 atau klik tombol chat di halaman ini. Saya biasanya balas cepat di jam aktif! 📱';
    return 'Wah, pertanyaan menarik! Untuk jawaban lebih detail dan tepat, langsung chat WhatsApp di +62 812-7485-2534 ya. Saya siap bantu! 😊';
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
          el.style.width = el.style.getPropertyValue('--fill') || el.parentElement?.dataset?.fill || '0%';
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    fills.forEach(el => {
      const target = el.style.getPropertyValue('--fill');
      el.style.width = '0%';
      setTimeout(() => observer.observe(el), 100);
    });
  }
};

/* ============================================================
   PARTNERS AUTO-SCROLL
   ============================================================ */
const Partners = {
  init() {
    // CSS animation handles it, just ensure track exists
    const track = $('#partnersTrack');
    if (!track) return;
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
  Counter.init();
  Portfolio.init();
  Lightbox.init();
  WAButtons.init();
  ContactForm.init();
  ScrollTop.init();
  PWA.init();
  Year.init();
  SW.init();
  AIAssistant.init();
  ToolBars.init();
  Partners.init();

  console.log(`🚀 ${CONFIG.BRAND} v4.0 — Ready!`);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
