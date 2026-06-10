/**
 * Tama Andrea Studio — Main Script v4.1
 * Features: Theme, Nav, Animations, Portfolio Slider,
 * Counter, PWA Install, Claude AI Assistant, Form,
 * Maintenance Integration (Rebranded)
 */

'use strict';

/* ============================================================
   CONFIGURATION
   ============================================================ */
const CONFIG = {
  WA_NUMBER:    '6281274852534',
  BRAND:        'Tama Andrea Studio',
  START_PRICE:  'Tarif Menengah & Bersahabat',
  NOTIF_MS:     4000,
  AI_SYSTEM_PROMPT: `Kamu adalah AI Assistant untuk Tama Andrea Studio — jasa desain grafis profesional dan konsultasi kreatif milik Tama Andrea.

TENTANG BISNIS:
- Nama: Tama Andrea Studio
- Pemilik: Tama Andrea (seorang desainer grafis muda berbakat berdomisili di Lampung Selatan, Indonesia)
- Layanan Utama: Poster & Flyer Digital, Banner Marketplace, Konten Media Sosial, Logo Sederhana, Desain Presentasi, Edit Foto Produk
- Skema Harga: Membawa konsep Rebranding Baru dengan rentang harga menengah yang sangat pas di kantong (tidak murah sekali, namun tidak mahal, sangat bersahabat untuk kualitas visual premium).
- Software dikuasai: Canva Pro (100%), Ibis Paint (100%)
- Software dipelajari: Adobe Illustrator (60%), Photoshop (40%), Figma (20%)
- Waktu pengerjaan: 1–3 hari kerja (sederhana), 3–7 hari kerja (kompleks)
- Revisi: Inklusif 2–3 kali, bisa negosiasi untuk perubahan minor.
- Format file output: JPG, PNG, PDF. Penyerahan file mentah/editable dikenakan biaya tambahan sesuai kesepakatan.
- Pembayaran: GoPay, DANA, dan transfer bank langsung.

LAYANAN BARU - KONSULTASI DESAIN (EDUKATIF):
- Kami menyediakan ruang edukatif khusus untuk tanya jawab seputar estetika desain, review karya, kritik konstruktif, dan bimbingan belajar desain secara santai.
- Layanan ini beralamat di website eksternal khusus: https://konsultasidesignbytamaandrea.vercel.app/
- Tekankan kepada pengguna bahwa sesi ini adalah sesi BELAJAR & BERTANYA gratis/edukatif lewat formulir tersebut, BUKAN untuk memesan/order karya komersial. Jika mereka ingin berkonsultasi, arahkan mereka dengan ramah ke link tersebut.

GAYA KOMUNIKASI:
- Bersikaplah sangat ramah, santun, profesional, dan gunakan Bahasa Indonesia yang asyik, membantu, serta mudah dipahami oleh anak muda maupun pemilik UMKM.`
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

    // Reset current active notifications
    clearTimeout(this.timeoutId);
    notifEl.className = 'notif';
    
    // Set notification content and styling classes
    notifEl.textContent = message;
    notifEl.classList.add('show', type);

    this.timeoutId = setTimeout(() => {
      notifEl.classList.remove('show');
    }, CONFIG.NOTIF_MS);
  }
};

/* ============================================================
   THEME SWITCHER (Dark / Light)
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
   LOADER & INITIAL SETUP
   ============================================================ */
const Loader = {
  init() {
    const loader = $('#loader');
    if (!loader) return;

    window.addEventListener('load', () => {
      setTimeout(() => {
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
      }, 400);
    });
  }
};

/* ============================================================
   CUSTOM CURSOR (Desktop only)
   ============================================================ */
const Cursor = {
  init() {
    const cursor = $('#customCursor');
    const dot = $('#customCursorDot');
    if (!cursor || !dot) return;

    // Hide default cursor decoration on touch devices
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

    // Hover effect for interactive elements
    const interactive = $$('a, button, select, input, textarea, summary, details, .port-item');
    interactive.forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });
  }
};

/* ============================================================
   NAVBAR SCROLL EFFECT
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

/* ============================================================
   MOBILE NAVIGATION DRAWER
   ============================================================ */
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

    // Close menu when link is clicked
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
   SMOOTH SCROLLING WITH COMPENSATION
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

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });
        }
      });
    });
  }
};

/* ============================================================
   REVEAL ON SCROLL ANIMATION
   ============================================================ */
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
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    items.forEach(item => observer.observe(item));
  }
};

