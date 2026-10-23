import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { STORAGE_KEY, LEGACY_KEY, createBuild, normalizeBuild, normalizeLibrary, emptyLibrary, loadLibrary, saveLibrary, parseImport, mergeLibraries, encodeBuild, decodeBuild, draftNeedsSave, escapeHTML, dropPenalty, timerState, indexCatalog, filterItems, filterMonsters } from '../dist/core.js';
import { SOURCES, TEMPLATES } from '../dist/content.js';

const storage = (entries={})=>({data:new Map(Object.entries(entries)),getItem(key){return this.data.get(key)??null;},setItem(key,value){this.data.set(key,value);}});
const oldBuild = { name:'Łowca Kingów',job:'Bourgeois',build:'bourgeois-0',level:250,stats:{STR:250,CON:180},ranks:{launcherMastery:5},gear:{Weapon:'Rift Boomer'},notes:'Zażółć gęślą jaźń 🏹' };
const catalog=JSON.parse(readFileSync(new URL('../dist/data/catalog.json',import.meta.url),'utf8'));
const index=indexCatalog(catalog);

test('legacy migration preserves allocation, ranks, equipment and Polish text without deleting the original',()=>{
  const raw=JSON.stringify([oldBuild]),s=storage({[LEGACY_KEY]:raw});
  const result=loadLibrary(s);assert.equal(result.error,null);
  const b=result.library.builds[0];
  assert.equal(b.name,oldBuild.name);assert.equal(b.notes,oldBuild.notes);
  assert.equal(b.statMode,'allocation');assert.equal(b.stats.STR,250);
  assert.equal(b.stats.DEX,0);assert.equal(b.gear.Weapon,'Rift Boomer');
  assert.equal(b.skills[0].name,'launcherMastery');assert.equal(b.skills[0].rank,5);
  assert.equal(s.getItem(LEGACY_KEY),raw);assert.equal(result.library.migratedLegacy,true);
  assert.equal(loadLibrary(s).library.builds.length,1);
});

test('a corrupt legacy row aborts migration before any write',()=>{
  const raw=JSON.stringify([oldBuild,{...oldBuild,job:'Unknown'}]),s=storage({[LEGACY_KEY]:raw});
  assert.match(loadLibrary(s).error,/klasa/);assert.equal(s.getItem(STORAGE_KEY),null);assert.equal(s.getItem(LEGACY_KEY),raw);
});

test('corrupt current storage is preserved and never replaced with a legacy fallback',()=>{
  const s=storage({[STORAGE_KEY]:'{broken',[LEGACY_KEY]:JSON.stringify([oldBuild])});
  assert.ok(loadLibrary(s).error);assert.equal(s.getItem(STORAGE_KEY),'{broken');
});

test('quota failure is reported without claiming successful persistence',()=>{
  const s=storage({[LEGACY_KEY]:JSON.stringify([oldBuild])});s.setItem=()=>{throw new Error('QuotaExceededError');};
  assert.match(loadLibrary(s).error,/Quota/);assert.throws(()=>saveLibrary(s,emptyLibrary()),/Quota/);
});

test('current storage takes precedence and a saved draft survives reload',()=>{
  const b=createBuild();b.notes='Szkic przed zamknięciem';
  const library={...emptyLibrary(),builds:[{...b,notes:'Wersja zapisana'}],draft:b};
  const s=storage({[LEGACY_KEY]:JSON.stringify([oldBuild])});saveLibrary(s,library);
  const loaded=loadLibrary(s).library;
  assert.equal(loaded.draft.notes,b.notes);assert.equal(loaded.builds.length,1);
  assert.equal(draftNeedsSave(loaded.draft,loaded.builds),true);
  assert.equal(draftNeedsSave(loaded.builds[0],loaded.builds),false);
});

test('template cannot silently change an imported class',()=>{
  const knight=TEMPLATES.find(t=>t.job==='Knight');
  assert.equal(normalizeBuild({...createBuild(),archetype:knight.id}).job,'Bourgeois');
});

