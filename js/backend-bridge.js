/* Tama Andrea — same-origin Vercel API bridge and order integration loader. */
(function(){
  'use strict';
  window.TA_BACKEND_URL='/api/public';
  function loadOrderIntegration(){
    if(!/\/pesan\.html$/.test(location.pathname)||window.__TA_ORDER_INTEGRATION__)return;
    window.__TA_ORDER_INTEGRATION__=true;
    var s=document.createElement('script');
    s.src='/js/order-integration.js';s.defer=true;s.dataset.taIntegration='1';
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadOrderIntegration,{once:true});
  else loadOrderIntegration();
})();
