/* Tama Andrea Studio — backend endpoint bridge + shared order integration loader. */
(function(){
  'use strict';
  var LEGACY='https://script.google.com/macros/s/AKfycbwLjqCqyOFnss7B0L_I23mnahnPCzcY1hX3Tqj_LiQ-ghHGhM3n-QYJTNMJmOyeM01MlQ/exec';
  var CURRENT='https://script.google.com/macros/s/AKfycbxpxf2ScxmYZ0_bAXvhgbUn6pp1fsfproaGr0vrla4j3QuEBFiE-s70QdXCfna2_e1NHQ/exec';
  window.TA_BACKEND_URL=CURRENT;
  if(typeof window.fetch==='function'){
    var nativeFetch=window.fetch.bind(window);
    function rewrite(input){
      if(typeof input==='string') return input.indexOf(LEGACY)===0 ? input.replace(LEGACY,CURRENT) : input;
      if(window.Request && input instanceof Request){var url=input.url;if(url.indexOf(LEGACY)===0)return new Request(url.replace(LEGACY,CURRENT),input)}
      return input;
    }
    window.fetch=function(input,init){return nativeFetch(rewrite(input),init)};
  }
  function loadOrderIntegration(){
    if(!/\/pesan\.html$/.test(location.pathname)||window.__TA_ORDER_INTEGRATION__)return;
    window.__TA_ORDER_INTEGRATION__=true;
    var s=document.createElement('script');s.src='/js/order-integration.js';s.defer=true;s.dataset.taIntegration='1';document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadOrderIntegration,{once:true});else loadOrderIntegration();
})();
