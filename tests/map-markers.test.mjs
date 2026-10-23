import test from 'node:test';
import assert from 'node:assert/strict';
import {markersForMap, mapMarkerGroups} from '../dist/map-markers.js';

const HASH = 'a'.repeat(64), OTHER_HASH = 'b'.repeat(64);
const map = {sha256: HASH, clientZoneIds: [56]};
const marker = (overrides = {}) => ({
  id: 'spawn-56-1', monsterId: '203', clientZoneId: 56,
  imageSha256: HASH, x: 0.25, y: 0.75, sourceId: 'client', layer: 'terrain', ...overrides
});
const spawns = records => ({version: 1, sources: {
  client: {label: 'Client snapshot', type: 'client', date: '2026-10-23', url: 'https://example.com/client', note: 'Client data'},
  community: {label: 'Archived map', type: 'community', date: '2023-02-03', url: 'https://example.com/map', note: 'Historical reference'}
}, records});

test('markers stay on the exact image and selected zone, even when areas share a bitmap', () => {
  const first = marker(), second = marker({id: 'second-floor', clientZoneId: 57});
  const stale = marker({id: 'old-image', imageSha256: OTHER_HASH});
  const data = spawns([first, second, stale]);
  assert.deepEqual(markersForMap(data, map), [first]);
  assert.deepEqual(markersForMap(data, {sha256: HASH, clientZoneIds: [57]}), [second]);
  assert.deepEqual(markersForMap(data, {sha256: OTHER_HASH, clientZoneIds: [56]}), [stale]);
  assert.equal(markersForMap(data, map)[0], first, 'return the original validated record');
});

test('archive layers never inherit terrain markers from merged map metadata', () => {
  const data = spawns([marker(), marker({id: 'archive-record', layer: 'archive'})]);
  const mergedArchive = {...map, image: 'archive.webp', historical: true};
  assert.deepEqual(markersForMap(data, mergedArchive, {layer: 'archive'}), []);
  assert.deepEqual(markersForMap(data, map).map(m => m.id), ['spawn-56-1']);
  assert.deepEqual(markersForMap(data, {clientZoneIds: [56]}), []);
  assert.deepEqual(markersForMap(data, {sha256: HASH}), []);
  assert.deepEqual(markersForMap({...data, version: 2}, map), []);
});

test('coordinate and radius validation rejects malformed values without moving them onto the map', () => {
  const invalid = [undefined, null, '', '0.5', NaN, Infinity, -Infinity, -0.001, 1.001];
  for (const field of ['x', 'y']) for (const value of invalid) {
    assert.deepEqual(markersForMap(spawns([marker({[field]: value})]), map), [], `${field}: ${String(value)}`);
  }
  for (const field of ['radiusX', 'radiusY']) for (const value of invalid.filter(v => v !== undefined)) {
    assert.deepEqual(markersForMap(spawns([marker({[field]: value})]), map), [], `${field}: ${String(value)}`);
  }
  const edges = marker({x: 0, y: 1, radiusX: 0, radiusY: 1});
  assert.deepEqual(markersForMap(spawns([edges]), map), [edges]);
});

test('invalid identities, missing sources and duplicate IDs do not become extra pins', () => {
  const good = marker();
  const bad = [
    null, marker({id: ''}), marker({id: 1}), marker({id: ' padded '}),
    marker({monsterId: 203}), marker({monsterId: ''}),
    marker({clientZoneId: '56'}), marker({clientZoneId: 56.5}),
    marker({imageSha256: ''}), marker({sourceId: 'unknown'}), marker({sourceId: 'toString'}),
    marker({layer: undefined})
  ];
  assert.deepEqual(markersForMap(spawns([...bad, good, {...good, x: 0.9}]), map), [good]);
  const sameSpotOtherKing = marker({id: 'another-king', monsterId: '207'});
  assert.deepEqual(markersForMap(spawns([good, sameSpotOtherKing]), map), [good, sameSpotOtherKing]);
});

test('groups have stable name-sorted numbers, count points and retain their monster records', () => {
  const jelly = {id: '203', name: 'Jelly King', locations: []};
  const aqua = {id: '207', name: 'Aqua King', locations: []};
  const index = new Map([['203', jelly], ['207', aqua]]);
  const first = marker(), second = marker({id: 'jelly-second', x: 0.6});
  const third = marker({id: 'aqua', monsterId: '207'});
  const input = Object.freeze([first, third, second, first, marker({id: 'unknown', monsterId: 'absent'})]);
  const groups = mapMarkerGroups(input, index);
  assert.deepEqual(groups.map(({monsterId, name, number, count}) => ({monsterId, name, number, count})), [
    {monsterId: '207', name: 'Aqua King', number: 1, count: 1},
    {monsterId: '203', name: 'Jelly King', number: 2, count: 2}
  ]);
  assert.deepEqual(Object.keys(groups[0]), ['monsterId', 'monster', 'name', 'number', 'count', 'markers']);
  assert.equal(groups[0].monster, aqua);
  assert.deepEqual(groups[1].markers, [first, second]);
  assert.deepEqual(mapMarkerGroups([...input].reverse(), index).map(g => [g.monsterId, g.number, g.count]), groups.map(g => [g.monsterId, g.number, g.count]));
  assert.equal(groups[1].monster.locations.length, 0, 'new evidence need not already appear in catalog locations');
});

test('same-name monsters remain separate groups with deterministic identity tie-breaking', () => {
  const index = new Map([['b', {name: 'King'}], ['a', {name: 'King'}]]);
  const groups = mapMarkerGroups([marker({id: 'b', monsterId: 'b'}), marker({id: 'a', monsterId: 'a'})], index);
  assert.deepEqual(groups.map(g => [g.monsterId, g.number]), [['a', 1], ['b', 2]]);
  assert.deepEqual(mapMarkerGroups(undefined, index), []);
  assert.deepEqual(mapMarkerGroups([], undefined), []);
});
