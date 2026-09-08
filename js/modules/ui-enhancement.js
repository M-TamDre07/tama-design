/* Tama Andrea Studio — UI enhancement layer
 * Keeps legacy behavior intact while hardening responsive UX and asset routing.
 */
(() => {
  'use strict';

  const ASSET_MAP = new Map([
    ['/logo-tamaandreastudio.jpg', '/assets/images/brand/logo-tamaandreastudio.jpg'],
    ['/Karya1.png', '/assets/images/portfolio/Karya1.png'],
    ['/Karya2.png', '/assets/images/portfolio/Karya2.png'],
    ['/Karya3.png', '/assets/images/portfolio/Karya3.png'],
    ['/Karya4.png', '/assets/images/portfolio/Karya4.png'],
    ['/Karya5.png', '/assets/images/portfolio/Karya5.png'],
    ['/Karya6.png', '/assets/images/portfolio/Karya6.png'],
    ['/Karya7.png', '/assets/images/portfolio/Karya7.png'],
    ['/Canva.jpg', '/assets/images/payments/Canva.jpg'],
    ['/Gopay.jpg', '/assets/images/payments/Gopay.jpg'],
    ['/Iblispaint.jpg', '/assets/images/payments/Iblispaint.jpg'],
    ['/Money.jpg', '/assets/images/payments/Money.jpg'],
    ['/dana.jpg', '/assets/images/payments/dana.jpg'],
    ['/partner-logo1.png', '/assets/images/partners/partner-logo1.png'],
    ['/figma-logo.png', '/assets/images/tools/figma-logo.png'],
    ['/illustrator-logo.png', '/assets/images/tools/illustrator-logo.png'],
    ['/photoshop-logo.png', '/assets/images/tools/photoshop-logo.png']
  ]);

  const loadStylesheet = () => {
    if (document.querySelector('link[data-modern-ui]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/css/modern.css';
    link.dataset.modernUi = 'true';
    document.head.appendChild(link);
  };

  const improveViewport = () => {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) meta.setAttribute('content', 'width=device-width, initial-scale=1, viewport-fit=cover');
  };

  const normalizeAssets = () => {
    document.querySelectorAll('img[src]').forEach((img) => {
      try {
        const url = new URL(img.getAttribute('src'), window.location.origin);
        const replacement = ASSET_MAP.get(url.pathname);
        if (replacement) img.src = replacement;
      } catch (_) { /* Keep legacy source untouched if it is not a valid URL. */ }
    });
  };

  const closeMobileMenu = () => {
    const nav = document.querySelector('.mobile-nav');
    const overlay = document.querySelector('.mobile-nav-overlay');
    nav?.classList.remove('open');
    overlay?.classList.remove('open');
    nav?.setAttribute('aria-hidden', 'true');
    overlay?.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('menu-open');
  };

  const focusNavigation = () => {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => {
        if (document.querySelector('.mobile-nav.open')) closeMobileMenu();
      }, { passive: true });
    });
  };

  const markExternalLinks = () => {
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
      const rel = new Set((link.rel || '').split(/\s+/).filter(Boolean));
      rel.add('noopener');
      link.rel = [...rel].join(' ');
    });
  };

  const improveKeyboardFocus = () => {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeMobileMenu();
    });
  };

  const init = () => {
    loadStylesheet();
    improveViewport();
    normalizeAssets();
    focusNavigation();
    markExternalLinks();
    improveKeyboardFocus();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
