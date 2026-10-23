import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function harness(){
  const listeners={},stored=new Map(),deleted=[],installRequests=[];let offline=false;
  const scope='https://rose.example/companion/';
  const self={registration:{scope},location:{origin:'https://rose.example'},addEventListener:(type,fn)=>listeners[type]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{}}};
  // A default request may reuse an older HTTP response even for a new SW cache.
  const caches={open:async name=>({addAll:async requests=>requests.forEach(input=>{const req=new Request(input);installRequests.push(req);stored.set(req.url,`${req.cache==='reload'?'cached':'stale-http'}:${req.url}`);}),match:async url=>stored.get(url)}),keys:async()=>['unrelated-app','rose-global-v1','rose-companion-old'],delete:async key=>{deleted.push(key);return true;}};
  const urls=vm.runInNewContext(readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8')+'\nurls;',{self,caches,URL,Request,fetch:async req=>{if(offline)throw new Error('offline');return `network:${req.url}`;}});
  return {listeners,stored,deleted,scope,urls,installRequests,setOffline:()=>offline=true,async event(name){let promise;listeners[name]({waitUntil:p=>promise=p});await promise;},async request(url,mode='cors',method='GET'){let promise;listeners.fetch({request:{url,mode,method},respondWith:p=>promise=p});return await promise;}};
}
test('installation refreshes every versioned asset instead of reusing stale HTTP cache',async()=>{
  const h=harness();await h.event('install');h.setOffline();
  assert.deepEqual(h.installRequests.map(req=>req.url),Array.from(h.urls));
  assert.ok(h.installRequests.every(req=>req.cache==='reload'));
  for(const url of h.urls)assert.equal(await h.request(url),`cached:${url}`,url);
});
test('offline navigation and complete catalog work in a subdirectory after installation',async()=>{
  const h=harness();await h.event('install');h.setOffline();
  assert.equal(await h.request(`${h.scope}#/atlas`,'navigate'),`cached:${h.scope}index.html`);
  assert.equal(await h.request(`${h.scope}data/catalog.json`),`cached:${h.scope}data/catalog.json`);
  assert.equal(await h.request(`${h.scope}assets/fonts/manrope-latin-ext.woff2`),`cached:${h.scope}assets/fonts/manrope-latin-ext.woff2`);
  assert.equal(await h.request(`${h.scope}data/world.json`),`cached:${h.scope}data/world.json`);
  assert.equal(await h.request(`${h.scope}assets/game/items-00.webp`),`cached:${h.scope}assets/game/items-00.webp`);
  assert.equal(await h.request(`${h.scope}game.css`),`cached:${h.scope}game.css`);
  assert.equal(await h.request(`${h.scope}bootstrap.js`),`cached:${h.scope}bootstrap.js`);
  const world=JSON.parse(readFileSync(new URL('../dist/data/world.json',import.meta.url)));
  for(const file of [world.monsters['203'].image,world.maps.find(m=>m.name==='Golden Ring').image,world.maps.find(m=>m.name==='Orlo Clan Field').image])assert.equal(await h.request(`${h.scope}${file}`),`cached:${h.scope}${file}`);
});
test('service worker leaves unrelated caches, non-GET and external requests alone',async()=>{
  const h=harness();await h.event('activate');
  assert.deepEqual(h.deleted,['rose-global-v1','rose-companion-old']);
  assert.equal(await h.request('https://forum.roseonlinegame.com/topic/1'),undefined);
  assert.equal(await h.request(`${h.scope}app.js`,'cors','POST'),undefined);
  assert.equal(await h.request('https://rose.example/unrelated.js'),undefined);
});
