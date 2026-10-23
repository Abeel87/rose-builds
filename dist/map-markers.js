const validId = value => typeof value === 'string' && value.length > 0 && value.trim() === value;
const unitValue = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
const zoneId = value => Number.isInteger(value) && value > 0;
const imageHash = value => typeof value === 'string' && /^[a-f\d]{64}$/i.test(value) ? value.toLowerCase() : null;

// Coordinates refer to the full image, including any border in the original map.
// The caller must pass the resolved floor/area, not its parent atlas entry.
export function markersForMap(spawns, map, {layer = 'terrain'} = {}) {
  const hash = imageHash(map?.sha256);
  const zones = new Set(Array.isArray(map?.clientZoneIds) ? map.clientZoneIds.filter(zoneId) : []);
  if (layer !== 'terrain' || spawns?.version !== 1 || !hash || !zones.size || !Array.isArray(spawns.records)) return [];
  const sources = spawns.sources;
  if (!sources || typeof sources !== 'object' || Array.isArray(sources)) return [];
  const seen = new Set();
  return spawns.records.filter(marker => {
    if (!marker || !validId(marker.id) || !validId(marker.monsterId) || !validId(marker.sourceId)) return false;
    if (!zoneId(marker.clientZoneId) || !zones.has(marker.clientZoneId) || marker.layer !== layer || imageHash(marker.imageSha256) !== hash) return false;
    if (!unitValue(marker.x) || !unitValue(marker.y)) return false;
    if (['radiusX', 'radiusY'].some(key => marker[key] !== undefined && !unitValue(marker[key]))) return false;
    if (!Object.hasOwn(sources, marker.sourceId) || !['client', 'community'].includes(sources[marker.sourceId]?.type)) return false;
    if (seen.has(marker.id)) return false;
    seen.add(marker.id);
    return true;
  });
}

export function mapMarkerGroups(markers, monsterIndex) {
  if (!Array.isArray(markers) || typeof monsterIndex?.get !== 'function') return [];
  const groups = new Map(), seen = new Set();
  for (const marker of markers) {
    if (!marker || !validId(marker.id) || !validId(marker.monsterId) || seen.has(marker.id)) continue;
    const monster = monsterIndex.get(marker.monsterId);
    if (!monster || typeof monster.name !== 'string' || !monster.name.trim()) continue;
    seen.add(marker.id);
    if (!groups.has(marker.monsterId)) groups.set(marker.monsterId, {monsterId: marker.monsterId, monster, name: monster.name, markers: []});
    groups.get(marker.monsterId).markers.push(marker);
  }
  return [...groups.values()]
    .sort((a, b) => a.name.localeCompare(b.name, 'pl') || a.monsterId.localeCompare(b.monsterId, 'en'))
    .map((group, index) => ({monsterId: group.monsterId, monster: group.monster, name: group.name, number: index + 1, count: group.markers.length, markers: group.markers}));
}

// Add source-labelled map links to the runtime catalog. Original catalog records
// and existing location provenance stay intact; server presence is not inferred.
export function withClientSpawnLocations(monsters, maps, spawns) {
  const byMonster = new Map();
  for (const map of maps) {
    const ids = new Set((map.variants ?? [map]).flatMap(view => markersForMap(spawns, view))
      .filter(point => spawns.sources[point.sourceId]?.type === 'client').map(point => point.monsterId));
    for (const id of ids) {
      if (!byMonster.has(id)) byMonster.set(id, []);
      byMonster.get(id).push(map);
    }
  }
  return monsters.map(monster => {
    const locations = [...monster.locations];
    for (const map of byMonster.get(monster.id) ?? []) {
      const names = new Set([map.name, ...(map.zones ?? [])]);
      if (!locations.some(location => names.has(location.zone))) {
        locations.push({zone: map.name, planet: map.planet, source: 'client-spawns'});
      }
    }
    return locations.length === monster.locations.length ? monster : {...monster, locations};
  });
}
