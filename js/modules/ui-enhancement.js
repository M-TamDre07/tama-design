/* UI-only enhancements kept separate from legacy business/data logic. */
(() => {
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

  const focusNavigation = () => {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', () => {
        const nav = document.querySelector('.mobile-nav');
        const overlay = document.querySelector('.mobile-nav-overlay');
        if (nav?.classList.contains('open')) {
          nav.classList.remove('open');
          overlay?.classList.remove('open');
          nav.setAttribute('aria-hidden', 'true');
          overlay?.setAttribute('aria-hidden', 'true');
          document.body.classList.remove('menu-open');
        }
      }, { passive: true });
    });
  };

  const markExternalLinks = () => {
    document.querySelectorAll('a[target="_blank"]').forEach(link => {
      link.rel = link.rel.includes('noopener') ? link.rel : `${link.rel} noopener`;
    });
  };

  const init = () => {
    loadStylesheet();
    improveViewport();
    focusNavigation();
    markExternalLinks();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
