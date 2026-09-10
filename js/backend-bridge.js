/* Tama Andrea Studio — backend endpoint bridge.
 * Keeps legacy frontend modules working while the Apps Script deployment URL changes.
 * Replace the URL here only when the backend deployment itself changes.
 */
(function(){
  'use strict';
  var LEGACY='https://script.google.com/macros/s/AKfycbwLjqCqyOFnss7B0L_I23mnahnPCzcY1hX3Tqj_LiQ-ghHGhM3n-QYJTNMJmOyeM01MlQ/exec';
  var CURRENT='https://script.google.com/macros/s/AKfycbwxUZgpRttcYDF_6UwsyJXrfvwJ8nir1b54zT7rIIO_dWu6rDIWiFcgLUT3cx-crBqwoQ/exec';
  window.TA_BACKEND_URL=CURRENT;
  if(typeof window.fetch!=='function')return;
  var nativeFetch=window.fetch.bind(window);
  function rewrite(input){
    if(typeof input==='string') return input.indexOf(LEGACY)===0 ? input.replace(LEGACY,CURRENT) : input;
    if(window.Request && input instanceof Request){
      var url=input.url;
      if(url.indexOf(LEGACY)===0) return new Request(url.replace(LEGACY,CURRENT),input);
    }
    return input;
  }
  window.fetch=function(input,init){return nativeFetch(rewrite(input),init);};
})();
