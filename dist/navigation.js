// URL state survives detail pages, browser Back/Forward and a full refresh.
const bounded = (value, fallback, min, max) => {
  const n = Number(value);
  return value !== null && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
};

export function readRoute(hash = '#/home') {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const [view = 'home', id] = path.split('/');
  const p = new URLSearchParams(query);
  return {
    view: view || 'home', id: id || null,
    q: p.get('q') || '', planet: p.get('planet') || '', type: p.get('type') || '',
    kind: p.get('kind') === 'all' ? '' : p.get('kind') ?? 'kings',
    page: Math.floor(bounded(p.get('page'), 1, 1, 100000)),
    detailQ: p.get('loot') || '', mapQ: p.get('mapq') || '', zone: p.get('zone') || '',
    zoom: bounded(p.get('zoom'), 1, 1, 3),
    mapLayer: p.get('layer') === 'archive' ? 'archive' : 'terrain',
    mapVariant: p.get('variant') || '',
    mapKing: p.get('king') || '', mapMarker: p.get('point') || '',
    showMarkers: p.get('pins') !== '0',
    knownLocation: p.get('located') === '1', officialOnly: p.get('official') === '1',
    onlyDrops: p.get('all') !== '1', sharedBuild: p.get('data') || ''
  };
}

export function routeHash(s) {
  const p = new URLSearchParams();
  if (s.view === 'map') {
    if (s.zone) p.set('zone', s.zone);
    if (s.planet) p.set('planet', s.planet);
    if (s.mapQ) p.set('mapq', s.mapQ);
    if (s.zoom > 1) p.set('zoom', s.zoom);
    if (s.mapLayer === 'archive') p.set('layer', 'archive');
    if (s.mapVariant) p.set('variant', s.mapVariant);
    if (s.mapKing) p.set('king', s.mapKing);
    if (s.mapMarker) p.set('point', s.mapMarker);
    if (s.showMarkers === false) p.set('pins', '0');
  } else {
    if (s.q) p.set('q', s.q);
    if (s.planet) p.set('planet', s.planet);
    if (s.type) p.set('type', s.type);
    if (s.view === 'atlas' && s.kind !== 'kings') p.set('kind', s.kind || 'all');
    if (s.onlyDrops === false) p.set('all', '1');
    if (s.officialOnly) p.set('official', '1');
    if (s.knownLocation) p.set('located', '1');
    if (s.page > 1) p.set('page', s.page);
    if (s.detailQ) p.set('loot', s.detailQ);
    if (s.sharedBuild) p.set('data', s.sharedBuild);
  }
  return `#/${s.view}${s.id ? '/' + s.id : ''}${p.size ? '?' + p : ''}`;
}

export function mapRoute(zone, {planet = '', mapQ = '', zoom = 1, mapLayer = 'terrain', mapVariant = '', mapKing = '', mapMarker = '', showMarkers = true} = {}) {
  return routeHash({view: 'map', zone, planet, mapQ, zoom, mapLayer, mapVariant, mapKing, mapMarker, showMarkers});
}

export function selectedZone(zones, {zone = '', planet = ''} = {}) {
  // An explicit missing zone must never silently open another map.
  if (zone) return zones.find(z => z.name === zone);
  return zones.find(z => !planet || z.planet === planet);
}
