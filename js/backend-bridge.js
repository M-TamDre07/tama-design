/* Tama Andrea Studio — backend endpoint bridge + shared order integration loader. */
(function(){
  'use strict';
  var LEGACY='https://script.google.com/macros/s/AKfycbymlROisZWRIL5754kyzTe59dLoWMYaJ3f_AAz4TbThpluXD1e3tQd5AbQvfJXzGJ7VJg/exec';
  var CURRENT='https://script.google.com/macros/s/AKfycbxdS9sBNhOO_UJFJ-TU6-WG6JCGf3wMcs36m98uQm3l/exec';
  window.TA_BACKEND_URL=CURRENT;
  if(typeof window.fetch==='function'){
    var nativeFetch=window.fetch.bind(window);
    function rewrite(input){
      if(typeof input==='string') return input.indexOf(LEGACY)===0 ? input.replace(LEGACY,CURRENT) : input;
      if(window.Request && input instanceof Request){
        var url=input.url;
        if(url.indexOf(LEGACY)===0)return new Request(url.replace(LEGACY,CURRENT),input);
      }
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
