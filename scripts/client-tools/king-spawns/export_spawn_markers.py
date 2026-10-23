"""Convert exact current IFO points to exact original minimap images."""
from pathlib import Path
import argparse, hashlib, json

BASE = Path('/workspace/scratch/520b87b7114a')
ROOT = BASE / 'king-spawn-analysis'
SITE = BASE / 'rose-companion/dist'
MINIMAP_SOURCE = 'https://github.com/exjam/rose-offline-client/blob/9802251b1f99921cc67408273e0c1e0133153a55/src/ui/ui_minimap_system.rs'
WORLD_SOURCE = 'https://github.com/exjam/rose-offline/blob/4a648ba720278f69bb8ee6257564175c271e081c/rose-data-irose/src/zone_database.rs'


def map_images(world):
    images = []
    for m in world['maps']:
        images.append(m)
        images.extend(m.get('variants', []))
    return images


def project(zone, position, image):
    info = zone['zoneInfo']
    block_cm = 16 * info['gridPerPatch'] * info['gridSize']
    px_cm = block_cm / 64
    gx = position[0] + 32.5 * block_cm
    gy = position[1] + 32.5 * block_cm
    start_x, start_y = map(int, zone['minimapOrigin'])
    px = 64 + (gx - start_x * block_cm) / px_cm
    py = 64 + ((65 - start_y) * block_cm - gy) / px_cm
    return {'pixelX': px, 'pixelY': py, 'x': px/image['width'], 'y': py/image['height'], 'blockSizeCm': block_cm, 'centimetresPerPixel': px_cm, 'globalCm': [gx, gy, position[2]]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('inputs', nargs='+', type=Path)
    parser.add_argument('--output', default='spawns-priority.json')
    args = parser.parse_args()
    world = json.loads((SITE / 'data/world.json').read_text())
    catalog = json.loads((SITE / 'data/catalog.json').read_text())
    catalog_ids = {r['id'] for r in catalog['monsters'] if r['kind'] != 'monster'}
    candidates = map_images(world)
    sources, records, evidence, omitted = {}, [], [], []
    seen = set()
    for path in args.inputs:
        manifest = json.loads(path.read_text())
        source = manifest['source']
        if 'release' not in source:
            raise ValueError('Only the current official updater snapshot is accepted by this export')
        source_id = 'global-client-' + source['release'].split('/')[-1]
        sources[source_id] = {'label': 'Punkty pojawiania się zapisane w kliencie ROSE Global', 'type': 'client', 'date': source['retrievedAt'], 'url': source['manifestUrl'], 'note': 'Pozycje odczytane z plików stref oficjalnego klienta. Wskazują zapisane punkty; nie potwierdzają aktualnej obecności bossa ani ustawień serwera.'}
        for zone in manifest['zones']:
            matches = [m for m in candidates if zone['zoneId'] in m.get('clientZoneIds', []) and m.get('sourceType') == 'official-client-minimap' and m.get('clientMinimapPath') == zone['clientMinimapPath']]
            images = {m['sha256']: m for m in matches}
            if len(images) != 1:
                omitted.append({'zoneId':zone['zoneId'],'reason':'No unique original minimap image matching zone ID and exact client path','imageCandidates':list(images)})
                continue
            image = next(iter(images.values()))
            actual_sha = hashlib.sha256((SITE / image['image']).read_bytes()).hexdigest()
            if actual_sha != image['sha256']:
                raise ValueError('Published map bytes do not match world.json SHA')
            for ref in zone['bossReferences']:
                if ref['catalogId'] not in catalog_ids:
                    raise ValueError('Unrecognized boss catalog ID')
                key = (zone['zoneId'], ref['catalogId'], ref['path'], ref['byteOffset'])
                if key in seen:
                    continue
                seen.add(key)
                coord = project(zone, ref['object']['position'], image)
                if not (0 <= coord['x'] <= 1 and 0 <= coord['y'] <= 1):
                    omitted.append({'zoneId':zone['zoneId'],'catalogId':ref['catalogId'],'path':ref['path'],'byteOffset':ref['byteOffset'],'reason':'Projected point outside image; not clamped','projection':coord})
                    continue
                ident = f"client-{zone['zoneId']}-{ref['catalogId']}-" + hashlib.sha256(f"{ref['path']}:{ref['byteOffset']}".encode()).hexdigest()[:10]
                rec = {'id':ident,'monsterId':str(ref['catalogId']),'clientZoneId':zone['zoneId'],'imageSha256':image['sha256'],'x':round(coord['x'],9),'y':round(coord['y'],9),'sourceId':source_id,'layer':'terrain'}
                records.append(rec)
                evidence.append({**rec,'name':ref['name'],'image':image['image'],'width':image['width'],'height':image['height'],'zonePath':zone['zonePath'],'zonSha256':zone['zonSha256'],'minimapPath':zone['clientMinimapPath'],'minimapOrigin':zone['minimapOrigin'],'zoneInfo':zone['zoneInfo'],'projection':coord,'ifo':ref,'sourceInput':str(path),'sourceSnapshot':source,'liveServerVerified':False,'rangeNote':'IFO range retained raw. Reference engine uses independent x/y offsets within ±range metres (square). No ellipse/radius is exported.'})
    # Distinct IFO objects can have the exact same monster/image position. Keep
    # both source objects in evidence, while exposing one tappable map location.
    locations, source_to_marker = {}, {}
    for record in records:
        key = (record['monsterId'], record['clientZoneId'], record['imageSha256'], record['x'], record['y'], record['sourceId'], record['layer'])
        if key not in locations:
            locations[key] = dict(record)
        else:
            first = locations[key]
            first['sourceObjectCount'] = first.get('sourceObjectCount', 1) + 1
        source_to_marker[record['id']] = locations[key]['id']
    records = list(locations.values())
    for source_object in evidence:
        source_object['runtimeMarkerId'] = source_to_marker[source_object['id']]
    records.sort(key=lambda x:(x['clientZoneId'],x['monsterId'],x['x'],x['y']))
    output = ROOT / args.output
    output.write_text(json.dumps({'version':1,'sources':sources,'records':records},ensure_ascii=False,indent=2)+'\n')
    proof = {'formatVersion':1,'minimapProjectionSource':MINIMAP_SOURCE,'ifoWorldOffsetSource':WORLD_SOURCE,'formula':'B=16*gridPerPatch*gridSize; globalXY=rawIFOxy+32.5*B; px=64+(globalX-startX*B)/(B/64); py=64+((65-startY)*B-globalY)/(B/64); normalize by full image dimensions','deduplication':'Repeated basic/tactic entries in one IFO object create one source record per monster. Different IFO objects remain in evidence. Exact monster/zone/image/x/y/source/layer overlaps are represented by one runtime location with sourceObjectCount; runtimeMarkerId links every source record to it.','radiusExported':False,'records':evidence,'omitted':omitted}
    output.with_name(output.stem+'-evidence.json').write_text(json.dumps(proof,ensure_ascii=False,indent=2)+'\n')
    summary = {'output':str(output),'recordCount':len(records),'sourceObjectCount':len(evidence),'uniqueBosses':len({r['monsterId'] for r in records}),'zoneCount':len({r['clientZoneId'] for r in records}),'omitted':len(omitted),'zones':{str(z):sum(r['clientZoneId']==z for r in records) for z in sorted({r['clientZoneId'] for r in records})}}
    print(json.dumps(summary,ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
