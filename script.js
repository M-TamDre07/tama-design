/**
 * Tama Andrea Studio — Main Script v4.1 (Bug Fixed & Rebranded)
 * Features: Theme, Nav, Animations, Portfolio Slider,
 * PWA Install, Claude AI Assistant, Form Validation,
 * Dynamic Skills Bar, Price Modal
 */

'use strict';

/* ============================================================
   CONFIGURATION & AI SYSTEM PROMPT
   ============================================================ */
const CONFIG = {
  WA_NUMBER:    '6281274852534',
  BRAND:        'Tama Andrea Studio',
  NOTIF_MS:     4000,
  AI_SYSTEM_PROMPT: `Kamu adalah AI Assistant resmi untuk Tama Andrea Studio — jasa desain grafis profesional milik Tama Andrea.

TENTANG BISNIS & REBRANDING:
- Nama: Tama Andrea Studio
- Pemilik: Muhammad Andreatama (Desainer grafis muda, Lampung Selatan, Indonesia)
- Layanan Utama: Poster & Flyer Digital, Banner Marketplace, Konten Media Sosial, Edit Foto Produk.
- Skema Harga: Membawa konsep Rebranding Baru dengan "Tarif Pasar Menengah" yang sangat bersahabat. Kami memberikan kualitas visual premium dengan harga yang pas di kantong, jauh lebih bernilai dari sekadar desain murahan. (Jangan sebutkan angka spesifik kecuali diminta kisaran harga pasar umum).
- Software dikuasai: Canva Pro (100%), Ibis Paint (100%), Adobe Illustrator (60%).
- Waktu pengerjaan: 1–3 hari kerja (sederhana), 3–7 hari kerja (kompleks).
- Revisi: Inklusif 2–3 kali penyesuaian minor.
- Format file output: JPG, PNG, PDF. 

LAYANAN BARU - KONSULTASI DESAIN:
- Kami memiliki layanan baru khusus untuk Edukasi & Diskusi di: https://konsultasidesignbytamaandrea.vercel.app/
- Arahkan pengguna ke link tersebut JIKA mereka ingin bertanya seputar estetika, bingung pilih warna, butuh review/kritik desain karya mereka, atau ingin belajar desain.
- Sesi konsultasi ini BUKAN untuk memesan desain.

GAYA KOMUNIKASI:
- Sangat ramah, santun, asyik, dan profesional. Gunakan bahasa Indonesia yang mudah dipahami.`
};

/* ============================================================
   DOM UTILITIES
   ============================================================ */
const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);

/* ============================================================
   NOTIFICATION SYSTEM
   ============================================================ */
const Notif = {
  timeoutId: null,
  show(message, type = 'success') {
    const notifEl = $('#notif');
    if (!notifEl) return;

    clearTimeout(this.timeoutId);
    notifEl.className = 'notif';
    notifEl.textContent = message;
    notifEl.classList.add('show', type);

    this.timeoutId = setTimeout(() => {
      notifEl.classList.remove('show');
    }, CONFIG.NOTIF_MS);
  }
};

/* ============================================================
   THEME SWITCHER
   ============================================================ */
const Theme = {
  init() {
    const btn = $('#themeToggle');
    if (!btn) return;
    btn.addEventListener('click', () => this.toggle());
    this.apply(localStorage.getItem('theme') || 'dark');
  },
  toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    this.apply(next);
  },
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    const icon = $('#themeIcon');
    if (icon) {
      icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
  }
};

/* ============================================================
   LOADER & CUSTOM CURSOR
   ============================================================ */
const Loader = {
  init() {
    const loader = $('#loader');
    if (loader) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          loader.style.opacity = '0';
          loader.style.visibility = 'hidden';
        }, 400);
      });
    }
  }
};

const Cursor = {
  init() {
    const cursor = $('#customCursor');
    const dot = $('#customCursorDot');
    if (!cursor || !dot) return;

    if (window.matchMedia('(pointer: coarse)').matches) {
      cursor.style.display = 'none';
      dot.style.display = 'none';
      return;
    }

    document.addEventListener('mousemove', e => {
      cursor.style.left = `${e.clientX}px`;
      cursor.style.top = `${e.clientY}px`;
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
    });

    $$('a, button, select, input, textarea, .port-item').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  }
};

/* ============================================================
   NAVBAR & MOBILE MENU
   ============================================================ */
