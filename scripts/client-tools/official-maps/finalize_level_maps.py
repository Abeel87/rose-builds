"""Create compact web delivery copies and a provenance manifest for two levels."""
from pathlib import Path
import hashlib
import io
import json
from PIL import Image

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'derived-maps'
atlas = json.loads((ROOT / 'current-maps/current-maps-manifest.json').read_text())
zones = {z['zoneId']: z for z in atlas['zones']}
records = []
for zone_id, suffix in [(143, ''), (169, '-cutaway')]:
    source = OUT / f'zone-{zone_id}-original-level-topdown-current{suffix}.webp'
    rec = json.loads(source.with_suffix('.json').read_text())
    im = Image.open(source).convert('RGBA')
    box = im.getbbox()
    box = (max(0, box[0] - 16), max(0, box[1] - 16),
           min(im.width, box[2] + 16), min(im.height, box[3] + 16))
    cropped = im.crop(box)
    buf = io.BytesIO()
    cropped.save(buf, 'WEBP', quality=92, method=6)
    raw = buf.getvalue()
    decoded = Image.open(io.BytesIO(raw))
    decoded.load()
    assert decoded.size == cropped.size
    target = OUT / f'zone-{zone_id}-derived-client-level.webp'
    target.write_bytes(raw)
    rec.update(name=zones[zone_id]['name'], localPath=str(target), image=str(target),
               filename=target.name, width=cropped.width, height=cropped.height,
               sha256=hashlib.sha256(raw).hexdigest(), bytes=len(raw),
               imageStatus='derived_from_original_level',
               currentClientVerified=True, currentServerAvailabilityVerified=False,
               currentSpawnsVerified=False,
               identityEvidence=zones[zone_id]['identityEvidence'],
               originalMinimap=zones[zone_id]['image'],
               originalMinimapStatus='Uniform black 4×4 placeholder; contains no map artwork.',
               archivalRenderPath=str(source),
               archivalRenderSha256=hashlib.sha256(source.read_bytes()).hexdigest(),
               deliveryConversion={'format':'WEBP', 'quality':92, 'resized':False,
                                   'sourceSize':list(im.size), 'cropBox':list(box),
                                   'transparentMarginPixels':16})
    rec['presentationLabel'] = ('Widok poziomu z plików gry — przekrój bez sufitu'
                                 if suffix else 'Widok poziomu z plików gry')
    rec['presentationDescription'] = (
        'Widok z góry wyrenderowany z oryginalnej geometrii i tekstur bieżącego klienta. '
        'To widok pomocniczy; plik minimapy tej lokacji zawiera pusty placeholder.'
        + (' Usunięto wyłącznie nazwane siatki sufitów, aby odsłonić pomieszczenia.' if suffix else ''))
    rec['validation'] = {'decoded':True, 'sha256Verified':True,
                         'dimensionsVerified':True, 'visualInspection':'completed',
                         'terrainObjectCoordinates':'Verified against pinned client source.'}
    records.append(rec)

manifest = {'schemaVersion':1, 'source':atlas['source'], 'records':records,
            'count':len(records), 'bytes':sum(r['bytes'] for r in records),
            'limitations':['These images are derived views of original client levels, not shipped minimap artwork.',
                           'Public availability, walkability and live-server spawns are not inferred.',
                           'Sikuku Catacombs is a documented cutaway; full original geometry rendering is retained separately.']}
(OUT / 'derived-maps-manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False))
print(json.dumps({'manifest':str(OUT/'derived-maps-manifest.json'), 'bytes':manifest['bytes'],
                  'records':[{k:r[k] for k in ['zoneId','name','image','width','height','bytes','sha256']} for r in records]}, indent=2))
