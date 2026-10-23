import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const files=['index.html','bootstrap.js','style.css','game.css','app.js','navigation.js','core.js','ui.js','visuals.js','help.js','content.js','data/catalog.json','data/visuals.json','data/world.json','manifest.webmanifest','icon.svg','icon-192.png','icon-512.png','assets/fonts/manrope-latin.woff2','assets/fonts/manrope-latin-ext.woff2','assets/fonts/cinzel.woff2',...readdirSync('dist/assets/game').sort().map(f=>`assets/game/${f}`),...readdirSync('dist/assets/maps').sort().map(f=>`assets/maps/${f}`),...readdirSync('dist/assets/bosses').sort().map(f=>`assets/bosses/${f}`)];
const hash=createHash('sha256');for(const file of files)hash.update(readFileSync(`dist/${file}`));
const version=hash.digest('hex').slice(0,12);
const source=`// Generated from the complete static payload. Regenerate after every source change.
const CACHE='rose-companion-${version}';
const FILES=${JSON.stringify(files)};
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
`;
writeFileSync('dist/sw.js',source);console.log(`Offline payload: ${files.length} files, version ${version}`);
