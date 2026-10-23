"""Write compact metadata/provenance and coverage without copying game assets."""
from pathlib import Path
import argparse, hashlib, json

BASE = Path('/workspace/scratch/520b87b7114a')
ROOT = BASE / 'king-spawn-analysis'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('inputs', type=Path, nargs='+')
    args = parser.parse_args()
    runtime_path = ROOT / 'spawns-client.json'
    runtime = json.loads(runtime_path.read_text())
    full = json.loads((ROOT / 'spawns-client-evidence.json').read_text())
    zones = [z for path in args.inputs for z in json.loads(path.read_text())['zones']]
    raw_files = {f['path']:f for z in zones for f in z['files']}
    models = json.loads((BASE / 'rose-companion/scripts/boss-appearances-manifest.json').read_text())['records']
    records = runtime['records']
    covered = {r['monsterId'] for r in records}
    assert len({r['id'] for r in records}) == len(records)
    keys = [(r['monsterId'],r['clientZoneId'],r['imageSha256'],r['x'],r['y'],r['layer']) for r in records]
    assert len(set(keys)) == len(keys)
    assert sum(r.get('sourceObjectCount',1) for r in records) == len(full['records'])
    runtime_ids = {r['id'] for r in records}
    assert all(r['runtimeMarkerId'] in runtime_ids for r in full['records'])
    coverage = {
        'version':1, 'date':'2026-10-23', 'runtimeManifest':'dist/data/spawns.json',
        'runtimeSha256':sha(runtime_path), 'runtimeBytes':runtime_path.stat().st_size,
        'catalogBossCount':len(models), 'coveredBossCount':len(covered),
        'markerCount':len(records), 'sourceObjectCount':len(full['records']),
        'mergedSourceObjectCount':len(full['records'])-len(records),
        'zonesWithMarkers':len({r['clientZoneId'] for r in records}),
        'currentZonesInspected':len(zones), 'currentIfosParsed':sum(len(z['files']) for z in zones),
        'parseErrors':sum(len(z['errors']) for z in zones), 'outsideImageMarkers':0,
        'currentSnapshot':'releases/ci-38925666467-1', 'liveServerVerified':False,
        'radiusExported':False, 'allRuntimeImagesShaChecked':True,
        'allRuntimeIdsUnique':True, 'allRuntimeLocationsUnique':True,
        'missingCatalogEntries':[{'monsterId':r['catalogId'],'npcId':r['npcId'],'name':r['name'],'status':'No usable exact marker found in the inspected current IFO MonsterSpawn/NPC blocks; do not infer coordinates.'} for r in models if r['catalogId'] not in covered],
        'noMonsterSpawnZones':[{'clientZoneId':z['zoneId'],'name':z['sourceName'],'ifoCount':len(z['files']),'npcCount':sum(len(f['npcs']) for f in z['files'])} for z in zones if not any(f['monsterSpawns'] for f in z['files'])],
        'scopeNotes':[
            'Only current updater bytes contribute runtime markers. The old installer was used to choose candidate zones.',
            '38 zones with catalog boss references plus six event/dungeon zones were inspected in the current client; this is not an exhaustive claim about every client file.',
            full['deduplication'],
            'Client definitions do not confirm active live-server spawns, encounter state, timing or availability.',
            'Coordinates include the complete original minimap and its 64-pixel outline. Exact clientZoneId/imageSha256/layer pairing is mandatory.',
            'Radius omitted: reference-engine range describes independent x/y offsets, not a proven circular roaming radius.',
        ],
    }
    used_paths = sorted({r['ifo']['path'] for r in full['records']})
    file_index = {path:i for i,path in enumerate(used_paths)}
    files = [{k:f[k] for k in ['path','sha256','sizeBytes','modifiedAt','offset','encrypted']} for path in used_paths for f in [raw_files[path]]]
    images = {r['imageSha256']:{'sha256':r['imageSha256'],'image':r['image'],'width':r['width'],'height':r['height']} for r in full['records']}
    zone_proof = {}
    source_objects = []
    merged = {}
    for r in full['records']:
        z = r['clientZoneId']
        if z not in zone_proof:
            zone_proof[z] = {'clientZoneId':z,'zonePath':r['zonePath'],'zonSha256':r['zonSha256'],'minimapPath':r['minimapPath'],'minimapOrigin':r['minimapOrigin'],'gridPerPatch':r['zoneInfo']['gridPerPatch'],'gridSize':r['zoneInfo']['gridSize'],'imageSha256':r['imageSha256']}
        ifo = r['ifo']
        matching = [{'list':name,'index':i,'count':mob['count']} for name in ['basicSpawns','tacticSpawns'] for i,mob in enumerate(ifo.get(name,[])) if mob['npcId']==ifo['npcId'] and mob['count']>0]
        source_objects.append({'sourceObjectId':r['id'],'runtimeMarkerId':r['runtimeMarkerId'],'monsterId':r['monsterId'],'npcId':ifo['npcId'],'clientZoneId':z,'ifoFileIndex':file_index[ifo['path']],'byteOffset':ifo['byteOffset'],'blockType':2 if ifo['spawnList']=='npcObject' else 8,'blockIndex':ifo['blockIndex'],'rawPositionCm':ifo['object']['position'],'rangeRaw':ifo.get('range'),'intervalRaw':ifo.get('interval'),'limitCountRaw':ifo.get('limitCount'),'tacticPointsRaw':ifo.get('tacticPoints'),'matchingEntries':matching,'pixelX':r['projection']['pixelX'],'pixelY':r['projection']['pixelY']})
        merged.setdefault(r['runtimeMarkerId'],[]).append({'sourceObjectId':r['id'],'ifoPath':ifo['path'],'byteOffset':ifo['byteOffset']})
    provenance = {
        'version':1,'runtimePath':'dist/data/spawns.json','runtimeSha256':sha(runtime_path),
        'currentUpdaterSource':full['records'][0]['sourceSnapshot'],
        'parserSource':{'url':'https://github.com/exjam/rose-offline/blob/4a648ba720278f69bb8ee6257564175c271e081c/rose-file-readers/src/ifo.rs','commit':'4a648ba720278f69bb8ee6257564175c271e081c'},
        'projectionSources':[full['minimapProjectionSource'],full['ifoWorldOffsetSource']],
        'projectionFormula':full['formula'],'deduplication':full['deduplication'],
        'mapImages':list(images.values()),'zones':list(zone_proof.values()),'ifoFiles':files,
        'sourceObjects':source_objects,
        'mergedRuntimeLocations':[{'runtimeMarkerId':key,'sourceObjects':value} for key,value in merged.items() if len(value)>1],
        'scope':{k:coverage[k] for k in ['markerCount','sourceObjectCount','coveredBossCount','zonesWithMarkers','currentZonesInspected','currentIfosParsed','liveServerVerified','radiusExported']},
        'checkedCurrentZoneIds':sorted(z['zoneId'] for z in zones),
        'notes':[
            'This document contains metadata and source coordinates, not raw IFO/VFS/client assets.',
            'ifoFileIndex refers to the ifoFiles array; runtimeMarkerId links every source object to a rendered location.',
            'A current client record does not prove an active server spawn, live boss presence or a respawn timer.',
            'No source coordinates were clamped or fitted to community markers. Normalization uses the complete WEBP image.',
            'The updater manifest is mutable. Reproduce this snapshot with the pinned release URLs and hashes recorded here.',
        ],
    }
    qa_path = BASE / 'king-marker-validation/projection-qa-report.json'
    if qa_path.exists():
        provenance['independentProjectionQA'] = {'file':'projection-qa-report.json','sha256':sha(qa_path)}
        coverage['independentProjectionQA'] = provenance['independentProjectionQA']
    (ROOT / 'spawn-coverage.json').write_text(json.dumps(coverage,ensure_ascii=False,indent=2)+'\n')
    (ROOT / 'spawn-provenance.json').write_text(json.dumps(provenance,ensure_ascii=False,separators=(',',':'))+'\n')
    print(json.dumps({'markers':len(records),'sourceObjects':len(source_objects),'bosses':len(covered),'zones':len(zone_proof),'usedIfoFiles':len(files),'provenanceBytes':(ROOT/'spawn-provenance.json').stat().st_size,'merged':provenance['mergedRuntimeLocations']},ensure_ascii=False,indent=2))


if __name__ == '__main__':
    main()
