"""Export all named minimaps from the current public updater release."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor,as_completed
import bisect,hashlib,io,json,re,struct
from PIL import Image
from client_assets import ROOT,normalize,read_stb,read_stl
from current_assets import CurrentClientAssets,CURRENT

client=CurrentClientAssets(allow_network=True)
table=read_stb(client.read('3ddata/stb/list_zone.stb'));strings=read_stl(client.read('language/list_zone_s.stl'))
columns={name:i-1 for i,name in enumerate(table['columnNames']) if i>0}
en={r['key']:r['texts'] for r in strings['languages'][1]}
old=json.loads((ROOT/'named-maps/named-maps-manifest.json').read_text());old_assets={a['path']:a for a in old['assets']}
OUT=ROOT/'current-maps';OUT.mkdir(exist_ok=True)
paths={normalize(row[columns['Minimap Image location']]) for i,row in enumerate(table['cells']) if i>0 and (row[0] or row[1] or row[8])}
needed=set()
for path in paths:
    r=client.metadata(path)
    if not r:continue
    a=client.archive;offset=r['offset'];end=offset+r['sizeBytes'];i=bisect.bisect_right(a.source_offsets,offset)-1
    while offset<end:
        needed.add(a.order[i]);offset=a.source_offsets[i]+a.chunks[a.order[i]]['sourceSize'];i+=1
print('map source paths',len(paths),'unique required VFS chunks',len(needed),flush=True)
with ThreadPoolExecutor(max_workers=4) as pool:
    jobs={pool.submit(client.archive.chunk,i):i for i in needed}
    for n,job in enumerate(as_completed(jobs),1):
        job.result()
        if n%20==0 or n==len(jobs):print('chunks verified',n,'of',len(jobs),flush=True)

zones=[];assets={}
for zone_id,row in enumerate(table['cells']):
    if zone_id==0 or not(row[0] or row[1] or row[8]):continue
    def cell(name):return row[columns[name]]
    key=cell('Name');text=en.get(key,['','']);name=text[0] or re.sub(r'^\([^)]*\)\s*','',row[0]);desc=text[1] if len(text)>1 else ''
    raw_type=table['rowNames'][zone_id];path=normalize(cell('Minimap Image location'));rec=client.metadata(path)
    raw_planet=cell('Planet Number');planet_id=int(raw_planet) if raw_planet.isdigit() else None;planet={1:'Junon',2:'Luna',3:'Eldeon',4:'Orlo'}.get(planet_id)
    if raw_type.startswith('Karkia,'):planet='Karkia'
    z={'zoneId':zone_id,'name':name,'localizedDescription':desc,'localizationKey':key,'sourceName':row[0],'zoneTypeRaw':raw_type,'planetId':planet_id,'planet':planet,'planetBasis':'Karkia zone type label' if planet=='Karkia' else 'LIST_ZONE Planet Number','zoneFile':normalize(row[1]),'minimapPath':path,'minimapGridOrigin':{'x':row[9],'y':row[10],'semantics':'Raw client grid origin; screen-to-game coordinates not independently calibrated'},'worldMapVisibleRaw':cell('WorldMap Visible'),'minimapDisplayRaw':cell('Minimap Display'),'minimapFilterRaw':cell('Minimap Filter'),'explicitlyDeprecated':'deprecated' in (raw_type+' '+row[0]+' '+name).lower(),'explicitlyUnusedOrInaccessible':any(t in raw_type.lower() for t in ['unused','inaccess']),'titleOrWarpScene':'title map' in raw_type.lower() or zone_id==19,'stressTest':'stress test' in raw_type.lower(),'freeTour':'free tour' in name.lower(),'availabilityUnverified':True,'currentServerAvailabilityVerified':False,'currentSpawnsVerified':False,'currentClientVerified':True,'identityEvidence':'Current official LIST_ZONE.STB row ID + English localization key + exact BLAKE3 path lookup in current data.idx + BLAKE2b-verified updater archive chunks'}
    if not rec:
        z['imageStatus']='referenced_asset_missing_in_current_client';zones.append(z);continue
    if path not in assets:
        raw=client.read(path);dds_hash=hashlib.sha256(raw).hexdigest();unchanged=path in old_assets and dds_hash==old_assets[path]['ddsSha256']
        slug=re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-');filename=f'zone-{zone_id:03d}-{slug}.webp';target=OUT/filename
        if unchanged:
            previous=old_assets[path];target.write_bytes(Path(previous['localPath']).read_bytes());im=Image.open(target);im.load()
        else:
            try:im=Image.open(io.BytesIO(raw));im.load()
            except NotImplementedError:
                h,w=struct.unpack_from('<II',raw,12);bits=struct.unpack_from('<I',raw,88)[0];masks=struct.unpack_from('<4I',raw,92)
                if bits!=16 or masks[:3]!=(63488,2016,31):raise
                im=Image.frombytes('RGB',(w,h),raw[128:128+w*h*2],'raw','BGR;16')
            buf=io.BytesIO();im.save(buf,'WEBP',lossless=True,method=6);target.write_bytes(buf.getvalue())
        transparent='A' in im.getbands() and im.getchannel('A').getextrema()[1]==0;blank=transparent or im.width<32 or im.height<32
        assets[path]={**rec,'filename':filename,'localPath':str(target),'width':im.width,'height':im.height,'mode':im.mode,'fullyTransparent':transparent,'blankPlaceholder':blank,'ddsSha256':dds_hash,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size,'unchangedFromInstaller2024':unchanged,'zoneIds':[]}
    a=assets[path];a['zoneIds'].append(zone_id);z.update({'imageStatus':'blank_placeholder' if a['blankPlaceholder'] else 'extracted','rawAssetExtracted':True,'image':{k:v for k,v in a.items() if k!='zoneIds'}});zones.append(z)
source={**client.source,'zoneTable':{**client.metadata('3ddata/stb/list_zone.stb'),'sha256':hashlib.sha256(client.read('3ddata/stb/list_zone.stb')).hexdigest()},'localizedNames':{**client.metadata('language/list_zone_s.stl'),'sha256':hashlib.sha256(client.read('language/list_zone_s.stl')).hexdigest(),'languageIndex':1,'language':'English'},'dateSemantics':'Retrieved from the current official updater release on 2026-10-23. Per-asset modifiedAt is the timestamp in data.idx and may be older than the served release. Client presence does not establish public availability or server spawns.'}
m={'schemaVersion':3,'source':source,'identityMethod':'Exact named client table lookup, current updater release','zoneCount':len(zones),'extractedZoneCount':sum(z.get('rawAssetExtracted',False) for z in zones),'visibleMapZoneCount':sum(z['imageStatus']=='extracted' for z in zones),'uniqueImageCount':len(assets),'visibleImageCount':sum(not a['blankPlaceholder'] for a in assets.values()),'limitations':['Client presence does not guarantee a zone is publicly accessible.','Title scenes, deprecated entries, inaccessible areas, stress tests and Free Tours are explicitly flagged.','Age of Zatana ID91 is the Free Tour variant; ID174 is the named game arena; both explicitly reference the same image.','Karkia is taken from the zone type label; raw Planet Number remains4 in the table and is preserved.','Halls of Oblivion143 and Sikuku Catacombs169 still reference blank4x4DDS assets; these are not usable map images.','No spawn positions or drops are inferred from the map files.'],'zones':zones,'assets':list(assets.values())}
(OUT/'current-maps-manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2))
summary={k:m[k] for k in ['zoneCount','extractedZoneCount','visibleMapZoneCount','uniqueImageCount','visibleImageCount']};summary.update(unchanged2024=sum(a['unchangedFromInstaller2024'] for a in assets.values()),changedOrNew=[{'zoneIds':a['zoneIds'],'path':a['path'],'filename':a['filename'],'modifiedAt':a['modifiedAt']} for a in assets.values() if not a['unchangedFromInstaller2024']],totalBytes=sum(a['bytes'] for a in assets.values()))
(OUT/'summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
