import test from 'node:test';
import assert from 'node:assert/strict';
import {setVisuals,mapForZone,canonicalZone,zoneMatches} from '../dist/visuals.js';

test('map index normalizes aliases and preserves the first matching map',()=>{
  const first={name:'Golden Ring',zones:['The Golden Ring','Wspólny Alias','Łąka']};
  const second={name:'Wspolny Alias',zones:['The Golden Ring','Second alias']};
  setVisuals({},{maps:[first,second]});
  assert.equal(mapForZone('  THE GOLDEN RING  '),first);
  assert.equal(mapForZone('łĄKA'),first);
  assert.equal(mapForZone('wspolny alias'),first);
  assert.equal(mapForZone('Second alias'),second);
  assert.equal(canonicalZone('The Golden Ring'),'Golden Ring');
  assert.equal(zoneMatches('The Golden Ring','Golden Ring'),true);
  assert.equal(mapForZone('unknown zone'),undefined);
  assert.equal(mapForZone(''),undefined);
});

test('setVisuals replaces the map index and clears it when maps are omitted',()=>{
  const previous={name:'Old map',zones:['Old alias','Shared alias']};
  const replacement={name:'New map',zones:['Shared alias']};
  setVisuals({},{maps:[previous]});
  assert.equal(mapForZone('Shared alias'),previous);
  setVisuals({},{maps:[replacement]});
  assert.equal(mapForZone('Old alias'),undefined);
  assert.equal(mapForZone('Old map'),undefined);
  assert.equal(mapForZone('Shared alias'),replacement);
  setVisuals({});
  assert.equal(mapForZone('Shared alias'),undefined);
  assert.equal(mapForZone('New map'),undefined);
  assert.equal(mapForZone(undefined),undefined);
});
