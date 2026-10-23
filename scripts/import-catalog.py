"""Build a factual, attributed reference snapshot. No scraping, runtime API or credentials.

Usage: python scripts/import-catalog.py /path/to/DrezByte-RoseLite
The pinned public upstream snapshot is documented in THIRD_PARTY.md.
Only names, classifications, numeric item properties and drop relationships are retained;
no guide prose, upstream UI, game artwork or unverified spawn timers are copied.
"""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = Path(sys.argv[1])
REVISION = '613d91e2d37a3c445877e28219c60652cf9774db'
if subprocess.check_output(['git', '-C', str(UPSTREAM), 'rev-parse', 'HEAD'], text=True).strip() != REVISION:
    raise SystemExit('Review a new upstream revision before changing the pinned snapshot.')

def read(name):
    return json.loads((UPSTREAM / name).read_text())

raw_items = read('RoseData/list_items.json')
raw_drops = read('RoseData/drops.json')
names = read('RoseData/list_npc.json')
overrides = json.loads((ROOT / 'scripts/catalog-overrides.json').read_text())
items = []
for item in raw_items:
    # Removed in the official 2026-05-31 patch. Do not recommend obsolete drop gems.
    if any(x in item['name'] for x in ['Combeite Pear', 'Umbite Baguette', 'Raspite Round',
                                      'Variscite Briolette', 'Esperite Cushion',
                                      'Legrandite Marquise', 'Dolomite Asscher']):
        continue
    stat = item.get('item_stat') or {}
    out = {'id': str(item['id']), 'name': item['name'], 'type': item['type']['slug']}
    if stat.get('level_requirement'):
        out['level'] = stat['level_requirement']
    # Never use the raw speed/range units as a player-visible DPS calculation.
    fields = ['attack_power', 'defense', 'magic_defense', 'dodge_rate', 'movement_speed',
              'pvm_atk', 'pvm_def', 'pvp_atk', 'pvp_def']
    stats = {key: stat[key] for key in fields if stat.get(key) is not None}
    if stats:
        out['stats'] = stats
    if stat.get('stat_requirement'):
        out['requirement'] = stat['stat_requirement']
    if stat.get('job_requirement'):
        out['jobs'] = stat['job_requirement']
    items.append(out)
items.extend(overrides['extraItems'])
ids = {i['id'] for i in items}
monsters = []
for mob_id, mob in raw_drops.items():
    full = names.get(mob_id, f'Potwór #{mob_id}')
    match = re.search(r'\(([^)]+)\)\s*(?:\[([^\]]+)\])?\s*$', full)
    rank = match.group(1) if match and match.group(1) != 'null' else ''
    zone = match.group(2) if match else None
    out = {
        'id': mob_id, 'name': full[:match.start()].strip() if match else full,
        'rank': rank, 'level': mob['lvl'],
        'kind': 'king' if rank.startswith('King-') else 'boss' if rank.startswith('SubBoss-') else 'monster',
        'locations': [], 'drops': [str(i) for i in mob['d'] if str(i) in ids],
        'source': 'community-drops', 'officialDrops': {},
    }
    if out['name'].startswith('Wandering ') and out['kind'] == 'king':
        out['kind'] = 'wandering'
    if zone:
        out['locations'] = [{'zone': zone, 'planet': 'Orlo' if zone.startswith('Orlo') else 'Luna', 'source': 'community-drops'}]
        out['habitat'] = 'clan'
    if mob_id in overrides['monsters']:
        change = overrides['monsters'][mob_id]
        out.update({k: v for k, v in change.items() if k not in ['addDrops', 'removeDrops']})
        out['drops'] = sorted(set(out['drops'] + change.get('addDrops', [])) - set(change.get('removeDrops', [])))
    monsters.append(out)
monsters.extend(overrides['extraMonsters'])

for monster in monsters:
    # Official patch supersedes the community snapshot for named open-world Orlo Kings.
    orlo_world = monster.get('habitat') != 'clan' and (monster.get('planet') == 'Orlo' or any(l['planet'] == 'Orlo' and 'Clan' not in l['zone'] for l in monster['locations']))
    if monster['kind'] in ['king', 'wandering'] and orlo_world:
        monster['level'] = 250
        monster['levelSource'] = 'patch-october'
        for item_id in ['17523', '17713']:
            monster['officialDrops'][item_id] = 'patch-may'
            if item_id not in monster['drops']:
                monster['drops'].append(item_id)
    if monster['kind'] == 'wandering':
        monster['respawn'] = [5, 90]
        monster['respawnSource'] = 'patch-october'
        for item_id in ['11594', '17714']:
            monster['officialDrops'][item_id] = 'patch-may'
            if item_id not in monster['drops']:
                monster['drops'].append(item_id)
    assert all(i in ids for i in monster['drops']), monster['name']

payload = {
    'meta': {
        'retrievedAt': '2026-10-23', 'patchBaseline': '2026-10-16',
        'upstreamRevision': REVISION,
        'upstreamHashes': {f: hashlib.sha256((UPSTREAM / f).read_bytes()).hexdigest() for f in [
            'RoseData/list_items.json', 'RoseData/drops.json', 'RoseData/list_npc.json', 'overlay/kings.json']},
        'coverage': 'Community snapshot, with explicitly sourced official corrections. Not a complete live server database.',
    },
    'items': items, 'monsters': monsters, 'zoneDrops': overrides['zoneDrops'],
}
(ROOT / 'dist/data/catalog.json').write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n')
print(f'{len(items)} items, {len(monsters)} monsters, {sum(len(m["drops"]) for m in monsters)} drop relationships')
