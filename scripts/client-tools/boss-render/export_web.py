"""Compress verified portrait exports for the mobile web application."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
import hashlib,io,json
import numpy as np
ROOT=Path(__file__).resolve().parent
source=ROOT/'final';dest=ROOT/'final-web';dest.mkdir(exist_ok=True)
manifest=json.loads((source/'manifest.json').read_text())
def encode(rec):
    original=source/rec['file'];image=Image.open(original).convert('RGBA')
    encoded=io.BytesIO();image.save(encoded,format='WEBP',quality=92,method=6,alpha_quality=100,exact=True)
    raw=encoded.getvalue();decoded=Image.open(io.BytesIO(raw));decoded.load()
    assert decoded.size==image.size==(640,640)
    assert np.array_equal(np.array(decoded.getchannel('A')),np.array(image.getchannel('A')))
    target=dest/rec['file'];target.write_bytes(raw)
    return {**rec,'image':str(target),'sizeBytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest(),
        'sourceRenderSha256':rec['sha256'],'sourceRenderFile':str(original),
        'webExport':{'format':'WEBP','quality':92,'method':6,'alphaQuality':100,'alphaLosslessVerified':True,'geometryChanged':False,'dimensionsChanged':False}}
with ThreadPoolExecutor(max_workers=4) as pool:
    manifest['records']=list(pool.map(encode,manifest['records']))
manifest['sourceLosslessManifest']=str(source/'manifest.json')
manifest['totalImageBytes']=sum(r['sizeBytes'] for r in manifest['records'])
manifest['webExport']={'quality':92,'method':6,'alphaQuality':100,'alphaLosslessVerifiedForAll':True,
    'sourceImageBytes':sum((source/r['file']).stat().st_size for r in manifest['records'])}
(dest/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({'count':manifest['count'],'totalImageBytes':manifest['totalImageBytes'],'reductionPercent':round(100*(1-manifest['totalImageBytes']/manifest['webExport']['sourceImageBytes']),1),'manifest':str(dest/'manifest.json')},indent=2))
