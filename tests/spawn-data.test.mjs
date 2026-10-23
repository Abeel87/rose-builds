import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {markersForMap, withClientSpawnLocations} from '../dist/map-markers.js';

const read = name => JSON.parse(readFileSync(new URL(`../dist/data/${name}.json`, import.meta.url)));
const spawns = read('spawns');
const catalog = read('catalog');
const world = read('world');
const monsters = new Map(catalog.monsters.map(monster => [monster.id, monster]));
// Parent atlas cards aggregate zones. Only resolved variants represent a
// specific displayed image, so they replace their parent for identity checks.
const displayedMaps = world.maps.flatMap(map => map.variants?.length ? map.variants : [map]);
const locationKey = marker => [marker.monsterId, marker.clientZoneId, marker.imageSha256, marker.x, marker.y, marker.layer].join('|');

test('current client locations reach previously unlocated boss cards without changing original provenance', () => {
  const original=structuredClone(catalog.monsters);
  const enriched=withClientSpawnLocations(catalog.monsters,world.maps,spawns);
  const byId=new Map(enriched.map(monster=>[monster.id,monster]));
  assert.deepEqual(catalog.monsters,original,'the source catalog is not mutated');
  for(const id of new Set(spawns.records.map(point=>point.monsterId)))assert.ok(byId.get(id).locations.length,id);
  assert.ok(byId.get('79').locations.some(location=>location.zone==='Valley of Luxem Tower'&&location.source==='client-spawns'));
  assert.ok(byId.get('1343').locations.some(location=>location.zone==='Forest of Wisdom'&&location.source==='client-spawns'));
  for(const monster of original)assert.deepEqual(byId.get(monster.id).locations.slice(0,monster.locations.length),monster.locations);
  assert.deepEqual(withClientSpawnLocations(enriched,world.maps,spawns),enriched,'repeated enrichment does not duplicate map links');
});

test('spawn snapshot contains 590 locations from 591 source objects for 114 catalog bosses', () => {
  assert.equal(spawns.version, 1);
  assert.equal(spawns.records.length, 590);
  assert.equal(new Set(spawns.records.map(marker => marker.monsterId)).size, 114);
  assert.equal(new Set(spawns.records.map(marker => marker.clientZoneId)).size, 43);
  assert.equal(spawns.records.reduce((count, marker) => count + (marker.sourceObjectCount ?? 1), 0), 591);
  for (const [id, source] of Object.entries(spawns.sources)) {
    assert.ok(id.length > 0);
    assert.ok(['client', 'community', 'official'].includes(source.type), id);
    assert.ok(source.label && source.note && source.date, id);
    assert.equal(new URL(source.url).protocol, 'https:', id);
  }
});

test('all spawn IDs, catalog references, coordinates and physical locations are valid and unique', () => {
  const ids = new Set();
  const locations = new Set();
  for (const marker of spawns.records) {
    assert.equal(typeof marker.id, 'string');
    assert.ok(marker.id.length > 0 && marker.id.trim() === marker.id);
    assert.ok(!ids.has(marker.id), `duplicate marker ID: ${marker.id}`);
    ids.add(marker.id);
    assert.equal(typeof marker.monsterId, 'string');
    assert.ok(monsters.has(marker.monsterId), marker.id);
    assert.notEqual(monsters.get(marker.monsterId).kind, 'monster', marker.id);
    assert.ok(Number.isInteger(marker.clientZoneId) && marker.clientZoneId > 0, marker.id);
    assert.match(marker.imageSha256, /^[a-f\d]{64}$/);
    assert.equal(marker.layer, 'terrain');
    assert.ok(Object.hasOwn(spawns.sources, marker.sourceId), marker.id);
    for (const field of ['x', 'y', 'radiusX', 'radiusY']) {
      if (marker[field] === undefined && field.startsWith('radius')) continue;
      assert.equal(typeof marker[field], 'number', `${marker.id}: ${field}`);
      assert.ok(Number.isFinite(marker[field]) && marker[field] >= 0 && marker[field] <= 1, `${marker.id}: ${field} outside image`);
    }
    assert.ok(Number.isInteger(marker.sourceObjectCount ?? 1) && (marker.sourceObjectCount ?? 1) >= 1, marker.id);
    const key = locationKey(marker);
    assert.ok(!locations.has(key), `duplicate physical location: ${marker.id}`);
    locations.add(key);
  }
});

