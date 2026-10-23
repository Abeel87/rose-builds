import test from 'node:test';
import assert from 'node:assert/strict';
import { readRoute, routeHash, mapRoute, selectedZone } from '../dist/navigation.js';

test('Xita Refuge map link retains planet, search and zoom through refresh', () => {
  const href=mapRoute('Xita Refuge',{planet:'Eldeon',mapQ:'Xita',zoom:1.75,mapLayer:'archive'});
  const restored=readRoute(href);
  assert.equal(restored.zone,'Xita Refuge');
  assert.equal(restored.planet,'Eldeon');
  assert.equal(restored.mapQ,'Xita');
  assert.equal(restored.zoom,1.75);
  assert.equal(restored.mapLayer,'archive');
  assert.equal(routeHash(restored),href);
});
test('back destination retains result page, filters and per-monster loot query', () => {
  for(const href of ['#/atlas?q=King&planet=Orlo&kind=all&page=3&located=1', '#/drops?q=Sikuku&type=Weapon&page=2&all=1', '#/monster/203?loot=Jelly&page=2']) {
    const before=readRoute(href),after=readRoute(routeHash(before));
    assert.deepEqual(after,before);
  }
});
test('missing map never silently selects Adventurer’s Plains; empty search does not change selection', () => {
  const zones=[{name:"Adventurer's Plains",planet:'Junon'},{name:'Xita Refuge',planet:'Eldeon'}];
  assert.equal(selectedZone(zones,{zone:'Xita Refuge',mapQ:'no match'}).name,'Xita Refuge');
  assert.equal(selectedZone(zones,{zone:'Unknown map'}),undefined);
  assert.equal(selectedZone(zones,{planet:'Eldeon'}).name,'Xita Refuge');
  assert.equal(selectedZone(zones,{planet:'Orlo'}),undefined);
});
test('route parsing handles malformed pagination, zoom and accented map names safely', () => {
  assert.equal(readRoute('#/map?zoom=Infinity').zoom,1);
  assert.equal(readRoute('#/map?zoom=20').zoom,3);
  assert.equal(readRoute('#/atlas?page=-20').page,1);
  assert.equal(readRoute('#/atlas?page=nope').page,1);
  const zone="Adventurer's Plains / Łąka & las";
  assert.equal(readRoute(mapRoute(zone)).zone,zone);
});
