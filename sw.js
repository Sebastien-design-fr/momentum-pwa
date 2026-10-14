const CACHE='momentum-v111-core-1';
const ASSETS=['./','./index.html','./app.js?v=0.11.1','./bridge.js?v=0.11.1','./coach.js?v=0.11.1','./planner.js?v=0.11.1','./ai-runtime.js?v=0.11.1','./ai-worker.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png'];
const staticPaths=new Set(ASSETS.map(x=>new URL(x,self.location.href).pathname));
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',event=>{event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('momentum-')&&k!==CACHE).map(k=>caches.delete(k)))),self.clients.claim()]))});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 // Only the explicit static resources enter the app cache.
 if(event.request.method!=='GET'||url.origin!==self.location.origin||!staticPaths.has(url.pathname)||['code','state','error','access_token','id_token'].some(k=>url.searchParams.has(k)))return;
 event.respondWith(fetch(event.request,{cache:'no-cache'}).then(response=>{if(response.ok){const key=url.pathname;caches.open(CACHE).then(c=>c.put(key,response.clone())).catch(()=>{})}return response}).catch(async()=>await caches.match(url.pathname)||await caches.match(event.request)||Response.error()));
});