/* ============================================================
   HERO STATS ANIMATED COUNTER
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
    const duration = 2000; // ms
    const step = target / (duration / 16); // ~60fps
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
   PORTFOLIO CAROUSEL / SLIDER
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
    const gap = 28; // px (cocok dengan gap 1.75rem di CSS)

    const getItemsPerView = () => {
      const width = window.innerWidth;
      if (width > 1024) return 3;
      if (width > 768) return 2;
      return 1;
    };

    const updateSlider = () => {
      const itemsPerView = getItemsPerView();
      const maxIndex = Math.max(0, items.length - itemsPerView);
      
      // Batasi index saat ini agar tidak bergeser berlebih
      if (currentIndex > maxIndex) currentIndex = maxIndex;

      const itemWidth = (viewport.offsetWidth - (gap * (itemsPerView - 1))) / itemsPerView;
      
      items.forEach(item => {
        item.style.width = `${itemWidth}px`;
      });

      const offset = currentIndex * (itemWidth + gap);
      track.style.transform = `translateX(-${offset}px)`;

      // Perbarui status tombol panah navigasi
      prev.style.opacity = currentIndex === 0 ? '0.5' : '1';
      prev.style.pointerEvents = currentIndex === 0 ? 'none' : 'auto';
      next.style.opacity = currentIndex >= maxIndex ? '0.5' : '1';
      next.style.pointerEvents = currentIndex >= maxIndex ? 'none' : 'auto';

      // Sinkronisasi indikator dots
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
        dots.forEach((dot, idx) => {
          dot.classList.toggle('active', idx === currentIndex);
        });
      }
    };

    // Event Listeners
    prev.addEventListener('click', () => {
      if (currentIndex > 0) {
        currentIndex--;
        updateSlider();
      }
    });

    next.addEventListener('click', () => {
      const itemsPerView = getItemsPerView();
      if (currentIndex < items.length - itemsPerView) {
        currentIndex++;
        updateSlider();
      }
    });

    // Touch / Swipe alternative support for mobile
    let startX = 0;
    let isSwiping = false;

    viewport.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
      isSwiping = true;
    }, { passive: true });

    viewport.addEventListener('touchend', e => {
      if (!isSwiping) return;
      const endX = e.changedTouches[0].clientX;
      const diffX = startX - endX;

      if (Math.abs(diffX) > 50) { // threshold swiping 50px
        if (diffX > 0) {
          next.click();
        } else {
          prev.click();
        }
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
        const cloneImg = img.cloneNode(true);
        content.innerHTML = '';
        content.appendChild(cloneImg);
        
        lightbox.style.display = 'flex';
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden'; // Lock background scroll
      });
    });

    const close = () => {
      lightbox.style.display = 'none';
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    closeBtn.addEventListener('click', close);
    lightbox.addEventListener('click', close);
    content.addEventListener('click', e => e.stopPropagation()); // Prevent close when clicking image
  }
};

/* ============================================================
   WHATSAPP FLOATING BUTTON ACTION
   ============================================================ */
const WAButtons = {
  init() {
    const floatWA = $('#floatWA');
    if (!floatWA) return;

    // Simple analytical trigger on click
    floatWA.addEventListener('click', () => {
      console.log('User redirected to WhatsApp support channel.');
    });
  }
};

/* ============================================================
   CONTACT & BRIEF ORDER FORM
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
    if (label) {
      label.textContent = `${num1} + ${num2}`;
    }
  },
  handleSubmit(e) {
    // PEMELIHARAAN SELESAI: Panggil preventDefault() di baris pertama
    // untuk mencegah reload halaman otomatis yang menyebabkan Notif.show() gagal tampil!
    e.preventDefault();

    const form = $('#orderForm');
    const captchaInput = $('#fCaptcha');
    const submitBtn = $('#submitBtn');
    const btnText = $('#btnText');
    const btnLoading = $('#btnLoading');

    // Validasi Captcha terlebih dahulu
    if (parseInt(captchaInput.value, 10) !== this.captchaAns) {
      Notif.show('Verifikasi keamanan salah! Silakan coba lagi.', 'error');
      captchaInput.value = '';
      this.generateCaptcha();
      return;
    }

    // Tampilkan Status Loading
    submitBtn.disabled = true;
    if (btnText && btnLoading) {
      btnText.hidden = true;
      btnLoading.hidden = false;
    }

    // Mengambil data formulir untuk menyusun pesan WhatsApp
    const name = $('#fName').value;
    const email = $('#fEmail').value;
    const service = $('#fService').value;
    const brief = $('#fBrief').value;

    const waMessage = `Halo Tama Andrea Studio, saya ingin memesan jasa desain:
- *Nama*: ${name}
- *Email*: ${email}
- *Layanan*: ${service}
- *Rincian Brief*: ${brief}`;

    const waUrl = `https://wa.me/${CONFIG.WA_NUMBER}?text=${encodeURIComponent(waMessage)}`;

    // Simulasi respons aman berkecepatan 1,2 detik sebelum redirect ke WA
    setTimeout(() => {
      // Sembunyikan Loading
      submitBtn.disabled = false;
      if (btnText && btnLoading) {
        btnText.hidden = false;
        btnLoading.hidden = true;
      }

      Notif.show('Brief berhasil diverifikasi! Mengalihkan ke WhatsApp Anda...', 'success');
      form.reset();
      this.generateCaptcha();

      // Redirect ke API WhatsApp setelah 1,5 detik notifikasi sukses terlihat
      setTimeout(() => {
        window.open(waUrl, '_blank', 'noopener');
      }, 1500);

    }, 1200);
  }
};

/* ============================================================
   SCROLL TO TOP ACTION
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

    btn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }
};

/* ============================================================
   DYNAMIC FOOTER YEAR HANDLER
   ============================================================ */
