const CACHE_NAME='ta-studio-v9';
const FONT_CACHE='ta-studio-fonts-v9';
const IMAGE_CACHE='ta-studio-images-v9';
const SHELL_ASSETS=['/','/layanan.html','/karya.html','/pesan.html','/offline.html','/manifest.json','/assets/icons/lucide-sprite.svg'];
self.addEventListener('install',event=>{
 event.waitUntil(Promise.all([
  caches.open(CACHE_NAME).then(cache=>cache.addAll(SHELL_ASSETS).catch(()=>{})),
  caches.open(FONT_CACHE)
 ]));
 self.skipWaiting();
});
self.addEventListener('activate',event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>!['ta-studio-v9','ta-studio-fonts-v9','ta-studio-images-v9'].includes(key)).map(key=>caches.delete(key)))));
 self.clients.claim();
});
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(url.pathname==='/api/catalog'&&url.searchParams.get('action')==='bootstrap'){event.respondWith(fetch(request,{cache:'default'}));return;}
 if(url.pathname==='/admin'||url.pathname==='/admin.html'||url.pathname.startsWith('/api/')){event.respondWith(fetch(request,{cache:'no-store'}));return;}
 if(request.destination==='document'||request.headers.get('accept')?.includes('text/html')){
  event.respondWith(fetch(request).then(response=>{
   if(response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(request,response.clone()));
   return response;
  }).catch(()=>caches.match(request).then(cached=>cached||caches.match('/offline.html'))));
  return;
 }
 if(request.destination==='image'){
  event.respondWith(caches.open(IMAGE_CACHE).then(cache=>cache.match(request).then(cached=>cached||fetch(request).then(response=>{if(response.ok)cache.put(request,response.clone());return response;}))));
  return;
 }
 if(request.destination==='style'||request.destination==='script'){
  event.respondWith(caches.open(CACHE_NAME).then(cache=>cache.match(request).then(cached=>fetch(request).then(response=>{if(response.ok)cache.put(request,response.clone());return response;}).catch(()=>cached))));
 }
});