test('each location matches exactly one resolved map by zone and actual WEBP SHA256', () => {
  const verifiedFiles = new Map();
  for (const marker of spawns.records) {
    const matches = displayedMaps.filter(map => map.sha256 === marker.imageSha256 && map.clientZoneIds?.includes(marker.clientZoneId));
    assert.equal(matches.length, 1, `${marker.id}: ambiguous or missing map variant`);
    const map = matches[0];
    assert.equal(map.sourceType, 'official-client-minimap', marker.id);
    assert.equal(map.historical, false, marker.id);
    if (!verifiedFiles.has(map.image)) {
      const bytes = readFileSync(new URL(`../dist/${map.image}`, import.meta.url));
      verifiedFiles.set(map.image, createHash('sha256').update(bytes).digest('hex'));
    }
    assert.equal(verifiedFiles.get(map.image), marker.imageSha256, marker.id);
    assert.ok(markersForMap(spawns, map).some(candidate => candidate.id === marker.id), marker.id);
  }
});

test('Wastelands variants retain six and five locations with the correct King counts', () => {
  const wastelands = world.maps.find(map => map.clientZoneIds?.includes(78) && map.clientZoneIds?.includes(79));
  assert.ok(wastelands?.variants, 'Wastelands must expose distinct areas');
  const first = wastelands.variants.find(map => map.clientZoneIds?.length === 1 && map.clientZoneIds[0] === 78);
  const second = wastelands.variants.find(map => map.clientZoneIds?.length === 1 && map.clientZoneIds[0] === 79);
  assert.ok(first && second);
  assert.notEqual(first.sha256, second.sha256);
  const a = markersForMap(spawns, first);
  const b = markersForMap(spawns, second);
  assert.equal(a.length, 6);
  assert.equal(b.length, 5);
  const counts = markers => Object.fromEntries(['2226', '2247', '2296'].map(id => [id, markers.filter(marker => marker.monsterId === id).length]));
  assert.deepEqual(counts(a), {'2226': 3, '2247': 2, '2296': 1});
  assert.deepEqual(counts(b), {'2226': 2, '2247': 2, '2296': 1});
  assert.ok(a.every(marker => marker.clientZoneId === 78 && marker.imageSha256 === first.sha256));
  assert.ok(b.every(marker => marker.clientZoneId === 79 && marker.imageSha256 === second.sha256));
  assert.equal(new Set([...a, ...b].map(marker => marker.id)).size, 11);
  // The image and zone must agree together; neither one alone is sufficient.
  assert.deepEqual(markersForMap(spawns, {...first, sha256: second.sha256}), []);
  assert.deepEqual(markersForMap(spawns, {...second, sha256: first.sha256}), []);
});

test('terrain locations never leak into archive layers or unrelated map variants', () => {
  for (const map of displayedMaps) {
    const selected = markersForMap(spawns, map);
    const selectedIds = new Set(selected.map(marker => marker.id));
    for (const marker of spawns.records) {
      if (marker.imageSha256 !== map.sha256 || !map.clientZoneIds?.includes(marker.clientZoneId)) {
        assert.ok(!selectedIds.has(marker.id), `${marker.id} leaked into ${map.id}`);
      }
    }
    assert.deepEqual(markersForMap(spawns, map, {layer: 'archive'}), [], map.id);
  }
  for (const parent of [...world.maps, ...displayedMaps]) {
    if (!parent.archive) continue;
    const archive = {...parent, ...parent.archive};
    assert.deepEqual(markersForMap(spawns, archive, {layer: 'archive'}), [], parent.id);
    // Some old screenshot metadata has no SHA. Its true image identity must
    // never be inferred by inheriting the parent terrain image's hash.
    const archiveBytes = readFileSync(new URL(`../dist/${archive.image}`, import.meta.url));
    const actualArchive = {...archive, sha256: createHash('sha256').update(archiveBytes).digest('hex')};
    assert.deepEqual(markersForMap(spawns, actualArchive), [], `archive image hash accepted terrain markers: ${parent.id}`);
  }
});

test('two coincident Kaiman source objects remain one tappable location with their source count', () => {
  const merged = spawns.records.filter(marker => (marker.sourceObjectCount ?? 1) > 1);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].id, 'client-27-1369-76d1529455');
  assert.equal(merged[0].monsterId, '1369');
  assert.equal(merged[0].clientZoneId, 27);
  assert.equal(merged[0].sourceObjectCount, 2);
  assert.ok(!spawns.records.some(marker => marker.id === 'client-27-1369-924f907363'));
});
