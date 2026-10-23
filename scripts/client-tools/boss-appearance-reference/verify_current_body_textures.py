"""Verify current texture pixels for exactly the95selected boss/event model graph."""
import sys,json,hashlib,io
from pathlib import Path
from PIL import Image
import numpy as np
b=Path('/workspace/scratch/520b87b7114a');p=b/'boss-appearance-reference';sys.path.insert(0,str(b/'official-maps'))
from client_assets import ClientAssets
from current_assets import CurrentClientAssets
c=CurrentClientAssets(allow_network=True);old=ClientAssets()
deps=json.loads((p/'current-95-body-dependency-comparison.json').read_text())
paths=[x['path'] for x in deps if x['path'].endswith('.dds')]
records=[]
out=p/'current-95-all-body-texture-verification.json'
for i,path in enumerate(paths,1):
 rec=c.save(path,b/'official-maps/current-client/assets');current=Path(rec['extractedPath']).read_bytes()
 try:before=old.read(path)
 except FileNotFoundError:before=None
 rec['original2024Sha256']=hashlib.sha256(before).hexdigest() if before else None
 rec['sameBytesAs2024']=before==current if before else False
 if before:
  aa=Image.open(io.BytesIO(before)).convert('RGBA');bb=Image.open(io.BytesIO(current)).convert('RGBA');rec['oldSize']=aa.size;rec['currentSize']=bb.size;rec['sameDecodedRGBA']=aa.size==bb.size and aa.tobytes()==bb.tobytes()
  if not rec['sameDecodedRGBA'] and aa.size==bb.size:
   a=np.asarray(aa);v=np.asarray(bb);rec.update(changedPixelsRGB=int(np.any(a[:,:,:3]!=v[:,:,:3],axis=2).sum()),changedPixelsAlpha=int((a[:,:,3]!=v[:,:,3]).sum()),totalPixels=aa.width*aa.height)
 else:rec['sameDecodedRGBA']=False;rec['newAsset']=True
 records.append(rec)
 out.write_text(json.dumps({'source':c.source,'scope':'All 157 unique body DDS textures in the 95 selected boss/event model graph. Geometry and animation metadata were separately compared; weapon textures are outside this body-only manifest.','records':records},ensure_ascii=False,indent=2)+'\n')
 if i%15==0 or i==len(paths):print('Textures',i,'/',len(paths),'changedPixelsOrNew',sum(not r['sameDecodedRGBA'] for r in records),flush=True)
print('DONE',len(records),'samePixels',sum(r['sameDecodedRGBA'] for r in records),'changedExisting',[r['path'] for r in records if not r.get('newAsset') and not r['sameDecodedRGBA']],flush=True)
