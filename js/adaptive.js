/* Tama Andrea Studio — adaptive runtime
 * CSS remains the primary responsive engine; this layer only adds lightweight
 * device/performance hints, connection awareness and persistent UI preferences.
 */
(function(){'use strict';
 const root=document.documentElement;
 const mqReduced=matchMedia('(prefers-reduced-motion: reduce)');
 const mqCoarse=matchMedia('(pointer: coarse)');
 const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
 const set=()=>{
   root.dataset.input=mqCoarse.matches?'touch':'pointer';
   const save=localStorage.getItem('ta-performance');
   const slow=connection&&((connection.saveData===true)||/^(slow-2g|2g)$/.test(connection.effectiveType||''));
   root.dataset.performance=save==='lite'||slow?'lite':'full';
   root.dataset.motion=mqReduced.matches?'reduced':'full';
 };
 set();
 mqReduced.addEventListener?.('change',set);mqCoarse.addEventListener?.('change',set);connection?.addEventListener?.('change',set);
 window.TA_UI={setPerformance(mode){if(mode==='lite'||mode==='full')localStorage.setItem('ta-performance',mode);else localStorage.removeItem('ta-performance');set();},getPerformance(){return root.dataset.performance||'full'}};
 document.addEventListener('DOMContentLoaded',()=>{
   const header=document.querySelector('.site-header');
   const scroll=()=>header?.classList.toggle('is-scrolled',scrollY>8);
   scroll();addEventListener('scroll',scroll,{passive:true});
   if(navigator.connection?.saveData){document.querySelectorAll('img[loading="lazy"]').forEach(i=>i.setAttribute('decoding','async'));}
   addEventListener('offline',()=>root.dataset.network='offline');addEventListener('online',()=>root.dataset.network='online');
   root.dataset.network=navigator.onLine?'online':'offline';
 });
})();
