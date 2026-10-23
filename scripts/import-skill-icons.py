#!/usr/bin/env python3
"""Pack retrieved original skill PNGs; absent downloads keep their source image URL."""
import json,pathlib,sys,hashlib
from PIL import Image
root=pathlib.Path(__file__).resolve().parents[1]
rows=json.loads(pathlib.Path(sys.argv[1]).read_text())
visuals=json.loads((root/'dist/data/visuals.json').read_text());world=json.loads((root/'dist/data/world.json').read_text())
refs={};by_hash={};images=[]
for row in rows:
    path=pathlib.Path(row['path'].replace('/home/oai/share','/workspace/scratch'))
    if not path.is_file():continue
    im=Image.open(path)
    if im.size!=(40,40):continue
    key=hashlib.sha256(path.read_bytes()).hexdigest()
    if key not in by_hash:by_hash[key]=len(images);images.append(im.convert('RGBA'))
    refs[row['src']]=by_hash[key]
name='assets/game/skills-00.webp';cols=24;cell=44
sheet=Image.new('RGBA',(cols*cell,cols*cell))
for n,im in enumerate(images):sheet.paste(im,((n%cols)*cell+2,(n//cols)*cell+2))
sheet.save(root/'dist'/name,'WEBP',lossless=True,method=6)
if name not in visuals['sheets']:visuals['sheets'].append(name)
si=visuals['sheets'].index(name)
for skill in world['skills']:
    if skill['icon'] in refs:
        n=refs[skill['icon']];skill['sprite']=[si,n%cols,n//cols];skill.pop('image',None)
    else:skill['image']=skill['icon']
for filename,data in [('visuals.json',visuals),('world.json',world)]:
    (root/'dist/data'/filename).write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
print(json.dumps({'localSkillEntries':sum('sprite' in s for s in world['skills']),'uniqueIcons':len(images),'remoteSkillEntries':sum('image' in s for s in world['skills'])}))
