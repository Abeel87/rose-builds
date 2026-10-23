import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {setVisuals,itemImage,monsterImage,matchingSkill,mapForZone,mapVariant,canonicalZone,zoneMatches} from '../dist/visuals.js';
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
  assert.ok(monsterImage(catalog.monsters.find(m=>m.id==='203')).includes('assets/bosses/203-model.webp'));
});
test('every boss has an attributed real appearance, never a summoning-item portrait',()=>{
  const bosses=catalog.monsters.filter(m=>m.kind!=='monster');
  assert.equal(world.appearanceCoverage.bossCount,bosses.length);
  for(const m of bosses){
    const appearance=world.monsters[m.id];
    assert.ok(appearance?.image, m.name);
    assert.equal(appearance.name,m.name);
    assert.ok(['official-client-model','official-screenshot'].includes(appearance.origin));
    for(const a of [appearance,...(appearance.officialScreenshot?[appearance.officialScreenshot]:[])]){
      const path=new URL(`../dist/${a.image}`,import.meta.url);
      assert.ok(existsSync(path),m.name);
      assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),a.sha256,m.name);
      assert.ok(a.sourceUrl.startsWith('https://'));assert.ok(a.date);assert.ok(a.note);
      assert.ok(a.width>=140&&a.height>=140);
    }
    assert.ok(monsterImage(m).includes('class="monster-art'));
    assert.ok(!monsterImage(m).includes('Effigy'));
  }
  setVisuals(visuals,{monsters:{'test':{effigy:world.monsters['203'].effigy}}});
  assert.ok(monsterImage({id:'test',name:'No model'}).includes('Brak obrazu'));
  assert.ok(!monsterImage({id:'test',name:'No model'}).includes('--sheet'));
  setVisuals(visuals,world);
});
test('map imagery covers the named client atlas with local files and attribution',()=>{
  assert.ok(world.maps.length>=70);
  assert.equal(new Set(world.maps.map(m=>m.id)).size,world.maps.length);
  for(const m of world.maps){
    assert.equal(mapForZone(m.name).id,m.id);
    for(const alias of m.zones)assert.equal(mapForZone(alias).id,m.id,alias);
    for(const layer of [m,...(m.variants??[]),...(m.archive?[m.archive]:[])]){
      const path=new URL(`../dist/${layer.image}`,import.meta.url);
      assert.ok(existsSync(path));assert.ok(layer.sourceUrl.startsWith('https://'));assert.ok(layer.author);assert.ok(layer.date);
      assert.ok(layer.width>4&&layer.height>4,'transparent client placeholders must not be counted as maps');
      if(layer.sha256)assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),layer.sha256,layer.image);
      if(layer.origin.startsWith('official-client'))assert.equal(layer.currentGlobalSpawnsVerified,false);
    }
  }
  assert.equal(mapForZone('Xita Refuge').origin,'official-client');
  assert.equal(mapForZone('Xita Refuge').archive.currentGlobalSpawnsVerified,false);
  assert.ok(mapForZone('Golden Ring').image);
  assert.equal(canonicalZone('The Golden Ring'),'Golden Ring');
  assert.equal(zoneMatches('The Wasteland','Wastelands'),true);
  assert.equal(zoneMatches('Wasteland Ruins Path','Wastelands'),false);
  assert.notEqual(mapForZone('Orlo Clan Field').image,mapForZone('Orlo Clan Field Temple').image);
  assert.equal(mapForZone('Wastelands').variants.length,2);
  assert.equal(mapForZone('Junon Clan Field').variants.length,3);
  assert.equal(mapVariant(mapForZone('Forgotten Temple'),'','Forgotten Temple (B2)').id,'57');
  assert.equal(mapForZone('Karkian Reach').planet,'Karkia');
  assert.equal(mapForZone('Karkian Reach').availability,'client-only');
  for(const m of catalog.monsters)for(const l of m.locations)assert.ok(mapForZone(l.zone),`${m.name}: ${l.zone}`);
  assert.ok(catalog.monsters.find(m=>m.id==='203').locations.some(l=>l.zone==="Adventurer's Plains"&&l.source==='community-maps'));
});
test('all non-technical client zone records are accounted for, including both blank-minimap dungeons',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../scripts/current-client-map-manifest.json',import.meta.url)));
  const mapped=new Set(world.maps.flatMap(m=>m.clientZoneIds));
  const excluded=new Set(world.mapCoverage.excludedClientScenes.map(m=>m.zoneId));
  assert.deepEqual(world.mapCoverage.pending,[]);
  for(const z of manifest.zones)assert.ok(mapped.has(z.zoneId)||excluded.has(z.zoneId),`${z.zoneId}: ${z.name}`);
  for(const name of ['Halls of Oblivion','Sikuku Catacombs'])assert.equal(mapForZone(name).origin,'official-client-derived');
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
