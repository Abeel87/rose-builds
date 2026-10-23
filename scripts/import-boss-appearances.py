"""Bundle original client model renders and attributed official screenshots.

Usage: python scripts/import-boss-appearances.py /path/to/model-manifest.json
       /path/to/event-screenshot-manifest.json
Requires Pillow for screenshot WebP conversion. No game files are redistributed.
"""
import hashlib
import json
import shutil
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
model_path, screenshot_path = map(Path, sys.argv[1:3])
models = json.loads(model_path.read_text())
screenshots = json.loads(screenshot_path.read_text())
world_path = ROOT / 'dist/data/world.json'
world = json.loads(world_path.read_text())
catalog = json.loads((ROOT / 'dist/data/catalog.json').read_text())
names = {m['id']: m['name'] for m in catalog['monsters']}
target = ROOT / 'dist/assets/bosses'
target.mkdir(parents=True, exist_ok=True)

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def clean(value):
    if isinstance(value, dict):
        return {k: clean(v) for k, v in value.items() if k not in ('originalFile', 'png') and not (k in ('image', 'file') and isinstance(v, str) and v.startswith('/'))}
    if isinstance(value, list):
        return [clean(v) for v in value]
    if isinstance(value, str) and value.startswith('/'):
        return Path(value).name
    return value

entries = {key: {k: v for k, v in value.items() if k in ('effigy', 'itemId', 'source')} for key, value in world['monsters'].items()}
for r in models['records']:
    key = str(r.get('catalogId') or r['id'])
    assert names.get(key) == r['name'], f'Wrong model identity for {key}: {r["name"]}'
    local = Path(r['image']) if str(r.get('image', '')).startswith('/') else model_path.parent / r['file']
    assert sha(local) == r['sha256'], f'Model checksum mismatch: {key}'
    image_path = f'assets/bosses/{key}-model.webp'
    shutil.copyfile(local, ROOT / 'dist' / image_path)
    entries.setdefault(key, {}).update({
        'image': image_path, 'width': r['width'], 'height': r['height'],
        'sha256': r['sha256'], 'name': r['name'], 'npcId': r['npcId'],
        'modelId': r['modelId'], 'origin': 'official-client-model',
        'sourceUrl': r['sourceUrl'], 'author': 'ROSE Online / Rednim Games',
        'date': r.get('sourceDate', '2024-11-22'), 'historical': r.get('historical', True),
        'isScreenshot': False, 'aiGenerated': False,
        'note': r.get('renderNote', 'Oryginalny model i tekstury klienta Global w neutralnym świetle. Aura i efekty cząsteczkowe nie są pokazywane.') + ' Podglądy nie zachowują wzajemnej skali potworów.',
    })

normalized_screenshots = []
for r in screenshots:
    key = r['id']
    assert names.get(key) == r['name'], f'Wrong screenshot identity: {key}'
    local, original = Path(r['file']), Path(r['originalFile'])
    assert sha(local) == r['sha256'] and sha(original) == r['originalSha256']
    image_path = f'assets/bosses/{key}-official.webp'
    with Image.open(local) as image:
        image.save(ROOT / 'dist' / image_path, format='WEBP', quality=94, method=6, lossless=image.width < 200)
    entry = {k: r[k] for k in ('name', 'sourceUrl', 'sourceImageUrl', 'date', 'dateBasis', 'retrievedAt', 'width', 'height', 'note')}
    entry.update(image=image_path, sha256=sha(ROOT / 'dist' / image_path), origin='official-screenshot', author='ROSE Online / Rednim Games', aiGenerated=False, isScreenshot=True)
    if r.get('cropBox'):
        full_path = f'assets/bosses/{key}-official-full.webp'
        with Image.open(original) as image:
            image.save(ROOT / 'dist' / full_path, format='WEBP', quality=94, method=6)
        entry['originalImage'] = full_path
        entry['originalImageSha256'] = sha(ROOT / 'dist' / full_path)
    if entries.get(key, {}).get('image'):
        entries[key]['officialScreenshot'] = entry
    else:
        entries.setdefault(key, {}).update(entry)
    normalized_screenshots.append({**clean(r), 'bundledImage': image_path, 'bundledSha256': entry['sha256']})

for monster in catalog['monsters']:
    if monster['kind'] != 'monster':
        assert entries.get(monster['id'], {}).get('image'), f'Missing appearance: {monster["name"]}'
world['monsters'] = entries
world['appearanceCoverage'] = {
    'bossCount': sum(m['kind'] != 'monster' for m in catalog['monsters']),
    'modelCount': sum(v.get('origin') == 'official-client-model' for v in entries.values()),
    'screenshotCount': sum(v.get('origin') == 'official-screenshot' for v in entries.values()),
    'additionalScreenshots': sum('officialScreenshot' in v for v in entries.values()),
    'summoningItemIconsUsedAsPortraits': False,
}
world_path.write_text(json.dumps(world, ensure_ascii=False, separators=(',', ':')) + '\n')
snapshot = clean(models)
snapshot['officialScreenshots'] = normalized_screenshots
(ROOT / 'scripts/boss-appearances-manifest.json').write_text(json.dumps(snapshot, ensure_ascii=False, separators=(',', ':')) + '\n')
print(json.dumps(world['appearanceCoverage'], ensure_ascii=False))
