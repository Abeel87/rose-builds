"""Bundle original game icons into lossless local sprite sheets, without recolouring.

Usage: python scripts/import-visuals.py /path/to/RoseLite
The source revision and rights are recorded in THIRD_PARTY.md.
"""
from pathlib import Path
from PIL import Image
import hashlib, json, sys, shutil, subprocess

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = Path(sys.argv[1])
REVISION = '613d91e2d37a3c445877e28219c60652cf9774db'
assert subprocess.check_output(['git','-C',str(UPSTREAM),'rev-parse','HEAD'],text=True).strip() == REVISION
raw = json.loads((UPSTREAM/'RoseData/list_items.json').read_text())
catalog = json.loads((ROOT/'dist/data/catalog.json').read_text())
items = {str(i['id']):i for i in raw}
icon_root = UPSTREAM/'RoseData/game-icons'
out = ROOT/'dist/assets/game'
out.mkdir(parents=True,exist_ok=True)
unique, refs, all_paths = {}, {}, {}
for item in catalog['items']:
    source = items.get(item['id'],{})
    name = source.get('icon')
    if not name or not (icon_root/name).is_file(): continue
    path = icon_root/name
    digest = hashlib.sha256(path.read_bytes()).hexdigest()
    if digest not in unique: unique[digest] = (len(unique),path)
    refs[item['id']] = unique[digest][0]
    all_paths[name] = unique[digest][0]
# Include every named Effigy, even if it currently has no drop-table mapping.
for path in sorted((icon_root/'useitem').glob('imbued_*_effigy.png')):
    digest=hashlib.sha256(path.read_bytes()).hexdigest()
    if digest not in unique: unique[digest]=(len(unique),path)
    all_paths[str(path.relative_to(icon_root))]=unique[digest][0]

CELL, COLS, PER_SHEET = 44, 24, 576
sheets=[]
for start in range(0,len(unique),PER_SHEET):
    canvas=Image.new('RGBA',(CELL*COLS,CELL*COLS))
    for number,path in list(unique.values())[start:start+PER_SHEET]:
        slot=number%PER_SHEET
        icon=Image.open(path).convert('RGBA')
        assert icon.size==(40,40), path
        canvas.alpha_composite(icon,((slot%COLS)*CELL+2,(slot//COLS)*CELL+2))
    name=f'items-{start//PER_SHEET:02d}.webp'
    canvas.save(out/name,'WEBP',lossless=True,method=6)
    sheets.append('assets/game/'+name)

classes={}
for job in ['Knight','Champion','Cleric','Mage','Raider','Scout','Bourgeois','Artisan']:
    name=job.lower()+'.png'
    shutil.copyfile(UPSTREAM/'overlay/assets/classes'/name,out/name)
    classes[job]='assets/game/'+name

def ref(n):return [n//PER_SHEET,n%COLS,(n%PER_SHEET)//COLS]
data={'version':1,'revision':REVISION,'cell':CELL,'cols':COLS,'sheets':sheets,
      'items':{k:ref(v) for k,v in refs.items()},
      'effigies':{k:ref(v) for k,v in all_paths.items() if k.startswith('useitem/imbued_')},
      'classes':classes}
(ROOT/'dist/data/visuals.json').write_text(json.dumps(data,separators=(',',':'),ensure_ascii=False)+'\n')
print(json.dumps({'itemsWithIcons':len(refs),'uniqueSprites':len(unique),'sheets':len(sheets),'bytes':sum((ROOT/'dist'/s).stat().st_size for s in sheets)}))
