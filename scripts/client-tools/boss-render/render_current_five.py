"""Current official-client portraits for the three event NPCs and two changed materials."""
from pathlib import Path
import argparse,hashlib,io,json,sys
import numpy as np
from PIL import Image
from render_bosses import ModelReader,Renderer,ROOT,REFERENCE
from current_assets import CurrentClientAssets
from zsc_extensions import read_zsc


class CurrentModelReader(ModelReader):
    def __init__(self,allow_network=False):
        self.client=CurrentClientAssets(allow_network=allow_network)
        self.cache={};self.consumed={};self.scenes={}
    def scene(self,path):
        raw=self.read(path)
        if path not in self.scenes:self.scenes[path]=read_zsc(raw)
        return self.scenes[path]


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--fetch',action='store_true');args=parser.parse_args()
    current=json.loads((REFERENCE/'current-boss-model-manifest.json').read_text())
    events=json.loads((REFERENCE/'current-event-boss-models.json').read_text())
    records=[r for r in current['records'] if r.get('npcId') in [654,1806]]+events['records']
    assert len(records)==5
    reader=CurrentModelReader(allow_network=args.fetch);renderer=Renderer(1280)
    out=ROOT/'current-five';out.mkdir(exist_ok=True)
    web=ROOT/'current-five-web';web.mkdir(exist_ok=True)
    previews=ROOT/'current-five-previews';previews.mkdir(exist_ok=True)
    results=[]
    for rec in records:
        parts,assembly=reader.assemble(rec,frame=0)
        im,presentation=renderer.render(parts,azimuth=-65,elevation=13)
        im=im.resize((640,640),Image.Resampling.LANCZOS)
        name=rec['catalogId']+'-client-current'
        im.save(out/(name+'.png'))
        encoded=io.BytesIO();im.save(encoded,format='WEBP',lossless=True,method=6)
        lossless=encoded.getvalue();Image.open(io.BytesIO(lossless)).load()
        (out/(name+'.webp')).write_bytes(lossless)
        encoded=io.BytesIO();im.save(encoded,format='WEBP',quality=92,method=6,alpha_quality=100,exact=True)
        raw=encoded.getvalue();decoded=Image.open(io.BytesIO(raw));decoded.load()
        assert np.array_equal(np.array(decoded.getchannel('A')),np.array(im.getchannel('A')))
        target=web/(name+'.webp');target.write_bytes(raw)
        bg=Image.new('RGBA',(640,640),(27,32,42,255));bg.alpha_composite(decoded.convert('RGBA'));bg.convert('RGB').save(previews/(name+'.png'))
        extensions=[{'scenePath':path,'extensionStart':sc.get('extensionStart'),'chunks':[{k:v for k,v in ext.items() if k!='payloadHex'} for ext in sc.get('extensions',[])]} for path,sc in reader.scenes.items() if sc.get('extensions')]
        record={
            'id':rec['catalogId'],'catalogId':rec['catalogId'],'npcId':rec['npcId'],
            'modelId':rec.get('modelIndex',rec['chrIndex']),'name':rec['name'],'internalName':rec['internalName'],
            'image':str(target),'file':target.name,'width':640,'height':640,'sizeBytes':len(raw),
            'sha256':hashlib.sha256(raw).hexdigest(),'sourceRenderSha256':hashlib.sha256(lossless).hexdigest(),
            'sourceRenderFile':str(out/(name+'.webp')),
            'origin':'official-global-client','sourceKind':'render-of-original-client-model',
            'sourceLabel':'ROSE Online Global — model bieżącego klienta',
            'source':'official-client-model-render','sourceUrl':'https://www.roseonlinegame.com/download',
            'sourceImageUrl':reader.client.source['manifestUrl'],'sourceDate':'2026-10-23',
            'sourceVersion':rec['sourceVersion'],'sourceSnapshot':reader.client.source,
            'historical':False,'isScreenshot':False,'currentClientAssetVerified':True,
            'live2026AppearanceVerified':False,'identityValidation':rec['validation'],
            'mapping':{'chrIndex':rec['chrIndex'],'meshObjectIndices':rec['meshObjectIndices'],
                       'skeletonPath':rec['skeletonPath'],'rightHandPartIndex':rec.get('rightHandPartIndex'),
                       'leftHandPartIndex':rec.get('leftHandPartIndex'),'stlStringKey':rec['stringKey']},
            'variant':{'scalePercent':rec.get('scalePercent'),'hitMaterialType':rec.get('textureType'),
                       'glowRGB255':rec.get('glowRGB255'),'glowApplied':False},
            'mappingSources':current['sourceFiles'],**assembly,
            'presentation':{**presentation,'supersample':2},'zscExtensions':extensions,
            'renderNote':'Oryginalny model i tekstury bieżącego klienta, pobrane 23.10.2026; neutralne światło. Aura i efekty cząsteczkowe pominięte.',
            'limitations':[
                'Original model geometry, material textures, skeleton, idle pose and equipped parts fetched from the official updater release ci-38925666467-1.',
                'Neutral presentation render, not an in-game screenshot; environment reflection, bloom/aura and particle effects are omitted.',
                'ZSC2 extension framing and alpha-to-coverage flags validated. Selected materials have alpha-to-coverage disabled. EMIS extension is retained by hash and not interpreted/rendered.',
                'Each portrait is framed independently; scalePercent retains the actual NPC model scale.',
            ],
            'webExport':{'format':'WEBP','quality':92,'method':6,'alphaQuality':100,'alphaLosslessVerified':True},
            'visualQA':{'frontViewChecked':False,'alphaChannelChecked':True,'textureAndMeshSource':'Global current client only'},
        }
        results.append(record)
        (out/(name+'.json')).write_text(json.dumps(record,ensure_ascii=False,indent=2))
        print('rendered current',rec['catalogId'],rec['npcId'],len(parts),'parts',len(raw),'bytes',flush=True)
    manifest={'count':5,'source':reader.client.source,'width':640,'height':640,'totalImageBytes':sum(r['sizeBytes'] for r in results),'records':results}
    (web/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
    print(web/'manifest.json',flush=True)

if __name__=='__main__':main()
