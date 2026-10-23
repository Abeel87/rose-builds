"""Render exact named Global client model assets to local transparent portraits.

No generated illustration or private-server model is used. The public installer
is pinned by the ClientAssets reader. The renderer records every consumed asset.
Lighting and camera are neutral presentation choices, not a gameplay screenshot.
"""
from pathlib import Path
import argparse, hashlib, io, json, math, os, sys
os.environ.setdefault('MESA_SHADER_CACHE_DIR','/tmp/rose-render-mesa-cache')
sys.path.insert(0,'/tmp/rose-render-pylibs')
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'official-maps'))
import moderngl
import numpy as np
from PIL import Image
from client_assets import ClientAssets, normalize
from rose_formats import read_zsc, read_zms, read_zmd, read_zmo, matrix, skeleton_world, posed_mesh

ROOT=Path(__file__).resolve().parent
REFERENCE=ROOT.parent/'boss-appearance-reference'


class ModelReader:
    def __init__(self):
        self.client=ClientAssets();self.cache={};self.consumed={};self.scenes={}

    def read(self,path):
        path=normalize(path)
        if path not in self.cache:self.cache[path]=self.client.read(path)
        raw=self.cache[path]
        self.consumed[path]={**self.client.metadata(path),'sha256':hashlib.sha256(raw).hexdigest()}
        return raw

    def scene(self,path):
        raw=self.read(path)
        if path not in self.scenes:self.scenes[path]=read_zsc(raw)
        return self.scenes[path]

    def assemble(self,rec,frame=0,bind=False):
        self.consumed={}
        skeleton=read_zmd(self.read(rec['skeletonPath']))
        motion_path=next((m['path'] for m in rec['motionPaths'] if m['motionType']==0 and m['path']),None)
        animation=read_zmo(self.read(motion_path),frame=frame) if motion_path and not bind else None
        bind_world,_=skeleton_world(skeleton)
        pose_world,dummies=skeleton_world(skeleton,animation)
        # The ROSE engine appends a runtime dummy `_p1` attached to root bone0.
        # See rose-next/zz_skeleton.cpp read_skeleton() at pinned engine commit.
        dummies=np.concatenate([dummies.reshape((-1,4,4)),pose_world[0:1]])
        parts=[];warnings=[];effects=[]
        def add_object(scene_path,object_index,role):
            scene=self.scene(scene_path);obj=scene['objects'][object_index]
            if not obj['parts']:warnings.append(f'Empty object {scene_path}#{object_index}')
            transforms=[]
            for part_index,p in enumerate(obj['parts']):
                path=scene['meshes'][p['mesh_id']];mesh=read_zms(self.read(path));mat=scene['materials'][p['material_id']]
                texture=self.read(mat['path'])
                local=matrix(np.array(p['position'])*.01,p['rotation'],p['scale'])
                transform=local
                if p['parent']>0:
                    transform=transforms[p['parent']-1]@local
                elif p['dummy_index']>=0:
                    if p['dummy_index']>=len(dummies):raise ValueError(f'Dummy out of range {path}')
                    transform=dummies[p['dummy_index']]@local
                elif p['bone_index']>=0:
                    transform=pose_world[p['bone_index']]@local
                transforms.append(transform)
                positions,normals=posed_mesh(mesh,bind_world,pose_world,transform)
                positions*=float(rec.get('scalePercent') or 100)/100
                parts.append({'positions':positions,'normals':normals,'uv':mesh.get('uv1',np.zeros((len(positions),2),np.float32)), 'triangles':mesh['triangles'],'material':mat,'texture':texture,'meshPath':path,'scenePath':scene_path,'objectIndex':object_index,'partIndex':part_index,'role':role,'meshFormat':mesh['magic'],'boneCount':len(mesh['bones'])})
                if p.get('animation_path'):warnings.append(f'Part motion not evaluated: {p["animation_path"]}')
            effects.extend(obj['effects'])
        for i in rec['meshObjectIndices']:add_object('3ddata/npc/part_npc.zsc',i,'body')
        for field,role,scene in [('rightHandPartIndex','right-hand','3ddata/weapon/list_weapon.zsc'),('leftHandPartIndex','left-hand','3ddata/weapon/list_subwpn.zsc')]:
            if rec.get(field):add_object(scene,rec[field],role)
        return parts,{'animationPath':motion_path if animation else None,'animationFrame':animation['frame'] if animation else None,'animationFrames':animation['frames'] if animation else None,'bindPose':not bool(animation),'skeletonBoneCount':len(skeleton['bones']),'authoredDummyCount':len(skeleton['dummies']),'runtimeDummyCount':len(dummies),'warnings':warnings,'unrenderedEffects':[*rec.get('effects',[]),*effects],'sourceAssets':list(self.consumed.values())}


