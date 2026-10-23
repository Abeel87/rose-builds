// Generated from the complete static payload. Regenerate after every source change.
const CACHE='rose-companion-652a08f4a1f4';
const FILES=["index.html","style.css","game.css","app.js","core.js","ui.js","visuals.js","help.js","content.js","data/catalog.json","data/visuals.json","data/world.json","manifest.webmanifest","icon.svg","icon-192.png","icon-512.png","assets/fonts/manrope-latin.woff2","assets/fonts/manrope-latin-ext.woff2","assets/fonts/cinzel.woff2","assets/game/artisan.png","assets/game/bourgeois.png","assets/game/champion.png","assets/game/cleric.png","assets/game/items-00.webp","assets/game/items-01.webp","assets/game/items-02.webp","assets/game/items-03.webp","assets/game/items-04.webp","assets/game/items-05.webp","assets/game/items-06.webp","assets/game/items-07.webp","assets/game/items-08.webp","assets/game/items-09.webp","assets/game/knight.png","assets/game/mage.png","assets/game/raider.png","assets/game/scout.png","assets/game/skills-00.webp","assets/maps/adventurers-plains-community-2025.png","assets/maps/canyon-city-of-zant-community-2025.png","assets/maps/valley-of-luxem-tower-community-2025.png"];
const urls=FILES.map(f=>new URL(f,self.registration.scope).href);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(urls)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('rose-global-')||k.startsWith('rose-companion-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  const asset=new URL(url.pathname,self.location.origin).href;
  if(request.mode==='navigate'){
    event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(c=>c.match(new URL('index.html',self.registration.scope).href))));return;
  }
  if(!urls.includes(asset))return;
  // Cache a complete version at install; do not mix partially fetched deployments offline.
  event.respondWith(caches.open(CACHE).then(c=>c.match(asset)).then(cached=>cached||fetch(request)));
});