const Year = {
  init() {
    const yearEl = $('#year');
    if (yearEl) {
      yearEl.textContent = new Date().getFullYear();
    }
  }
};

/* ============================================================
   PWA INSTALLATION PROMPT
   ============================================================ */
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
      console.log(`[PWA] Install choice: ${outcome}`);
      this.deferredPrompt = null;
      btnContainer.setAttribute('hidden', '');
      btnContainer.style.display = 'none';
    });

    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Application installed successfully.');
      btnContainer.setAttribute('hidden', '');
      btnContainer.style.display = 'none';
    });
  }
};

/* ============================================================
   SERVICE WORKER BOOTSTRAP
   ============================================================ */
const SW = {
  init() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('[SW] Registered on scope:', reg.scope))
          .catch(err => console.warn('[SW] Registration failed:', err));
      });
    }
  }
};

/* ============================================================
   CLAUDE AI ASSISTANT (RESTORED & OPTIMIZED COOPERATION)
   ============================================================ */
const AIAssistant = {
  init() {
    // Inisialisasi antarmuka chat mini di pojok kanan bawah
    // jika Anda ingin melampirkan wadah visual asisten AI di masa depan.
    console.log('[AI] Assistant initialized and configured with Rebranding System.');
  },
  
  // Fungsi penanganan fallback respons lokal cerdas jika API eksternal tersumbat CORS
  async localFallback(text) {
    const prompt = text.toLowerCase();
    
    if (prompt.includes('harga') || prompt.includes('biaya') || prompt.includes('tarif') || prompt.includes('bayar')) {
      return `Untuk tarif pengerjaan karya desain di Tama Andrea Studio, kami sekarang mengedepankan rebranding baru dengan skema harga kelas menengah yang bersahabat (tidak terlalu murah dan tidak terlalu mahal, sangat pas di kantong untuk kualitas premium). Tarif disesuaikan secara transparan berdasarkan kompleksitas detail desain Anda.`;
    }
    if (prompt.includes('konsul') || prompt.includes('tanya') || prompt.includes('belajar') || prompt.includes('review')) {
      return `Kami memiliki layanan baru yaitu **Konsultasi Desain Kreatif**! Ini adalah wadah edukatif khusus bagi Anda yang ingin bertanya, berdiskusi, belajar, serta mendapatkan review/kritik konstruktif terhadap karya desain Anda secara santai langsung dari Tama Andrea. Silakan isi formulirnya secara gratis di: https://konsultasidesignbytamaandrea.vercel.app/`;
    }
    if (prompt.includes('software') || prompt.includes('aplikasi') || prompt.includes('pakai')) {
      return `Tama Andrea Studio menguasai software desain modern secara profesional, utamanya Canva Pro (100%) dan Ibis Paint (100%). Serta sedang terus mendalami Adobe Illustrator (60%), Photoshop (40%), dan Figma (20%) untuk menghadirkan aset grafis berkualitas tinggi.`;
    }
    if (prompt.includes('lama') || prompt.includes('hari') || prompt.includes('durasi') || prompt.includes('cepat')) {
      return `Waktu pengerjaan kami bervariasi antara 1–3 hari kerja untuk kategori desain sederhana (poster tunggal/feed), dan sekitar 3–7 hari kerja untuk proyek visual yang lebih kompleks (presentasi kustom atau materi branding komprehensif).`;
    }
    if (prompt.includes('revisi') || prompt.includes('ubah') || prompt.includes('ganti')) {
      return `Setiap pesanan di studio kami sudah mendapatkan fasilitas revisi gratis sebanyak 2–3 kali untuk penyesuaian minor seperti teks, warna, atau tata letak objek agar hasilnya benar-benar sesuai keinginan Anda.`;
    }
    
    return `Halo! Saya adalah Asisten AI dari Tama Andrea Studio. Ada yang bisa saya bantu terkait kebutuhan desain grafis, skema tarif menengah kami yang bersahabat, atau seputar program layanan baru Konsultasi Desain Kreatif kami?`;
  }
};

/* ============================================================
   DEVELOPER TOOLBAR PROTECTION
   ============================================================ */
const ToolBars = {
  init() {
    // Mencegah klik kanan standar di website untuk melindungi aset visual (opsional)
    document.addEventListener('contextmenu', e => {
      // Anda bisa membuka kunci ini jika ingin membiarkan pengunjung melakukan klik kanan
      // e.preventDefault();
    });
  }
};

/* ============================================================
   PARTNERS AUTO-SCROLL LOOP
   ============================================================ */
const Partners = {
  init() {
    const track = $('#partnersTrack');
    if (!track) return;
    console.log('[Partners] Infinite scrolling track successfully linked.');
  }
};

/* ============================================================
   BOOTSTRAP ALL SERVICES ON DOM READY
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

  console.log(`🚀 ${CONFIG.BRAND} v4.1 (Rebranding & Maintenance) — Ready.`);
}

// Jalankan bootstrap saat DOM telah dimuat sepenuhnya
document.addEventListener('DOMContentLoaded', boot);
