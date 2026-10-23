"""Bundle named official client minimaps; never substitute a transparent placeholder.

Usage: python scripts/import-client-maps.py /path/to/current-maps-manifest.json
       [--derived /path/to/derived-maps-manifest.json]
The extraction manifest supplies exact LIST_ZONE IDs, named paths and checksums.
Only image conversion and presentation grouping are performed here.
"""
import argparse
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('manifest', type=Path)
parser.add_argument('--derived', type=Path)
args = parser.parse_args()
manifest = json.loads(args.manifest.read_text())
world_path = ROOT / 'dist/data/world.json'
world = json.loads(world_path.read_text())
old_maps = {m['name']: m for m in world['maps']}
source = manifest['source']
derived = {}
if args.derived:
    payload = json.loads(args.derived.read_text())
    records = payload if isinstance(payload, list) else payload.get('records', payload.get('maps', []))
    derived = {int(m['zoneId']): m for m in records}

def clean(value):
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items() if k not in ('localPath', 'file', 'originalFile')}
    if isinstance(value, list):
        return [clean(v) for v in value]
    if isinstance(value, str) and value.startswith('/'):
        return Path(value).name
    return value

def copy_asset(image):
    local = Path(image.get('localPath') or image.get('file'))
    actual = hashlib.sha256(local.read_bytes()).hexdigest()
    assert actual == image['sha256'], f'Image checksum mismatch: {local.name}'
    assert image['width'] > 4 and image['height'] > 4, 'A blank minimap is not a map'
    relative = f'assets/maps/{image.get("filename") or local.name}'
    target = ROOT / 'dist' / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    if local.resolve() != target.resolve():
        shutil.copyfile(local, target)
    return relative

groups = {}
excluded = []
pending = []
for z in manifest['zones']:
    zone_id = z['zoneId']
    exclusion = next((f for f in ('titleOrWarpScene', 'explicitlyDeprecated', 'explicitlyUnusedOrInaccessible', 'stressTest') if z.get(f)), None)
    if exclusion:
        excluded.append({'zoneId': zone_id, 'name': z['name'], 'reason': exclusion})
        continue
    if zone_id == 91:
        # The tour and live-zone record point to the same named minimap.
        continue
    d = derived.get(zone_id)
    if not d and z['imageStatus'] != 'extracted':
        pending.append({'zoneId': zone_id, 'name': z['name'], 'reason': z['imageStatus']})
        continue
    im = ({**d, 'localPath': d['image']} if isinstance(d['image'], str) else d['image']) if d else z['image']
    image_path = copy_asset(im)
    name = z['name']
    aliases = [name]
    group_key = str(zone_id)
    label = name
    if zone_id in (11, 12, 13):
        group_key, name, label = 'junon-clan-field', 'Junon Clan Field', f'Obszar {zone_id - 10}'
    elif zone_id in (78, 79):
        group_key, name, label = 'wastelands', 'Wastelands', f'Obszar {zone_id - 77}'
        aliases += ['The Wasteland', 'The Wastelands', 'Wasteland', 'Wastelands']
    elif zone_id in (56, 57):
        group_key, name, label = 'forgotten-temple', 'Forgotten Temple', f'Piętro B{zone_id - 55}'
        aliases += ['Forgotten Temple']
    elif zone_id == 83:
        name = 'Golden Ring'
        aliases += ['Golden Ring']
    elif zone_id == 36:
        name = 'Sunshine Coast'
        aliases += ['Sunshine Coast (Normal)']
    elif zone_id == 37:
        name = 'Sunshine Coast (Event)'
        aliases = [name]
    elif zone_id == 102:
        name = 'Sunshine Coast (CvC)'
        aliases = [name]
    elif zone_id in (130, 153, 161):
        name = z['name'].replace(' (Staging Area)', '') + ' (Staging Area)'
        aliases = [name]
    elif zone_id == 174:
        aliases += ['Age of Zatana (Free Tour)']
    record = {
        'id': f'client-zone-{group_key}', 'name': name, 'zones': sorted(set([name] + aliases)),
        'planet': z['planet'] or 'Inne', 'image': image_path,
        'width': im['width'], 'height': im['height'], 'sha256': im['sha256'],
        'origin': 'official-client-derived' if d else 'official-client',
        'sourceType': 'official-client-geometry' if d else 'official-client-minimap',
        'sourceUrl': 'https://www.roseonlinegame.com/download',
        'sourceManifestUrl': source['manifestUrl'], 'release': source['release'],
        'author': 'ROSE Online / Rednim Games', 'date': source['retrievedAt'],
        'dateBasis': 'Date the current official updater snapshot was retrieved; not the map release date.',
        'assetModifiedAt': im.get('modifiedAt'), 'retrievedAt': source['retrievedAt'],
        'official': True, 'aiGenerated': False, 'historical': False,
        'currentClientVerified': True, 'currentGlobalSpawnsVerified': False,
        'currentServerAvailabilityVerified': False,
        'clientZoneIds': [zone_id] + ([91] if zone_id == 174 else []),
        'clientMinimapPath': z['minimapPath'], 'clientZoneType': z['zoneTypeRaw'],
        'note': ('Widok z góry oryginalnej geometrii i tekstur lokacji z aktualnego klienta Global. Gra nie zawiera dla tej instancji gotowej minimapy. ' + ('Przekrój pomija wyłącznie modele sufitu, aby odsłonić pokoje i korytarze. ' if zone_id == 169 else '') + 'Nie dodano punktów odrodzenia ani domyślanych przejść.') if d else 'Oryginalna minimapa z aktualnych plików oficjalnego klienta Global, pobranych 23.10.2026. Nazwę potwierdza tabela stref gry. Obraz terenu nie potwierdza aktualnych punktów odrodzenia ani dostępności wejścia na serwerze.',
    }
    if d:
        record['geometrySource'] = clean(d.get('source', {}))
    if zone_id == 174 or z.get('freeTour') or z['planet'] == 'Karkia':
        record['availability'] = 'client-only'
        record['availabilityNote'] = 'Mapa znajduje się w plikach klienta. Dostępność dla graczy i zasady wejścia nie zostały potwierdzone.'
    variant = {**record, 'id': str(zone_id), 'label': label, 'zones': [z['name']], 'clientZoneIds': [zone_id]}
    if group_key in groups:
        main = groups[group_key]
        if 'variants' not in main:
            main['variants'] = [main.pop('_firstVariant')]
        main['variants'].append(variant)
        main['zones'] = sorted(set(main['zones'] + record['zones']))
        main['clientZoneIds'] += record['clientZoneIds']
    else:
        record['_firstVariant'] = variant
        groups[group_key] = record

