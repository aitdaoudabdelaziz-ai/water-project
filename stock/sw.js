// Gestion de stock : cache hors ligne (réseau d'abord, cache si hors ligne)
const CACHE="alfath-stock-v1";
const FILES=["./","index.html"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x.startsWith("alfath-stock-")&&x!=CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener("fetch",e=>{if(e.request.method!="GET")return;const u=new URL(e.request.url);
 const okHost=u.origin==location.origin||u.hostname=="cdnjs.cloudflare.com"||(u.hostname=="www.gstatic.com"&&u.pathname.startsWith("/firebasejs/"));
 if(!okHost)return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok||r.type=="opaque"){const c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match("index.html"))))});
