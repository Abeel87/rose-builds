import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {markersForMap,isAreaMarker} from '../dist/map-markers.js';
const read=name=>JSON.parse(readFileSync(new URL(`../dist/data/${name}.json`,import.meta.url)));
const spawns=read('spawns'),catalog=read('catalog'),world=read('world');
const views=world.maps.flatMap(m=>m.variants??[m]);
const bosses=catalog.monsters.filter(m=>m.kind!=='monster');

test('every catalog boss has a visible point or attributed area on an exact map',()=>{
  const visible=views.flatMap(map=>markersForMap(spawns,map));
  const ids=new Set(visible.map(m=>m.id));
  assert.equal(ids.size,spawns.records.length+spawns.areas.length,'no orphan or duplicated annotations');
  assert.equal(bosses.length,138);
  for(const m of bosses)assert.ok(visible.some(p=>p.monsterId===m.id),`${m.name} has no map annotation`);
  assert.equal(new Set(spawns.records.map(p=>p.monsterId)).size,114);
  assert.equal(new Set(spawns.areas.map(p=>p.monsterId)).size,24);
  assert.equal(spawns.areas.length,29);
});

test('zone-only evidence never fabricates coordinates, and cannot leak to another image or archive',()=>{
  for(const area of spawns.areas){
    assert.equal(area.precision,'zone',area.id);
    for(const key of ['x','y','bounds','radiusX','radiusY'])assert.equal(area[key],undefined,`${area.id}: invented geometry`);
    assert.ok(area.label&&area.note&&spawns.sources[area.sourceId]?.url);
    const maps=views.filter(m=>m.sha256===area.imageSha256&&m.clientZoneIds.includes(area.clientZoneId));
    assert.equal(maps.length,1,area.id);
    assert.ok(markersForMap(spawns,maps[0]).includes(area));
    assert.deepEqual(markersForMap(spawns,maps[0],{layer:'archive'}),[]);
    assert.ok(!markersForMap(spawns,{...maps[0],sha256:'f'.repeat(64)}).includes(area));
  }
});

test('Wandering use entire historical reference zones after the official random-spawn change',()=>{
  const ids=['2305','2309','wandering-devourer','wandering-terrasaurus','wandering-scarab','wandering-snapper'];
  for(const id of ids){
    assert.ok(!spawns.records.some(p=>p.monsterId===id),'2025 map points must not be presented as current');
    const areas=spawns.areas.filter(a=>a.monsterId===id);
    assert.equal(areas.length,1,id);
    assert.equal(areas[0].precision,'zone');
    assert.match(areas[0].note,/losowych/);
    assert.match(areas[0].note,/starszych relacji/);
    const source=spawns.sources[areas[0].sourceId];
    assert.match(source.url,/7762/);
    assert.ok(source.urls.some(url=>url.includes('/4095-')));
  }
});

test('Super Hornet areas reflect the 2026 additions, removed Anima and event Sunshine variant',()=>{
  const areas=spawns.areas.filter(a=>a.monsterId==='super-hornet');
  assert.deepEqual(areas.map(a=>a.label).sort(),['Breezy Hills','El Verloon Desert','Forest of Wisdom','Gorge of Silence','Sunshine Coast (Event)','Valley of Luxem Tower'].sort());
  assert.ok(areas.some(a=>a.clientZoneId===37));
  assert.ok(!areas.some(a=>a.clientZoneId===36));
  assert.ok(spawns.sources[areas[0].sourceId].urls.some(url=>url.includes('/7566-')));
});

test('Worm Dragon variant uncertainty stays visible in both its card and map annotation',()=>{
  assert.match(catalog.monsters.find(m=>m.id==='201').note,/nie potwierdza osobno wariantu NPC 201/);
  assert.match(spawns.areas.find(m=>m.monsterId==='201').note,/nie potwierdza osobno wariantu NPC 201/);
  assert.ok(!spawns.records.some(m=>m.monsterId==='201'));
});

test('new Clan Field points use current IDs and remain attached to their three separate areas',()=>{
  for(const [id,count] of [[11,19],[12,31],[13,29]]){
    const map=views.find(v=>v.clientZoneIds.length===1&&v.clientZoneIds[0]===id);
    const points=markersForMap(spawns,map).filter(p=>!isAreaMarker(p));
    assert.equal(points.length,count);
    assert.ok(points.every(p=>p.clientZoneId===id));
  }
  const first=spawns.records.filter(p=>p.clientZoneId===11);
  assert.deepEqual([...new Set(first.map(p=>p.monsterId))].sort(),['4617','4623','4629','4634','4636','4640']);
});

test('malformed or unlabelled area records are rejected instead of becoming points',()=>{
  const good=spawns.areas[0],map=views.find(m=>m.clientZoneIds.includes(good.clientZoneId)&&m.sha256===good.imageSha256);
  const input=area=>({...spawns,records:[],areas:[area]});
  for(const patch of [{x:0.5},{y:0.5},{bounds:{}},{label:''},{note:''},{precision:'unknown'},{sourceId:'missing'}]){
    assert.deepEqual(markersForMap(input({...good,...patch}),map),[],JSON.stringify(patch));
  }
  const regional={...good,precision:'area',bounds:{left:0.2,top:0.3,right:0.6,bottom:0.7}};
  assert.deepEqual(markersForMap(input(regional),map),[regional]);
  for(const bounds of [{left:-0.1,top:0,right:1,bottom:1},{left:0.8,top:0,right:0.2,bottom:1},{left:0,top:1,right:1,bottom:1}]){
    assert.deepEqual(markersForMap(input({...regional,bounds}),map),[]);
  }
});