const Navbar = {
  init() {
    const header = $('#site-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        header.style.boxShadow = 'var(--shadow)';
        header.style.padding = '0.2rem 0';
      } else {
        header.style.boxShadow = 'none';
        header.style.padding = '0';
      }
    });
  }
};

const MobileNav = {
  init() {
    const burger = $('#hamburger');
    const menu = $('#mobile-menu');
    if (!burger || !menu) return;

    burger.addEventListener('click', () => {
      const isOpen = burger.classList.toggle('open');
      burger.setAttribute('aria-expanded', isOpen);
      menu.classList.toggle('open');
      menu.setAttribute('aria-hidden', !isOpen);
    });

    $$('.mobile-nav-link, .mobile-nav-btn').forEach(link => {
      link.addEventListener('click', () => {
        burger.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        menu.classList.remove('open');
        menu.setAttribute('aria-hidden', 'true');
      });
    });
  }
};

/* ============================================================
   SMOOTH SCROLL & REVEAL ANIMATIONS
   ============================================================ */
const SmoothScroll = {
  init() {
    $$('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', e => {
        const href = anchor.getAttribute('href');
        if (href === '#') return;
        const target = $(href);
        if (target) {
          e.preventDefault();
          const headerHeight = $('#site-header')?.offsetHeight || 68;
          const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;
          window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        }
      });
    });
  }
};

const Reveal = {
  init() {
    const items = $$('.reveal');
    if (!items.length) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    items.forEach(item => observer.observe(item));
  }
};

/* ============================================================
   DYNAMIC SKILLS PROGRESS BAR (BUG FIXED)
   ============================================================ */
const Skills = {
  init() {
    // Menangkap elemen bar progres dari HTML 
    const fills = $$('.skill-fill, .tool-fill');
    if (!fills.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          // Mengambil target lebar dari style inline atau dataset parent
          const targetWidth = el.style.getPropertyValue('--fill') || el.parentElement?.dataset?.fill || '100%';
          el.style.width = targetWidth; // Memicu transisi CSS mengisi bar
          observer.unobserve(el);
        }
      });
    }, { threshold: 0.5 });

    fills.forEach(el => {
      el.style.width = '0%'; // Pastikan mulai dari 0 saat dimuat
      setTimeout(() => observer.observe(el), 200);
    });
  }
};

/* ============================================================
   HERO COUNTER ANIMATION
   ============================================================ */
const Counter = {
  init() {
    const nums = $$('.stat-num');
    if (!nums.length) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          this.animate(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    nums.forEach(num => observer.observe(num));
  },
  animate(el) {
    const target = parseInt(el.getAttribute('data-target'), 10) || 0;
    const duration = 2000;
    const step = target / (duration / 16);
    let current = 0;
    const run = () => {
      current += step;
      if (current >= target) {
        el.textContent = target;
      } else {
        el.textContent = Math.floor(current);
        requestAnimationFrame(run);
      }
    };
    run();
  }
};

/* ============================================================
   INTERACTIVE PRICE MODAL (NEW FEATURE)
   ============================================================ */
const PriceModal = {
  init() {
    const openBtn = $('#openRatesBtn');
    const modal = $('#priceModal');
    const closeBtn = $('#priceModalClose');

    if (!openBtn || !modal || !closeBtn) return;

    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden'; // Kunci scroll layar belakang
    });

    const closeModal = () => {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = ''; // Buka kembali scroll
    };

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      // Menutup modal jika area gelap di luar kartu diklik
      if (e.target === modal) closeModal();
    });
  }
};

/* ============================================================
   PORTFOLIO CAROUSEL / SLIDER (OPTIMIZED)
   ============================================================ */
