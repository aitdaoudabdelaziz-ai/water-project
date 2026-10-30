const CACHE="alfath-water-v1.1.0";
const FILES=["./","index.html","manifest.webmanifest","xlsx.full.min.js","icon-192.png","icon-512.png","icon-maskable.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!=CACHE).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener("fetch",e=>{if(e.request.method!="GET")return;
 e.respondWith(fetch(e.request).then(r=>{let u=new URL(e.request.url);if((r.ok||r.type=="opaque")&&(u.origin==location.origin||u.hostname=="cdnjs.cloudflare.com")){let c=r.clone();caches.open(CACHE).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request,{ignoreSearch:true}).then(r=>r||caches.match("index.html"))))});
