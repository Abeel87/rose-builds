import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {setVisuals,itemImage,monsterImage,matchingSkill,mapForZone} from '../dist/visuals.js';
import {sourceLink} from '../dist/ui.js';
import {createBuild,normalizeBuild,encodeBuild,decodeBuild} from '../dist/core.js';
import {JOBS,SOURCES} from '../dist/content.js';
const read=name=>JSON.parse(readFileSync(new URL(`../dist/data/${name}.json`,import.meta.url)));
const visuals=read('visuals'),world=read('world'),catalog=read('catalog');
setVisuals(visuals,world);

test('all sprite references resolve to bundled sheets and remain within their atlas cells',()=>{
  for(const path of [...visuals.sheets,...Object.values(visuals.classes)])assert.ok(existsSync(new URL(`../dist/${path}`,import.meta.url)),path);
  const refs=[...Object.values(visuals.items),...Object.values(visuals.effigies),...world.skills.filter(s=>s.sprite).map(s=>s.sprite)];
  for(const [sheet,x,y] of refs){assert.ok(visuals.sheets[sheet]);assert.ok(Number.isInteger(x)&&x>=0&&x<24);assert.ok(Number.isInteger(y)&&y>=0&&y<24);}
  assert.ok(Object.keys(visuals.items).length>15000);
  assert.ok(itemImage(catalog.items.find(i=>i.id==='8178')).includes('role="img"'));
  assert.ok(monsterImage(catalog.monsters.find(m=>m.id==='203')).includes('Effigy'));
});
test('map imagery has local files, attribution, and a matching actual catalog location',()=>{
  assert.ok(world.maps.length>=11);
  assert.equal(new Set(world.maps.map(m=>m.id)).size,world.maps.length);
  for(const m of world.maps){
    assert.equal(mapForZone(m.name).id,m.id);
    for(const layer of [m,...(m.archive?[m.archive]:[])]){
      const path=new URL(`../dist/${layer.image}`,import.meta.url);
      assert.ok(existsSync(path));assert.ok(layer.sourceUrl.startsWith('https://'));assert.ok(layer.author);assert.ok(layer.date);
      if(layer.sha256)assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),layer.sha256,layer.image);
      if(layer.origin==='official-client')assert.equal(layer.currentGlobalSpawnsVerified,false);
    }
  }
  assert.equal(mapForZone('Xita Refuge').origin,'official-client');
  assert.equal(mapForZone('Xita Refuge').archive.currentGlobalSpawnsVerified,false);
  assert.equal(mapForZone('Golden Ring'),undefined);
  assert.ok(catalog.monsters.find(m=>m.id==='203').locations.some(l=>l.zone==="Adventurer's Plains"&&l.source==='community-maps'));
});
test('skill catalog covers eight jobs, has unique identifiers and preserves same-name variants in saves and shared links',()=>{
  assert.equal(new Set(world.skills.map(s=>s.id)).size,world.skills.length);
  for(const job of JOBS)assert.ok(world.skills.some(s=>s.jobs.includes(job)),job);
  for(const s of world.skills){assert.ok(s.name);assert.ok(s.sprite||s.image?.startsWith('https://roseonlinetoolbox.com/assets/icons/skills/'));}
  const variants=world.skills.filter(s=>s.name==='Twin Shot'&&s.jobs.includes('Bourgeois'));assert.equal(variants.length,2);
  const build=createBuild('Bourgeois');build.skills=variants.map((s,i)=>({id:`test-${i}`,catalogId:s.id,name:s.name,rank:i+1,note:''}));
  const restored=decodeBuild(encodeBuild(normalizeBuild(build)));
  assert.deepEqual(restored.skills.map(s=>s.catalogId),variants.map(s=>s.id));
  for(const s of restored.skills)assert.equal(matchingSkill(s.name,'Bourgeois',s.catalogId).id,s.catalogId);
});
test('source badges keep the primary workflow in the app',()=>{
  for(const key of Object.keys(SOURCES)){const html=sourceLink(key);assert.ok(html.includes(`href="#/help/${key}"`));assert.ok(!html.includes('target="_blank"'));}
});