maps = list(groups.values())
for m in maps:
    m.pop('_firstVariant', None)
    old = old_maps.get(m['name'])
    if old and old.get('archive'):
        m['archive'] = old['archive']
    elif old and old.get('origin') != 'official-client' and not old.get('currentClientVerified'):
        m['archive'] = {k: v for k, v in old.items() if k not in ('id', 'name', 'zones', 'planet')}
        m['archive'].update(historical=True, currentGlobalSpawnsVerified=False, origin='community-screenshot')

world['version'] = 2
world['maps'] = sorted(maps, key=lambda m: (m['planet'], m['name']))
world['mapCoverage'] = {
    'sourceRelease': source['release'], 'retrievedAt': source['retrievedAt'],
    'zoneCount': len(maps), 'viewCount': sum(len(m.get('variants', [m])) for m in maps),
    'clientZoneCount': sum(len(m['clientZoneIds']) for m in maps),
    'excludedClientScenes': excluded, 'pending': pending,
    'clientPresenceDoesNotConfirmServerAvailability': True,
}
world_path.write_text(json.dumps(world, ensure_ascii=False, separators=(',', ':')) + '\n')
snapshot = clean(manifest)
snapshot['integrationPolicy'] = world['mapCoverage']
(ROOT / 'scripts/current-client-map-manifest.json').write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n')
if args.derived:
    (ROOT / 'scripts/derived-client-map-manifest.json').write_text(json.dumps(clean(payload), ensure_ascii=False, indent=2) + '\n')
# Remove only unreferenced map images from this app's asset directory.
used = {v['image'] for m in maps for v in [m, *m.get('variants', []), *([m['archive']] if m.get('archive') else [])]}
for p in (ROOT / 'dist/assets/maps').iterdir():
    if p.is_file() and p.suffix.lower() in ('.png', '.jpg', '.webp') and f'assets/maps/{p.name}' not in used:
        p.unlink()
print(json.dumps(world['mapCoverage'], ensure_ascii=False))