test('UTF-8 share links round-trip configuration but do not include local identifiers or collection',()=>{
  const b=normalizeBuild(oldBuild,{legacy:true});b.skills.push({id:'s1',name:'Ogień 🔥',rank:3,note:'Pozycja z tyłu'});
  const encoded=encodeBuild(b),decoded=decodeBuild(encoded);
  assert.equal(decoded.name,b.name);assert.equal(decoded.notes,b.notes);assert.deepEqual(decoded.gear,b.gear);
  assert.deepEqual(decoded.skills,b.skills);assert.notEqual(decoded.id,b.id);
  const raw=JSON.parse(Buffer.from(encoded,'base64url').toString('utf8'));
  assert.equal(raw.id,undefined);assert.equal(raw.createdAt,undefined);assert.equal(raw.builds,undefined);
});

test('old base64 links work; malformed and oversized shared data are rejected',()=>{
  const old=Buffer.from(JSON.stringify(oldBuild)).toString('base64');
  assert.equal(decodeBuild(old).statMode,'allocation');assert.equal(decodeBuild(old).notes,oldBuild.notes);
  for(const value of ['','%broken','a'.repeat(20001),Buffer.from('{}').toString('base64')])assert.throws(()=>decodeBuild(value));
  const b=createBuild();b.notes='🔥'.repeat(2500);b.skills=Array.from({length:40},(_,i)=>({id:`s${i}`,name:'A'.repeat(100),rank:1,note:'B'.repeat(300)}));
  assert.throws(()=>encodeBuild(b),/JSON/);
});

test('import accepts single old/new builds and complete backups, and rejects future or invalid formats',()=>{
  assert.equal(parseImport(JSON.stringify(oldBuild)).builds.length,1);
  assert.equal(parseImport(JSON.stringify([oldBuild])).builds.length,1);
  const b=createBuild();assert.equal(parseImport(JSON.stringify({format:'rose-build',version:2,build:b})).builds[0].id,b.id);
  assert.deepEqual(parseImport(JSON.stringify(emptyLibrary())),emptyLibrary());
  for(const raw of ['not json','x'.repeat(2_000_001),'{"version":3,"builds":[],"targets":[]}',JSON.stringify({...oldBuild,level:251})])assert.throws(()=>parseImport(raw));
});

test('import merges collisions without overwriting builds, draft or completed targets',()=>{
  const b=createBuild(),target={kind:'item',id:'8178',done:true,notes:'Zdobyte',killedAt:null};
  const current={...emptyLibrary(),builds:[b],targets:[target],draft:b};
  const incoming={...emptyLibrary(),builds:[{...b,notes:'Imported'}],targets:[{...target,done:false,notes:''}]};
  const result=mergeLibraries(current,incoming);
  assert.equal(result.builds.length,2);assert.equal(result.builds[0].notes,'');assert.equal(result.builds[1].notes,'Imported');
  assert.notEqual(result.builds[1].id,b.id);assert.deepEqual(result.targets,[target]);assert.deepEqual(result.draft,b);
  assert.equal(mergeLibraries(current,current).builds.length,1);
  assert.equal(current.builds.length,1);
});

test('import limits and escaping protect the app against malformed content',()=>{
  const b=createBuild();assert.throws(()=>normalizeLibrary({...emptyLibrary(),builds:[b,b]}),/identyfikatory/);
  assert.throws(()=>normalizeLibrary({...emptyLibrary(),builds:Array(301).fill(b)}),/wiele/);
  const malicious=JSON.parse(JSON.stringify({...b,notes:'<img src=x onerror=alert(1)>'}).replace('"notes":','"__proto__":{"polluted":true},"notes":'));
  const safe=normalizeBuild(malicious);assert.equal(Object.hasOwn(safe,'__proto__'),false);assert.equal({}.polluted,undefined);
  assert.equal(escapeHTML(safe.notes),'&lt;img src=x onerror=alert(1)&gt;');
  assert.throws(()=>normalizeBuild({...b,stats:{STR:-1}}));assert.throws(()=>normalizeBuild({...b,skills:[{name:'x',rank:NaN}]}));
});

test('catalog identifiers, references and source provenance are internally consistent',()=>{
  assert.equal(index.items.size,catalog.items.length);assert.equal(index.monsters.size,catalog.monsters.length);
  assert.ok(catalog.items.length>19000);assert.ok(catalog.monsters.length>=600);
  for(const m of catalog.monsters){
    assert.ok(SOURCES[m.source],m.id);assert.equal(new Set(m.drops).size,m.drops.length,m.id);
    for(const [id,source] of Object.entries(m.officialDrops)){assert.ok(m.drops.includes(id));assert.equal(SOURCES[source]?.type,'official');}
    for(const l of m.locations)assert.ok(SOURCES[l.source],`${m.id}: ${l.source}`);
  }
  for(const z of catalog.zoneDrops){assert.ok(SOURCES[z.source]);for(const id of z.items)assert.ok(index.items.has(id));}
});

