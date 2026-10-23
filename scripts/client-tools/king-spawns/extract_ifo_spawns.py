"""Read exact IFO MonsterSpawn/NPC records; no inferred positions or spawn claims."""
from pathlib import Path
import argparse, hashlib, json, struct, sys

BASE = Path('/workspace/scratch/520b87b7114a')
sys.path.insert(0, str(BASE / 'official-maps'))
from client_assets import ClientAssets, Reader, normalize, read_stb
from current_assets import CurrentClientAssets
from dungeon_geometry import read_zon, read_ifo_object

SOURCE = 'https://github.com/exjam/rose-offline/blob/4a648ba720278f69bb8ee6257564175c271e081c/rose-file-readers/src/ifo.rs'


def read_spawn_ifo(raw):
    r = Reader(raw)
    count = r.num('I')
    if count > 100:
        raise ValueError('Implausible IFO block count')
    blocks = [(r.num('I'), r.num('I')) for _ in range(count)]
    offsets = sorted(set(offset for _, offset in blocks) | {len(raw)})
    result = {'blocks': [], 'monsterSpawns': [], 'npcs': []}
    for kind, offset in blocks:
        if not (4 + count * 8 <= offset < len(raw)):
            raise ValueError('IFO block offset outside file')
        end = next(x for x in offsets if x > offset)
        r.pos = offset
        num = r.num('I')
        result['blocks'].append({'type': kind, 'offset': offset, 'byteLength': end-offset, 'countOrFirstU32': num})
        if kind not in (2, 8):
            continue
        if num > 100000:
            raise ValueError('Implausible IFO object count')
        for index in range(num):
            record = {'blockIndex': index, 'byteOffset': r.pos, 'object': read_ifo_object(r)}
            if kind == 2:
                record['aiId'] = r.num('I')
                record['questFile'] = r.string('B')
                result['npcs'].append(record)
            else:
                record['spawnName'] = r.string('B')
                for field in ('basicSpawns', 'tacticSpawns'):
                    n = r.num('I')
                    if n > 10000:
                        raise ValueError('Implausible spawn-list size')
                    record[field] = [{'name': r.string('B'), 'npcId': r.num('I'), 'count': r.num('I')} for _ in range(n)]
                for field in ('interval', 'limitCount', 'range', 'tacticPoints'):
                    record[field] = r.num('I')
                result['monsterSpawns'].append(record)
        if r.pos != end:
            raise ValueError(f'IFO block {kind}: consumed {r.pos}, expected end {end}')
    return result


def iter_ifos(client, parent):
    for y in range(64):
        for x in range(64):
            path = f'{parent}/{x}_{y}.ifo'
            meta = client.metadata(path)
            if meta:
                yield x, y, path, meta