const Portfolio = {
  init() {
    const track = $('#portTrack');
    const prev = $('#sliderPrev');
    const next = $('#sliderNext');
    const viewport = $('#portViewport');
    const dotsContainer = $('#sliderDots');
    if (!track || !prev || !next || !viewport) return;

    let currentIndex = 0;
    let items = $$('.port-item');
    const gap = 28;

    const getItemsPerView = () => {
      const width = window.innerWidth;
      if (width > 1024) return 3;
      if (width > 768) return 2;
      return 1;
    };

    const updateSlider = () => {
      const itemsPerView = getItemsPerView();
      const maxIndex = Math.max(0, items.length - itemsPerView);
      if (currentIndex > maxIndex) currentIndex = maxIndex;

      const itemWidth = (viewport.offsetWidth - (gap * (itemsPerView - 1))) / itemsPerView;
      items.forEach(item => { item.style.width = `${itemWidth}px`; });

      const offset = currentIndex * (itemWidth + gap);
      track.style.transform = `translateX(-${offset}px)`;

      prev.style.opacity = currentIndex === 0 ? '0.5' : '1';
      prev.style.pointerEvents = currentIndex === 0 ? 'none' : 'auto';
      next.style.opacity = currentIndex >= maxIndex ? '0.5' : '1';
      next.style.pointerEvents = currentIndex >= maxIndex ? 'none' : 'auto';

      updateDots(maxIndex + 1);
    };

    const setupDots = (count) => {
      if (!dotsContainer) return;
      dotsContainer.innerHTML = '';
      for (let i = 0; i < count; i++) {
        const dot = document.createElement('span');
        dot.className = `slider-dot ${i === currentIndex ? 'active' : ''}`;
        dot.addEventListener('click', () => {
          currentIndex = i;
          updateSlider();
        });
        dotsContainer.appendChild(dot);
      }
    };

    const updateDots = (count) => {
      const dots = $$('.slider-dot');
      if (dots.length !== count) {
        setupDots(count);
      } else {
        dots.forEach((dot, idx) => dot.classList.toggle('active', idx === currentIndex));
      }
    };

    prev.addEventListener('click', () => {
      if (currentIndex > 0) { currentIndex--; updateSlider(); }
    });

    next.addEventListener('click', () => {
      const maxIndex = Math.max(0, items.length - getItemsPerView());
      if (currentIndex < maxIndex) { currentIndex++; updateSlider(); }
    });

    // Touch Support
    let startX = 0;
    let isSwiping = false;

    viewport.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      isSwiping = true;
    }, { passive: true });

    viewport.addEventListener('touchend', e => {
      if (!isSwiping) return;
      const diffX = startX - e.changedTouches[0].clientX;
      if (Math.abs(diffX) > 40) {
        if (diffX > 0) next.click();
        else prev.click();
      }
      isSwiping = false;
    }, { passive: true });

    window.addEventListener('resize', updateSlider);
    updateSlider();
  }
};

/* ============================================================
   LIGHTBOX FOR GALLERY PREVIEW
   ============================================================ */
const Lightbox = {
  init() {
    const lightbox = $('#lightbox');
    const content = $('#lightboxContent');
    const closeBtn = $('#lightboxClose');
    if (!lightbox || !content || !closeBtn) return;

    $$('.port-item img').forEach(img => {
      img.addEventListener('click', e => {
        e.stopPropagation();
        content.innerHTML = '';
        content.appendChild(img.cloneNode(true));
        lightbox.style.display = 'flex';
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      });
    });

    const close = () => {
      lightbox.style.display = 'none';
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', close);
    lightbox.addEventListener('click', close);
    content.addEventListener('click', e => e.stopPropagation());
  }
};

/* ============================================================
   CONTACT FORM & WA REDIRECT (BUG FIXED)
   ============================================================ */
const ContactForm = {
  captchaAns: 0,
  init() {
    const form = $('#orderForm');
    if (!form) return;
    this.generateCaptcha();
    form.addEventListener('submit', e => this.handleSubmit(e));
  },
  generateCaptcha() {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;
    this.captchaAns = num1 + num2;
    const label = $('#captchaQuestion');
    if (label) label.textContent = `${num1} + ${num2}`;
  },
  handleSubmit(e) {
    // FIXED: Cegah form agar tidak melakukan page reload bawaan
    e.preventDefault();

    const form = $('#orderForm');
    const captchaInput = $('#fCaptcha');
    const submitBtn = $('#submitBtn');
    const btnText = $('#btnText');
    const btnLoading = $('#btnLoading');

    if (parseInt(captchaInput.value, 10) !== this.captchaAns) {
      Notif.show('Verifikasi keamanan salah! Silakan coba lagi.', 'error');
      captchaInput.value = '';
      this.generateCaptcha();
      return;
    }

    submitBtn.disabled = true;
    if (btnText && btnLoading) {
      btnText.hidden = true;
      btnLoading.hidden = false;
    }

    const name = $('#fName').value;
    const email = $('#fEmail').value;
    const service = $('#fService').value;
    const brief = $('#fBrief').value;

    const waMessage = `Halo Tama Andrea Studio, saya tertarik memesan layanan visual:\n\n- *Nama*: ${name}\n- *Email*: ${email}\n- *Layanan*: ${service}\n- *Rincian/Konsep*: ${brief}`;
    const waUrl = `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(waMessage)}`;

    setTimeout(() => {
      submitBtn.disabled = false;
      if (btnText && btnLoading) {
        btnText.hidden = false;
        btnLoading.hidden = true;
      }
      Notif.show('Brief berhasil dikonfirmasi! Mengalihkan ke WhatsApp...', 'success');
      form.reset();
      this.generateCaptcha();

      setTimeout(() => { window.open(waUrl, '_blank', 'noopener'); }, 1500);
    }, 1200);
  }
};

/* ============================================================
   MISC HELPERS (Scroll Top, PWA, Year)
   ============================================================ */
const ScrollTop = {
  init() {
    const btn = $('#scrollTop');
    if (!btn) return;
    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        btn.classList.add('show');
        btn.removeAttribute('hidden');
      } else {
        btn.classList.remove('show');
        btn.setAttribute('hidden', '');
      }
    });
    btn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }
};

