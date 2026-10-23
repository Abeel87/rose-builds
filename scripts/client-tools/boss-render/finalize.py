"""Build the reviewable, deployment-sized portrait delivery (no client payloads)."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib,json,re,shutil
from PIL import Image

ROOT=Path(__file__).resolve().parent
REF=ROOT.parent/'boss-appearance-reference'
input_manifest=json.loads((REF/'global-boss-model-manifest.json').read_text())
models=input_manifest['records']+json.loads((REF/'global-extra-boss-models.json').read_text())
by_id={str(r['npcId']):r for r in models if r.get('modelAvailable')}
renders=json.loads((ROOT/'render-manifest.json').read_text())
assert len(renders)==len(by_id)==92
assert all('error' not in r for r in renders)
dest=ROOT/'final';dest.mkdir(exist_ok=True)
source_url='https://www.roseonlinegame.com/download'
installer_url='https://f002.backblazeb2.com/file/rose-public/RoseOnlineSetup.exe'
limits=[
    'Original model geometry, material textures, skeleton, idle pose and equipped model parts from the public Global installer snapshot of November 2024.',
    'This is a neutral studio render, not an in-game screenshot. Original scene lighting, specular environment reflection, bloom/aura and particle effects are omitted.',
    'The pinned 2024 client does not establish changes in the live 2026 game.',
    'Portrait framing fits each creature to the same canvas; real relative monster sizes are recorded separately in scalePercent.',
]
records=[]
for render in renders:
    model=by_id[render['npcId']]
    catalog_id=model['catalogId']
    assert re.fullmatch(r'[a-z0-9-]+',catalog_id)
    target=dest/f'{catalog_id}-client-2024.webp'
    source=Path(render['image'])
    im=Image.open(source)
    assert im.size==(640,640) and im.mode=='RGBA'
    assert im.getchannel('A').getbbox() is not None
    assert im.getchannel('A').getextrema()[0]==0
    shutil.copy2(source,target)
    digest=hashlib.sha256(target.read_bytes()).hexdigest()
    assert digest==render['sha256']
    record={**render,
        'id':catalog_id,'catalogId':catalog_id,'modelId':model['modelIndex'],
        'npcId':model['npcId'],'name':model['name'],'internalName':model['internalName'],
        'image':str(target),'file':target.name,'sha256':digest,'sizeBytes':target.stat().st_size,
        'origin':'official-global-client','sourceKind':'render-of-original-client-model',
        'sourceLabel':'ROSE Online Global — model klienta, 11.2024',
        'sourceUrl':source_url,'sourceImageUrl':installer_url,'sourceInstallerUrl':installer_url,
        'sourceDate':'2024-11-22','historical':True,'isScreenshot':False,
        'sourceVersion':'Official Global public installer snapshot, November 2024',
        'live2026AppearanceVerified':False,'identityValidation':model['validation'],
        'mapping':{'chrIndex':model['chrIndex'],'meshObjectIndices':model['meshObjectIndices'],
                   'skeletonPath':model['skeletonPath'],'rightHandPartIndex':model.get('rightHandPartIndex'),
                   'leftHandPartIndex':model.get('leftHandPartIndex'),'stlStringKey':model['stringKey']},
        'variant':{'scalePercent':model.get('scalePercent'),'hitMaterialType':model.get('textureType'),
                   'glowRGB255':model.get('glowRGB255'),'glowApplied':False},
        'mappingSources':input_manifest['sourceFiles'],
        'renderNote':'Oryginalny model i tekstury klienta (11.2024), neutralne światło. Aura i efekty cząsteczkowe pominięte.',
        'limitations':limits,
        'visualQA':{'frontViewChecked':True,'cameraAzimuth':-65,'alphaChannelChecked':True,'textureAndMeshSource':'Global client only'},
    }
    record.pop('png',None)
    records.append(record)
assert len({r['catalogId'] for r in records})==92
manifest={
    'schemaVersion':1,'createdAt':datetime.now(timezone.utc).isoformat(),
    'count':len(records),'width':640,'height':640,'transparent':True,
    'totalImageBytes':sum(r['sizeBytes'] for r in records),
    'sourceUrl':source_url,'sourceInstallerUrl':installer_url,
    'sourceInstallerSha256':'e3214a0970355a4df93dad4300fecdd53f2a0b3b47afb7d54bf513d0b20f7477',
    'sourceSnapshot':'November 2024','historical':True,'limitations':limits,
    'formatReferences':[
        'https://ralphminderhoud.com/rose-formats/',
        'https://github.com/rminderhoud/rose-tools/tree/master/rose-lib/src/files',
        'https://github.com/exjam/rose-offline-client/blob/9802251/src/model_loader.rs',
        'https://github.com/exjam/rose-offline-client/blob/9802251/src/render/object_material.rs',
        'https://github.com/shid0x/rose-next/blob/ca675d5fc0dea34d0f44bd1dc6dadf4bd469d5f1/src/engine/src/zz_skeleton.cpp',
    ],
    'excludedNewerEntries':[{'catalogId':m['catalogId'],'name':m['name'],'reason':'No exact model entry in the pinned November 2024 installer; use separately sourced official event screenshots.'} for m in models if not m.get('modelAvailable')],
    'records':records,
}
(dest/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print(json.dumps({'images':len(records),'totalImageBytes':manifest['totalImageBytes'],'manifest':str(dest/'manifest.json'),'syntheticMappings':[(r['catalogId'],r['npcId']) for r in records if r['catalogId']!=str(r['npcId'])]},indent=2))
