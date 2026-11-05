/* Tama Andrea Studio — dashboard SVG icon and control enhancement.
   Uses the repository's local Lucide sprite; no icon-font or text glyph fallback. */
(() => {
  'use strict';
  const ICONS = {
    refreshBtn:'refresh-cw', refreshReviewsBtn:'refresh-cw', refreshMessagesBtn:'refresh-cw',
    refreshNotificationsBtn:'refresh-cw', refreshErrorsBtn:'refresh-cw', refreshBillingBtn:'refresh-cw',
    loginBtn:'log-in', verifyMfaBtn:'shield-check', logoutBtn:'log-out',
    toggleCustomerForm:'user-plus', newStudioServiceBtn:'plus', newPortfolioBtn:'plus',
    newFaqBtn:'plus', newPaymentBtn:'plus', customerSubmitBtn:'save',
    cancelCustomerBtn:'x', cancelStudioServiceBtn:'x', cancelPortfolioBtn:'x',
    cancelFaqBtn:'x', cancelPaymentBtn:'x', testTelegramBtn:'send'
  };
  const CLASS_ICONS = {
    'save-order':'save','save-order-details':'save','add-order-note':'plus','archive-order':'archive',
    'edit-customer':'pencil','edit-portfolio':'pencil','edit-faq':'pencil','edit-payment':'pencil',
    'edit-studio-service':'pencil','toggle-portfolio':'eye','toggle-faq':'eye',
    'toggle-payment':'check-circle','toggle-studio-service':'check-circle',
    'publish-studio-review':'check-circle','reject-studio-review':'ban',
    'save-message':'save','retry-notification':'send'
  };
  const icon = name => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    svg.setAttribute('class','ui-icon');
    svg.setAttribute('viewBox','0 0 24 24');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    const use = document.createElementNS('http://www.w3.org/2000/svg','use');
    use.setAttribute('href','/assets/icons/lucide-sprite.svg#' + name);
    svg.appendChild(use);
    return svg;
  };
  const infer = element => {
    if (element.dataset.icon) return element.dataset.icon;
    if (element.id && ICONS[element.id]) return ICONS[element.id];
    for (const className of element.classList) {
      if (CLASS_ICONS[className]) return CLASS_ICONS[className];
    }
    const form = element.closest('form');
    if (form) {
      const formIcons = {
        loginForm:'log-in', customerForm:'user-plus', availabilityForm:'calendar-days',
        siteContentForm:'save', studioServiceForm:'save', portfolioForm:'save',
        faqForm:'save', paymentForm:'save', transactionForm:'receipt'
      };
      if (formIcons[form.id]) return formIcons[form.id];
    }
    const text = (element.textContent || '').trim().toLocaleLowerCase('id');
    if (/^(batal|tutup|kembali)$/.test(text)) return 'x';
    if (/^(simpan|catat|terapkan)/.test(text)) return 'save';
    if (/^(tambah|buat|baru)/.test(text)) return 'plus';
    if (/^(edit|ubah)/.test(text)) return 'pencil';
    if (/^(arsip)/.test(text)) return 'archive';
    if (/^(terbitkan|aktifkan|tampilkan)/.test(text)) return 'check-circle';
    if (/^(tolak|tarik|sembunyikan|nonaktifkan)/.test(text)) return 'eye-off';
    if (/^(muat ulang|refresh)/.test(text)) return 'refresh-cw';
    if (/^(kirim ulang|tes telegram)/.test(text)) return 'send';
    return '';
  };
  const decorate = root => {
    const targets = [];
    if (root.matches && root.matches('button[data-icon],a.btn[data-icon],.metric-icon[data-icon]')) targets.push(root);
    if (root.querySelectorAll) targets.push(...root.querySelectorAll('button,a.btn,.metric-icon'));
    targets.forEach(element => {
      const name = infer(element);
      if (!name || element.querySelector(':scope > .ui-icon')) return;
      const svg = icon(name);
      if (element.classList.contains('metric-icon')) {
        element.appendChild(svg);
      } else if (element.dataset.iconPosition === 'before' || element.classList.contains('primary') || element.classList.contains('btn-primary')) {
        element.insertBefore(svg,element.firstChild);
      } else {
        element.appendChild(svg);
      }
    });
  };
  const boot = () => {
    decorate(document.body);
    const observer = new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === Node.ELEMENT_NODE) decorate(node);
      }));
    });
    observer.observe(document.body,{childList:true,subtree:true});
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
