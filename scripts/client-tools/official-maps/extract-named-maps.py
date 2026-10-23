"""Extract every minimap explicitly referenced by the pinned LIST_ZONE.STB.

Identity is the exact chain: zone ID -> localized string -> minimap path ->
BLAKE3 path hash -> VFS record -> original DDS. No image-geometry inference.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import hashlib,io,json,re,struct
from client_assets import ClientAssets,read_stb,read_stl,normalize,ROOT

OUT=ROOT/'named-maps'; OUT.mkdir(parents=True,exist_ok=True)
client=ClientAssets(); table=read_stb(client.read('3ddata/stb/list_zone.stb')); strings=read_stl(client.read('language/list_zone_s.stl'))
english={r['key']:r['texts'] for r in strings['languages'][1]}
source={
    'officialDownloadPage':'https://www.roseonlinegame.com/download',
    'installerUrl':'https://f002.backblazeb2.com/file/rose-public/RoseOnlineSetup.exe',
    'retrievedAt':'2026-10-23',
    'installerSha256':'e3214a0970355a4df93dad4300fecdd53f2a0b3b47afb7d54bf513d0b20f7477',
    'vfsSizeBytes':3058154795,
    'vfsSha1':'23d194b636c717768def4e48fa8b8234dcc97783',
    'indexModifiedAt':'2024-11-22T10:57:54Z',
    'gameVersion':None,
    'dateSemantics':'Per-asset modifiedAt is the timestamp stored in the official client index. Installer snapshot is November 2024; this is not a current-server spawn or availability verification.',
    'zoneTable':{**client.metadata('3ddata/stb/list_zone.stb'),'sha256':hashlib.sha256(client.read('3ddata/stb/list_zone.stb')).hexdigest()},
    'localizedNames':{**client.metadata('language/list_zone_s.stl'),'sha256':hashlib.sha256(client.read('language/list_zone_s.stl')).hexdigest(),'languageIndex':1,'language':'English'},
}
zones=[];assets={}
for zone_id,row in enumerate(table['cells']):
    if zone_id==0 or not(row[0] or row[1] or row[8]):continue
    localization=english.get(row[26],['',''])
    name=localization[0] or re.sub(r'^\([^)]*\)\s*','',row[0])
    desc=localization[1] if len(localization)>1 else ''
    path=normalize(row[8]); rec=client.metadata(path) if path else None
    raw_type=table['rowNames'][zone_id]; source_name=row[0]
    record={
        'zoneId':zone_id,'name':name,'localizedDescription':desc,
        'localizationKey':row[26],'sourceName':source_name,'zoneTypeRaw':raw_type,
        'planetId':int(row[19]) if row[19].isdigit() else None,
        'planet':{1:'Junon',2:'Luna',3:'Eldeon',4:'Orlo'}.get(int(row[19])) if row[19].isdigit() else None,
        'zoneFile':normalize(row[1]),'minimapPath':path,
        'minimapGridOrigin':{'x':row[9],'y':row[10],'semantics':'Raw LIST_ZONE columns 9 and 10, not calibrated screen coordinates'},
        'minimapDisplayRaw':row[42],'minimapFilterRaw':row[43],
        'explicitlyDeprecated':'deprecated' in (raw_type+' '+source_name+' '+name).lower(),
        'explicitlyUnusedOrInaccessible':any(t in raw_type.lower() for t in ['unused','inaccess']),
        'titleOrWarpScene':'title map' in raw_type.lower() or zone_id==19,
        'stressTest':'stress test' in raw_type.lower(),
        'currentServerAvailabilityVerified':False,
        'currentSpawnsVerified':False,
        'identityEvidence':'LIST_ZONE.STB row ID + English LIST_ZONE_S.STL localization key + exact BLAKE3 minimap path lookup in original client index',
    }
    if not rec:
        record['imageStatus']='referenced_asset_missing_in_installer'
        zones.append(record);continue
    if path not in assets:
        raw=client.read(path)
        try:
            im=Image.open(io.BytesIO(raw));im.load()
        except NotImplementedError:
            height,width=struct.unpack_from('<II',raw,12);bits=struct.unpack_from('<I',raw,88)[0];masks=struct.unpack_from('<4I',raw,92)
            if bits!=16 or masks[:3]!=(63488,2016,31):raise
            im=Image.frombytes('RGB',(width,height),raw[128:128+width*height*2],'raw','BGR;16')
        slug=re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-')
        filename=f'zone-{zone_id:03d}-{slug}.webp'
        output=OUT/filename
        buffer=io.BytesIO();im.save(buffer,'WEBP',lossless=True,method=6)
        output.write_bytes(buffer.getvalue())
        transparent='A' in im.getbands() and im.getchannel('A').getextrema()[1]==0
        blank=transparent or im.width<32 or im.height<32
        assets[path]={**rec,'filename':filename,'localPath':str(output),'width':im.width,'height':im.height,'mode':im.mode,'fullyTransparent':transparent,'blankPlaceholder':blank,'ddsSha256':hashlib.sha256(raw).hexdigest(),'sha256':hashlib.sha256(output.read_bytes()).hexdigest(),'bytes':output.stat().st_size,'zoneIds':[]}
    asset=assets[path];asset['zoneIds'].append(zone_id)
    record.update({'imageStatus':'blank_placeholder' if asset['blankPlaceholder'] else 'extracted','rawAssetExtracted':True,'image':{k:v for k,v in asset.items() if k!='zoneIds'}})
    zones.append(record)

manifest={'schemaVersion':2,'source':source,'identityMethod':'Exact named client table lookup','limitations':['The installer is a November 2024 snapshot, not the latest patched client.','Some table rows are explicitly title scenes, deprecated, stress-test, or inaccessible maps. They are preserved and flagged instead of presented as ordinary playable maps.','Different zone IDs can intentionally reference the same minimap asset; duplicate names and IDs are preserved.','A source image may depict the same map for multiple zones. This is faithfully reported, not a claim those zones have identical gameplay.','Halls of Oblivion and Sikuku Catacombs reference fully transparent 4x4 DDS placeholders; these are not usable maps.','No NPC spawn markers or current drop assertions are generated.'],'zoneCount':len(zones),'extractedZoneCount':sum(r.get('rawAssetExtracted',False) for r in zones),'visibleMapZoneCount':sum(r['imageStatus']=='extracted' for r in zones),'uniqueImageCount':len(assets),'visibleImageCount':sum(not a['blankPlaceholder'] for a in assets.values()),'zones':zones,'assets':list(assets.values())}
(OUT/'named-maps-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
thumbs=[]
for r in zones:
    if r['imageStatus']!='extracted':continue
    im=Image.open(r['image']['localPath']).convert('RGB');im.thumbnail((190,210))
    tile=Image.new('RGB',(220,250),'#e4e2df');tile.paste(im,((220-im.width)//2,0));d=ImageDraw.Draw(tile)
    d.text((4,214),f"{r['zoneId']}  {r['name']}",fill='black');d.text((4,230),r['zoneTypeRaw'],fill='black');thumbs.append(tile)
for n in range(0,len(thumbs),30):
    batch=thumbs[n:n+30];sheet=Image.new('RGB',(1100,250*((len(batch)+4)//5)),'#e4e2df')
    for i,tile in enumerate(batch):sheet.paste(tile,((i%5)*220,(i//5)*250))
    sheet.save(OUT/f'contact-{n//30}.jpg',quality=90)
print(json.dumps({k:manifest[k] for k in ['zoneCount','extractedZoneCount','uniqueImageCount']},indent=2))
print('Missing assets:',[(r['zoneId'],r['name'],r['minimapPath']) for r in zones if r['imageStatus']!='extracted'])
print('Total image bytes:',sum(r['bytes'] for r in assets.values()))