class Renderer:
    def __init__(self,size=768):
        self.size=size;self.ctx=moderngl.create_standalone_context(backend='egl')
        self.program=self.ctx.program(vertex_shader='''#version 330
uniform mat4 mvp;
in vec3 in_pos;
in vec3 in_normal;
in vec2 in_uv;
out vec3 normal;
out vec2 uv;
void main(){gl_Position=mvp*vec4(in_pos,1.0);normal=in_normal;uv=in_uv;}
''',fragment_shader='''#version 330
uniform sampler2D tex;
uniform float alpha_ref;
uniform float alpha_multiplier;
uniform bool alpha_test;
uniform bool alpha_enabled;
uniform bool two_sided;
uniform vec3 key_light;
uniform vec3 fill_light;
in vec3 normal;
in vec2 uv;
out vec4 color;
void main(){
 vec4 t=texture(tex,uv);
 if(alpha_test && t.a<alpha_ref)discard;
 float alpha=alpha_enabled?(alpha_test?1.0:t.a)*alpha_multiplier:alpha_multiplier;
 vec3 n=normalize(normal);
 if(two_sided && !gl_FrontFacing)n=-n;
 float light=0.60+0.29*max(dot(n,key_light),0.0)+0.11*max(dot(n,fill_light),0.0);
 color=vec4(t.rgb*light,alpha);
}
''')
        self.fbo=self.ctx.framebuffer(color_attachments=[self.ctx.texture((size,size),4)],depth_attachment=self.ctx.depth_renderbuffer((size,size)))

    def render(self,parts,azimuth=-65,elevation=13):
        ctx=self.ctx;prog=self.program;self.fbo.use();ctx.viewport=(0,0,self.size,self.size)
        self.fbo.clear(0,0,0,0,depth=1)
        ctx.enable(moderngl.DEPTH_TEST);ctx.front_face='ccw';ctx.depth_func='<='
        az=math.radians(azimuth);el=math.radians(elevation)
        forward=np.array([math.cos(az)*math.cos(el),math.sin(az)*math.cos(el),math.sin(el)])
        right=np.cross([0,0,1],forward);right/=np.linalg.norm(right);up=np.cross(forward,right)
        view=np.eye(4);view[:3,:3]=np.array([right,up,forward])
        all_pos=np.concatenate([p['positions'] for p in parts]);projected=all_pos@view[:3,:3].T
        low=projected.min(axis=0);high=projected.max(axis=0);center=(low+high)/2
        width=max(high[0]-low[0],high[1]-low[1])*1.13;depth=max(high[2]-low[2],width)
        projection=np.eye(4);projection[0,0]=projection[1,1]=2/width;projection[2,2]=-1/depth
        projection[:3,3]=[-2*center[0]/width,-2*center[1]/width,center[2]/depth]
        mvp=projection@view;prog['mvp'].write(mvp.astype('f4').T.tobytes())
        key=(forward*.5+right*(-.4)+np.array([0,0,.8]));key/=np.linalg.norm(key)
        fill=(forward*.4+right*.8+np.array([0,0,.2]));fill/=np.linalg.norm(fill)
        prog['key_light'].value=tuple(key);prog['fill_light'].value=tuple(fill)
        # Opaque/cutout first, then alpha blended materials from back to front.
        ordered=sorted(parts,key=lambda p:(bool(p['material']['alpha_enabled']),float(p['positions'].mean(axis=0)@forward)))
        rendered=[]
        for part in ordered:
            mat=part['material'];im=Image.open(io.BytesIO(part['texture'])).convert('RGBA')
            tex=ctx.texture(im.size,4,im.tobytes());tex.filter=(moderngl.LINEAR,moderngl.LINEAR);tex.repeat_x=tex.repeat_y=True;tex.use()
            use_alpha=bool(mat['alpha_enabled'] and not mat['specular_enabled'])
            prog['tex'].value=0;prog['alpha_ref'].value=mat['alpha_ref']/255;prog['alpha_test'].value=bool(mat['alpha_test_enabled'] and use_alpha)
            prog['alpha_enabled'].value=use_alpha;prog['alpha_multiplier'].value=mat['alpha'] if not mat['specular_enabled'] else 1.0;prog['two_sided'].value=bool(mat['two_sided'])
            if mat['two_sided']:ctx.disable(moderngl.CULL_FACE)
            else:ctx.enable(moderngl.CULL_FACE)
            if use_alpha:
                ctx.enable(moderngl.BLEND);ctx.blend_func=(moderngl.SRC_ALPHA,moderngl.ONE_MINUS_SRC_ALPHA,moderngl.ONE,moderngl.ONE_MINUS_SRC_ALPHA)
            else:ctx.disable(moderngl.BLEND)
            data=np.concatenate([part['positions'],part['normals'],part['uv']],axis=1).astype('f4')
            vb=ctx.buffer(data.tobytes());ib=ctx.buffer(part['triangles'].astype('i4').tobytes())
            vao=ctx.vertex_array(prog,[(vb,'3f 3f 2f','in_pos','in_normal','in_uv')],ib,index_element_size=4)
            vao.render();vao.release();vb.release();ib.release();tex.release()
            rendered.append({'meshPath':part['meshPath'],'texturePath':mat['path'],'scenePath':part['scenePath'],'objectIndex':part['objectIndex'],'partIndex':part['partIndex'],'role':part['role'],'vertices':len(part['positions']),'triangles':len(part['triangles']),'material':mat})
        pixels=np.frombuffer(self.fbo.read(components=4,alignment=1),np.uint8).reshape((self.size,self.size,4))[::-1].copy()
        # Blend on transparent produces premultiplied RGB; PNG stores straight RGB.
        a=pixels[:,:,3:4].astype(float)/255
        pixels[:,:,:3]=np.minimum(255,pixels[:,:,:3].astype(float)/np.maximum(a,1/255)).astype(np.uint8)
        pixels[a[:,:,0]==0,:3]=0
        return Image.fromarray(pixels,'RGBA'),{'azimuth':azimuth,'elevation':elevation,'projection':'orthographic','renderer':self.ctx.info['GL_RENDERER'],'bounds':np.stack([all_pos.min(axis=0),all_pos.max(axis=0)]).tolist(),'parts':rendered}


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--ids',nargs='*');parser.add_argument('--size',type=int,default=640);parser.add_argument('--supersample',type=int,default=2);parser.add_argument('--frame',type=int,default=0);parser.add_argument('--azimuth',type=float,default=-65);parser.add_argument('--elevation',type=float,default=13);parser.add_argument('--bind',action='store_true');parser.add_argument('--suffix',default='');args=parser.parse_args()
    records=json.loads((REFERENCE/'global-boss-model-manifest.json').read_text())['records']
    extra=REFERENCE/'global-extra-boss-models.json'
    if extra.exists():records+=json.loads(extra.read_text())
    if args.ids:records=[r for r in records if str(r.get('npcId',r.get('catalogId'))) in args.ids]
    reader=ModelReader();renderer=Renderer(args.size*args.supersample);out=ROOT/'renders';out.mkdir(exist_ok=True);manifest=[]
    for rec in records:
        if not rec.get('modelAvailable'):continue
        npc_id=str(rec['npcId']);name=rec['name'];stem=f'{npc_id}{args.suffix}'
        try:
            parts,assembly=reader.assemble(rec,args.frame,args.bind);im,presentation=renderer.render(parts,args.azimuth,args.elevation)
            if args.supersample>1:im=im.resize((args.size,args.size),Image.Resampling.LANCZOS)
            presentation['supersample']=args.supersample
            im.save(out/(stem+'.png'))
            encoded=io.BytesIO();im.save(encoded,format='WEBP',lossless=True,method=4)
            webp=encoded.getvalue()
            if not webp:
                # libwebp can return an empty buffer without raising for a few
                # palettized-alpha configurations; reloading PNG and method6
                # provides a deterministic lossless fallback.
                encoded=io.BytesIO()
                Image.open(out/(stem+'.png')).convert('RGBA').save(encoded,format='WEBP',lossless=True,method=6)
                webp=encoded.getvalue()
            Image.open(io.BytesIO(webp)).load()
            (out/(stem+'.webp')).write_bytes(webp)
            record={'npcId':npc_id,'name':name,'image':str(out/(stem+'.webp')),'png':str(out/(stem+'.png')),'width':im.width,'height':im.height,'sha256':hashlib.sha256((out/(stem+'.webp')).read_bytes()).hexdigest(),'source':'official-client-model-render','historical':True,'sourceVersion':'Global public installer November 2024','sourceInstallerSha256':'e3214a0970355a4df93dad4300fecdd53f2a0b3b47afb7d54bf513d0b20f7477','variant':{'scalePercent':rec.get('scalePercent'),'textureType':rec.get('textureType'),'glow':rec.get('glow')},**assembly,'presentation':presentation}
            (out/(stem+'.json')).write_text(json.dumps(record,indent=2,ensure_ascii=False));manifest.append(record)
            print('rendered',npc_id,name,len(parts),'parts',im.getbbox(),flush=True)
        except Exception as error:
            import traceback;traceback.print_exc();manifest.append({'npcId':npc_id,'name':name,'error':str(error)})
    (ROOT/f'render-manifest{args.suffix}.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False))

if __name__=='__main__':main()
