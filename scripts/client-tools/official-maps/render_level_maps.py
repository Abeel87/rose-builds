"""Render missing minimaps from exact original level meshes and heightfields.

These are derived orthographic views, not shipped minimap artwork. Original
geometry, object placement, terrain texture layers and indices are retained.
No NPC, boss or route markers are inferred. Current-server layout is unverified.
"""
from pathlib import Path
import argparse,hashlib,io,json,math,struct,sys
import numpy as np
from PIL import Image
from client_assets import ClientAssets,ROOT,normalize
sys.path.insert(0,str(ROOT.parent/'boss-render'))
from rose_formats import read_zms,matrix
from zsc_extensions import read_zsc
from render_bosses import Renderer

def read_image(raw):
    try:
        im=Image.open(io.BytesIO(raw));im.load();return im.convert('RGBA')
    except NotImplementedError:
        h,w=struct.unpack_from('<II',raw,12);bits=struct.unpack_from('<I',raw,88)[0];masks=struct.unpack_from('<4I',raw,92)
        if bits!=16 or masks[:3]!=(63488,2016,31):raise
        return Image.frombytes('RGB',(w,h),raw[128:128+w*h*2],'raw','BGR;16').convert('RGBA')

class LevelReader:
    def __init__(self,current=False,cutaway=False):
        if current:
            from current_assets import CurrentClientAssets
            self.client=CurrentClientAssets(allow_network=True)
        else:self.client=ClientAssets()
        self.raw={};self.consumed={};self.meshes={};self.textures={};self.scenes={};self.batches={};self.omitted=[];self.object_count=0;self.cutaway=cutaway;self.omitted_ceilings={}
    def read(self,path):
        path=normalize(path)
        if path not in self.raw:self.raw[path]=self.client.read(path)
        raw=self.raw[path];self.consumed[path]={**self.client.metadata(path),'sha256':hashlib.sha256(raw).hexdigest()};return raw
    def scene(self,path):
        path=normalize(path)
        if path not in self.scenes:
            self.scenes[path]=read_zsc(self.read(path))
            for extension in self.scenes[path].get('extensions',[]):
                self.omitted.append({'kind':'material-extension-rendering','path':path,'tag':extension['tag'],'size':extension['size'],'sha256':extension['sha256'],'framingValidated':True,'reason':'Original geometry and textures are retained; neutral renderer does not reproduce alpha-to-coverage or emissive effects.'})
        return self.scenes[path]
    def mesh(self,path):
        path=normalize(path)
        if path not in self.meshes:self.meshes[path]=read_zms(self.read(path))
        return self.meshes[path]
    def add(self,positions,normals,uv,triangles,material,texture,source,role):
        key=(json.dumps(material,sort_keys=True),role)
        if key not in self.batches:self.batches[key]={'positions':[],'normals':[],'uv':[],'triangles':[],'material':material,'texture':texture,'count':0,'meshPath':source,'scenePath':'original-level','objectIndex':0,'partIndex':0,'role':role}
        batch=self.batches[key];batch['positions'].append(positions);batch['normals'].append(normals);batch['uv'].append(uv);batch['triangles'].append(triangles+batch['count']);batch['count']+=len(positions)
    def objects(self,geo):
        for chunk in geo['objects']:
            self.read(chunk['path'])
            for kind,scene_path in [('1',geo['decoZsc']),('3',geo['cnstZsc'])]:
                scene=self.scene(scene_path)
                for obj in chunk['objects'].get(kind,[]):
                    self.object_count+=1
                    x,y,z,w=obj['rotation'];root=matrix(np.asarray(obj['position'])*.01,[w,x,y,z],obj['scale'])
                    model=scene['objects'][obj['objectId']];transforms=[]
                    for p in model['parts']:
                        local=matrix(np.asarray(p['position'])*.01,p['rotation'],p['scale'])
                        parent=p.get('parent',0);transform=transforms[parent-1]@local if parent>0 else root@local;transforms.append(transform)
                        path=scene['meshes'][p['mesh_id']]
                        if self.cutaway and '/sikucelling' in path:
                            self.read(path)
                            self.omitted_ceilings[path]=self.omitted_ceilings.get(path,0)+1
                            continue
                        mesh=self.mesh(path);mat=scene['materials'][p['material_id']]
                        v=mesh['positions']@transform[:3,:3].T+transform[:3,3];n=mesh.get('normals',np.zeros_like(v))@np.linalg.inv(transform[:3,:3]);n/=np.maximum(np.linalg.norm(n,axis=1,keepdims=True),1e-6)
                        self.add(v,n,mesh.get('uv1',np.zeros((len(v),2))),mesh['triangles'],mat,self.read(mat['path']),path,'placed-static-object')
            for kind in ['6']:
                if chunk['objects'].get(kind):self.omitted.append({'kind':'animated-object','path':chunk['path'],'count':len(chunk['objects'][kind])})
    def terrain(self,geo):
        zon=geo['zon'];self.read(geo['zoneFile']['path']);tile_textures={};files={f['path']:f for f in geo['tileFiles']}
        for f in geo['tileFiles']:
            if not f['path'].endswith('.him'):continue
            base=f['path'][:-4];til_path=base+'.til'
            if til_path not in files:raise ValueError(f'Missing TIL for {base}')
            raw=self.read(f['path']);w,h=struct.unpack_from('<II',raw);heights=np.frombuffer(raw,dtype='<f4',count=w*h,offset=16).reshape((h,w))*.01
            rawtil=self.read(til_path);tw,th=struct.unpack_from('<II',rawtil);tile_ids=np.array([struct.unpack_from('<I',rawtil,8+i*7+3)[0] for i in range(tw*th)]).reshape((th,tw))
            nx=(w-1)//tw;ny=(h-1)//th;grid=zon['info']['gridSize']*.01;block_width=(w-1)*grid;block_height=(h-1)*grid
            gy,gx=np.mgrid[:ny+1,:nx+1];uv=np.stack([gx/nx,gy/ny],axis=-1).reshape((-1,2));tr=[]
            for yy in range(ny):
                for xx in range(nx):
                    i=yy*(nx+1)+xx;tr.extend([[i,i+nx+1,i+1],[i+1,i+nx+1,i+nx+2]])
            tr=np.asarray(tr,dtype=np.int32)
            for ty in range(th):
                for tx in range(tw):
                    tile_id=int(tile_ids[ty,tx]);tile=zon['tiles'][tile_id]
                    if tile_id not in tile_textures:
                        p1=zon['textures'][tile['layer1']+tile['offset1']];p2=zon['textures'][tile['layer2']+tile['offset2']]
                        im1=read_image(self.read(p1));im2=read_image(self.read(p2)).resize(im1.size)
                        rotation=tile['rotation']
                        if rotation==2:im2=im2.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                        elif rotation==3:im2=im2.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
                        elif rotation==4:im2=im2.transpose(Image.Transpose.ROTATE_180)
                        elif rotation==5:im2=im2.transpose(Image.Transpose.ROTATE_270)
                        elif rotation==6:im2=im2.transpose(Image.Transpose.ROTATE_90)
                        composite=Image.composite(im2,im1,im2.getchannel('A')).convert('RGB');buffer=io.BytesIO();composite.save(buffer,'PNG');tile_textures[tile_id]=buffer.getvalue()
                    # IFO positions use the map centre plus half a block as
                    # their origin. Client terrain global coordinates are
                    # x=blockX*160, y=(65-blockY)*160 minus local row spacing;
                    # IFO world coordinates add (5200,5200) metres. Subtract
                    # that shared translation to retain exact IFO placement.
                    x=(f['x']-32.5)*block_width+(tx*nx+gx)*grid;y=(32.5-f['y'])*block_height-(ty*ny+gy)*grid;z=heights[ty*ny:ty*ny+ny+1,tx*nx:tx*nx+nx+1]
                    v=np.stack([x,y,z],axis=-1).reshape((-1,3));dzdy,dzdx=np.gradient(z,grid,grid);norm=np.stack([-dzdx,dzdy,np.ones_like(z)],axis=-1).reshape((-1,3));norm/=np.maximum(np.linalg.norm(norm,axis=1,keepdims=True),1e-6)
                    mat={'path':f'original-terrain-merged-tile-{tile_id}','alpha_enabled':0,'alpha_test_enabled':0,'alpha_ref':0,'alpha':1.,'two_sided':1,'specular_enabled':0}
                    self.add(v,norm,uv,tr,mat,tile_textures[tile_id],f['path'],'original-heightfield')
    def parts(self):
        output=[]
        for batch in self.batches.values():
            for key in ['positions','normals','uv','triangles']:batch[key]=np.concatenate(batch[key])
            output.append(batch)
        return output

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--zones',type=int,nargs='+',default=[143,169]);p.add_argument('--size',type=int,default=1536);p.add_argument('--objects-only',action='store_true');p.add_argument('--current',action='store_true');p.add_argument('--cutaway',action='store_true',help='Omit only explicitly named Sikuku ceiling meshes to expose room interiors.');args=p.parse_args()
    out=ROOT/'derived-maps';out.mkdir(exist_ok=True);renderer=Renderer(args.size)
    for zone_id in args.zones:
        folder='current-dungeon-analysis' if args.current else 'dungeon-analysis';geo=json.loads((ROOT/f'{folder}/zone-{zone_id}-geometry.json').read_text());reader=LevelReader(current=args.current,cutaway=args.cutaway);reader.objects(geo)
        if not args.objects_only:reader.terrain(geo)
        parts=reader.parts();print('assembled',zone_id,len(parts),'batches',sum(len(p['triangles']) for p in parts),'triangles',flush=True)
        im,presentation=renderer.render(parts,azimuth=-90,elevation=90)
        stem=f'zone-{zone_id}-original-level-topdown'+('-current' if args.current else '')+('-objects-only' if args.objects_only else '')+('-cutaway' if args.cutaway else '')
        buf=io.BytesIO();im.save(buf,'WEBP',lossless=True,method=6);target=out/(stem+'.webp');target.write_bytes(buf.getvalue())
        rec={'zoneId':zone_id,'name':geo['sourceName'],'image':str(target),'width':im.width,'height':im.height,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'sourceKind':'derived-orthographic-render-of-original-client-level','isOriginalMinimapArtwork':False,'sourceSnapshot':'Official full installer November 2024','sourceInstallerSha256':'e3214a0970355a4df93dad4300fecdd53f2a0b3b47afb7d54bf513d0b20f7477','zoneFile':geo['zoneFile'],'sourceAssets':list(reader.consumed.values()),'objectCount':reader.object_count,'terrainIncluded':not args.objects_only,'omitted':reader.omitted,'presentation':presentation,'limitations':['Orthographic render using original static meshes, object placement, heightfield and texture layers.','Neutral lighting is not the original in-game renderer; baked lighting, dynamic effects, NPCs and animated decorations are omitted.','No bosses or spawn points are overlaid.','The November 2024 installer cannot establish the latest server layout.']}
        if args.current:
            rec['sourceSnapshot']='Current official updater release retrieved 2026-10-23';rec.pop('sourceInstallerSha256',None);rec['source']=reader.client.source;rec['limitations'][-1]='Current official client assets establish the geometry shown; public availability and live-server spawns are not inferred.'
        rec['coordinateEvidence']={'source':'https://github.com/exjam/rose-offline-client/blob/9802251b1f99921cc67408273e0c1e0133153a55/src/zone_loader.rs','terrainFunction':'spawn_terrain','objectFunction':'spawn_object','worldOriginTranslationMetres':[5200,5200,0],'presentationOrigin':'Original IFO coordinates; global shared origin translation is subtracted from terrain.','axes':'Original ROSE x-right, y-up, z-height; orthographic camera looks down positive z.'}
        rec['cutaway']=args.cutaway
        if args.cutaway:
            rec['omitted'].extend({'kind':'named-ceiling-mesh','path':path,'count':count,'reason':'Ceiling omitted solely to expose original room interior in this cutaway view.'} for path,count in reader.omitted_ceilings.items())
            rec['limitations'].append('Cutaway presentation omits the explicitly named Sikuku ceiling meshes; the unchanged full-geometry view is retained separately.')
        (out/(stem+'.json')).write_text(json.dumps(rec,indent=2));print('rendered',zone_id,im.getbbox(),target.stat().st_size,flush=True)

if __name__=='__main__':main()