def missing_chunks(client, meta):
    if not isinstance(client, CurrentClientAssets):
        return []
    import bisect
    archive = client.archive
    offset, end = meta['offset'], meta['offset'] + meta['sizeBytes']
    i = bisect.bisect_right(archive.source_offsets, offset)-1
    missing = []
    while offset < end:
        chunk = archive.order[i]
        if not (archive.cache / f'chunk-{chunk}.bin').exists():
            missing.append(chunk)
        offset = archive.source_offsets[i] + archive.chunks[chunk]['sourceSize']
        i += 1
    return missing


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--current', action='store_true')
    parser.add_argument('--fetch', action='store_true')
    parser.add_argument('--zones', type=int, nargs='+', default=[22, 1, 24])
    parser.add_argument('--metadata-only', action='store_true')
    parser.add_argument('--output-name')
    parser.add_argument('--model-manifest', type=Path, default=BASE / 'rose-companion/scripts/boss-appearances-manifest.json')
    args = parser.parse_args()
    client = CurrentClientAssets(allow_network=args.fetch) if args.current else ClientAssets()
    model_manifest = json.loads(args.model_manifest.read_text())
    boss_ids = {int(r['npcId']): r for r in model_manifest['records']}
    table = read_stb(client.read('3ddata/stb/list_zone.stb'))
    world = json.loads((BASE / 'rose-companion/dist/data/world.json').read_text())
    out = BASE / 'king-spawn-analysis'
    out.mkdir(exist_ok=True)
    records = []
    for zone_id in args.zones:
        row = table['cells'][zone_id]
        zone_path = normalize(row[1])
        parent = str(Path(zone_path).parent)
        ifos = list(iter_ifos(client, parent))
        all_missing = sorted({i for _, _, _, meta in ifos for i in missing_chunks(client, meta)})
        record = {
            'zoneId': zone_id, 'sourceName': row[0], 'zonePath': zone_path,
            'clientMinimapPath': normalize(row[8]), 'minimapOrigin': [row[9], row[10]],
            'mapRecords': [{k:r[k] for k in ['id', 'name', 'image', 'width', 'height', 'sha256'] if k in r} for r in world['maps'] if zone_id in r.get('clientZoneIds', [])],
            'ifoFileCount': len(ifos), 'ifoTotalBytes': sum(m['sizeBytes'] for _,_,_,m in ifos),
            'uncachedChunkCount': len(all_missing), 'uncachedChunkIds': all_missing,
            'files': [], 'bossReferences': [], 'errors': [],
        }
        if not args.metadata_only:
            if args.current and args.fetch:
                from concurrent.futures import ThreadPoolExecutor
                with ThreadPoolExecutor(max_workers=4) as pool:
                    list(pool.map(client.archive.chunk, all_missing))
            zon_raw = client.read(zone_path)
            record['zoneInfo'] = read_zon(zon_raw).get('info')
            record['zonSha256'] = hashlib.sha256(zon_raw).hexdigest()
            for x, y, path, meta in ifos:
                try:
                    raw = client.read(path)
                    parsed = read_spawn_ifo(raw)
                except Exception as exc:
                    record['errors'].append({'path': path, 'error': str(exc)})
                    continue
                file_rec = {**meta, 'tile': [x,y], 'sha256': hashlib.sha256(raw).hexdigest(), **parsed}
                record['files'].append(file_rec)
                for spawn in parsed['monsterSpawns']:
                    for list_name in ('basicSpawns', 'tacticSpawns'):
                        for mob in spawn[list_name]:
                            if mob['npcId'] in boss_ids and mob['count'] > 0:
                                boss = boss_ids[mob['npcId']]
                                record['bossReferences'].append({'catalogId': boss['catalogId'], 'name': boss['name'], 'npcId': mob['npcId'], 'count': mob['count'], 'spawnList': list_name, 'path': path, 'ifoSha256': file_rec['sha256'], 'tile': [x,y], **spawn})
                for npc in parsed['npcs']:
                    if npc['object']['objectId'] in boss_ids:
                        boss = boss_ids[npc['object']['objectId']]
                        record['bossReferences'].append({'catalogId': boss['catalogId'], 'name': boss['name'], 'npcId': boss['npcId'], 'spawnList': 'npcObject', 'path': path, 'ifoSha256': file_rec['sha256'], 'tile': [x,y], **npc})
        records.append(record)
        summary = {k:v for k,v in record.items() if k not in ['files', 'uncachedChunkIds', 'bossReferences', 'errors']}
        unique_points = {}
        for ref in record['bossReferences']:
            boss = unique_points.setdefault(ref['npcId'], {'catalogId': ref['catalogId'], 'name': ref['name'], 'points': set()})
            boss['points'].add((ref['path'], ref['byteOffset']))
        summary.update(parsedFiles=len(record['files']), errors=len(record['errors']), monsterSpawnCount=sum(len(x['monsterSpawns']) for x in record['files']), npcObjectCount=sum(len(x['npcs']) for x in record['files']), bosses=[{'catalogId': r['catalogId'], 'name':r['name'],'pointCount':len(r['points'])} for r in unique_points.values()])
        print(json.dumps(summary,ensure_ascii=False),flush=True)
    suffix = 'current' if args.current else '2024'
    if args.metadata_only:
        suffix += '-metadata'
    output = out / (args.output_name or f'junon-spawns-{suffix}.json')
    output.write_text(json.dumps({'source': getattr(client, 'source', {'snapshot':'Official Global installer November 2024'}), 'parserReference': SOURCE, 'scope':'Raw client data; no live-server spawn confirmation', 'zones': records},ensure_ascii=False,indent=2)+'\n')
    print('saved',output)


if __name__ == '__main__':
    main()