const Year = {
  init() {
    const yearEl = $('#year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }
};

const PWA = {
  deferredPrompt: null,
  init() {
    const btnContainer = $('#installPWA');
    const btn = $('#pwaInstallBtn');
    if (!btnContainer || !btn) return;

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      this.deferredPrompt = e;
      btnContainer.removeAttribute('hidden');
      btnContainer.style.display = 'inline-block';
    });

    btn.addEventListener('click', async () => {
      if (!this.deferredPrompt) return;
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      this.deferredPrompt = null;
      btnContainer.setAttribute('hidden', '');
      btnContainer.style.display = 'none';
    });
  }
};

/* ============================================================
   AI LOCAL FALLBACK (REBRANDED)
   ============================================================ */
const AIAssistant = {
  init() {
    console.log('[AI] Assistant initialized with Premium Rebranding logic.');
  },
  async localFallback(text) {
    const prompt = text.toLowerCase();
    
    if (prompt.includes('harga') || prompt.includes('biaya') || prompt.includes('tarif')) {
      return `Untuk tarif pembuatan karya desain, kami menggunakan standar harga pasar kelas menengah (misal: Poster Rp 75k-150k, Banner Rp 100k-200k). Sangat bersahabat dengan kualitas premium yang Anda dapatkan!`;
    }
    if (prompt.includes('konsul') || prompt.includes('belajar') || prompt.includes('tanya')) {
      return `Ingin berkonsultasi soal layout, warna, atau minta desain Anda kami kritik secara membangun? Silakan gunakan ruang edukasi gratis kami di formulir berikut: https://konsultasidesignbytamaandrea.vercel.app/`;
    }
    if (prompt.includes('software') || prompt.includes('aplikasi')) {
      return `Tama Andrea Studio saat ini ahli menggunakan Canva Pro (100%), Ibis Paint (100%), dan secara aktif memproduksi aset vektor dari Adobe Illustrator.`;
    }
    if (prompt.includes('layanan') || prompt.includes('bisa apa')) {
      return `Layanan utama kami meliputi: Poster & Flyer Digital, Banner Marketplace (Shopee/Tokopedia), Desain Konten Media Sosial (Feed/Carousel), dan Jasa Pembersihan/Edit Foto Produk.`;
    }
    return `Halo! Ada yang bisa saya bantu terkait informasi layanan desain Tama Andrea Studio atau butuh bantuan mengarahkan Anda ke portal konsultasi kami?`;
  }
};

/* ============================================================
   BOOTSTRAP ALL SERVICES
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
  Skills.init();       // Inisialisasi animasi Bar Keahlian
  Portfolio.init();
  Lightbox.init();
  PriceModal.init();   // Inisialisasi Modal Harga Pasar
  ContactForm.init();
  ScrollTop.init();
  PWA.init();
  Year.init();
  AIAssistant.init();

  console.log(`🚀 ${CONFIG.BRAND} v4.1 (Bug Fixed & Rebranded) — Ready.`);
}

document.addEventListener('DOMContentLoaded', boot);