test('item search returns a specific weapon, monster loot and map drops instead of the unfiltered catalog',()=>{
  assert.deepEqual(filterItems(catalog.items,index,{query:'rift boomer'},catalog.zoneDrops).map(i=>i.id),['8178']);
  const mobs=filterMonsters(catalog.monsters,{query:'Crowned Asper',kind:'kings'});
  assert.ok(mobs.length>0&&mobs.length<4);assert.ok(mobs.every(m=>m.name.includes('Crowned Asper')));
  const kingLoot=filterItems(catalog.items,index,{query:'Crowned Asper'},catalog.zoneDrops);
  assert.ok(kingLoot.some(i=>i.id==='17729'));
  assert.equal(filterItems(catalog.items,index,{query:'nonexistent-zz-12345'},catalog.zoneDrops).length,0);
  assert.ok(filterItems(catalog.items,index,{query:'Golden Ring'},catalog.zoneDrops).some(i=>i.id==='17207'));
});

test('official and planet filters apply to the same drop relationship',()=>{
  const item={id:'1',name:'Test',type:'material'};
  const m=(id,planet,official)=>({id,name:id,kind:'king',rank:'',planet,locations:[],drops:['1'],officialDrops:official?{'1':'patch-may'}:{}});
  const ix=indexCatalog({items:[item],monsters:[m('a','Orlo',true),m('b','Junon',false)]});
  assert.equal(filterItems([item],ix,{planet:'Junon',officialOnly:true}).length,0);
  assert.equal(filterItems([item],ix,{planet:'Orlo',officialOnly:true}).length,1);
});

test('official Orlo corrections include Wandering, exclude Clan Fields, and use the right orb colours',()=>{
  const crown=index.monsters.get('2207');assert.equal(crown.level,250);assert.equal(crown.officialDrops['17729'],'patch-effigies');
  assert.ok(crown.locations.some(l=>l.zone==='Golden Ring'&&l.source==='patch-inspector'));
  for(const m of catalog.monsters.filter(m=>m.kind==='wandering')){
    assert.equal(m.level,250);assert.equal(m.officialDrops['17523'],'patch-may');assert.equal(m.officialDrops['17713'],'patch-may');
    assert.deepEqual(m.respawn,[5,90]);assert.equal(m.respawnSource,'patch-october');
  }
  assert.equal(index.monsters.get('wandering-devourer').officialDrops['17723'],'patch-effigies');
  assert.equal(index.monsters.get('wandering-snapper').officialDrops['17728'],'patch-effigies');
  for(const m of catalog.monsters.filter(m=>m.habitat==='clan'))assert.notEqual(m.levelSource,'patch-october');
});

test('event rewards are not presented as confirmed direct drops; removed drop gems are absent',()=>{
  const m=index.monsters.get('super-ulverick');assert.deepEqual(m.drops,[]);assert.equal(m.rewards.length,2);
  for(const id of m.rewards)assert.equal(index.droppedBy.has(id),false);
  assert.equal(catalog.items.some(i=>/Combeite Pear|Umbite Baguette|Raspite Round|Variscite Briolette|Esperite Cushion|Legrandite Marquise|Dolomite Asscher/.test(i.name)),false);
});

test('level penalty boundaries and respawn windows do not imply guaranteed drops or spawns',()=>{
  for(const [delta,result] of [[-50,0],[0,0],[3,0],[4,10],[8,10],[9,25],[14,25],[15,50],[21,50],[22,75]])assert.equal(dropPenalty(100+delta,100),result);
  assert.equal(dropPenalty(0,100),null);assert.equal(dropPenalty(2.5,100),null);
  const killed=100000;
  assert.deepEqual(timerState(killed,[5,90],killed),{phase:'waiting',minutes:5});
  assert.deepEqual(timerState(killed,[5,90],killed+300000),{phase:'window',minutes:85});
  assert.deepEqual(timerState(killed,[5,90],killed+5400000),{phase:'elapsed',minutes:0});
  assert.equal(timerState(killed,null),null);
});
