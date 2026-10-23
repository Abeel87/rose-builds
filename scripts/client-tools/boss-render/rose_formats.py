"""Read ROSE model formats without changing the source client.

Format references: rminderhoud/rose-tools rose-lib and rose-godot importers,
https://ralphminderhoud.com/rose-formats/. This is an independent Python reader.
"""
import struct
import numpy as np


class Reader:
    def __init__(self, data):
        self.data = data
        self.pos = 0

    def take(self, n):
        value = self.data[self.pos:self.pos+n]
        if len(value) != n:
            raise ValueError(f'Truncated data at {self.pos}, need {n}')
        self.pos += n
        return value

    def num(self, fmt):
        values = struct.unpack('<'+fmt, self.take(struct.calcsize('<'+fmt)))
        return values[0] if len(values) == 1 else values

    def zstr(self):
        end = self.data.index(b'\0', self.pos)
        value = self.data[self.pos:end]
        self.pos = end + 1
        return value.decode('utf-8', errors='replace').replace('\\', '/').lower()

    def arr(self, dtype, shape):
        return np.frombuffer(self.take(int(np.prod(shape))*np.dtype(dtype).itemsize), dtype=dtype).reshape(shape).copy()

    def done(self):
        if self.pos != len(self.data):
            raise ValueError(f'{len(self.data)-self.pos} trailing bytes')


def read_zsc(data):
    r = Reader(data)
    meshes = [r.zstr() for _ in range(r.num('H'))]
    materials = []
    fields = ['is_skin','alpha_enabled','two_sided','alpha_test_enabled','alpha_ref','z_write_enabled','z_test_enabled','blend_mode','specular_enabled']
    for _ in range(r.num('H')):
        mat = {'path':r.zstr()}
        mat.update(zip(fields,r.num('9H')))
        mat.update(alpha=r.num('f'),glow_type=r.num('H'),glow_color=r.num('3f'))
        materials.append(mat)
    effects = [r.zstr() for _ in range(r.num('H'))]
    objects = []
    def properties():
        out = {'position':[0,0,0],'rotation':[1,0,0,0],'scale':[1,1,1], 'axis_rotation':[1,0,0,0], 'bone_index':-1,'dummy_index':-1,'parent':0}
        specs = {1:('position','3f'),2:('rotation','4f'),3:('scale','3f'),4:('axis_rotation','4f'),5:('bone_index','h'),6:('dummy_index','h'),7:('parent','H'),29:('collision','H'),31:('range','H'),32:('use_lightmap','H')}
        while (flag := r.num('B')):
            size = r.num('B'); raw = r.take(size)
            if flag in specs:
                key, fmt = specs[flag]
                values = struct.unpack('<'+fmt,raw)
                out[key] = values[0] if len(values) == 1 else values
            elif flag == 30:
                out['animation_path'] = raw.decode(errors='replace').strip('\0').replace('\\','/').lower()
            else:
                out[f'unknown_{flag}'] = raw.hex()
        return out
    for index in range(r.num('H')):
        obj = {'index':index, 'bounding_cylinder':r.num('Iii'), 'parts':[], 'effects':[]}
        part_count = r.num('H')
        if part_count:
            for _ in range(part_count):
                part={'mesh_id':r.num('H'),'material_id':r.num('H')};part.update(properties());obj['parts'].append(part)
            for _ in range(r.num('H')):
                effect={'effect_id':r.num('H'),'effect_type':r.num('H')};effect.update(properties());obj['effects'].append(effect)
            obj['bounds'] = r.num('6f')
        objects.append(obj)
    r.done()
    return {'meshes':meshes,'materials':materials,'effects':effects,'objects':objects}


def read_zms(data):
    r = Reader(data)
    magic = r.zstr().upper()
    if magic not in ['ZMS0006','ZMS0007','ZMS0008']:
        raise ValueError(f'Unsupported ZMS {magic}')
    old = magic == 'ZMS0006'
    count_fmt = 'I' if old else 'H'
    out = {'magic':magic,'flags':r.num('I'),'bounds':r.num('6f')}
    bone_count = r.num(count_fmt)
    out['bones'] = np.array([(r.num('I'),r.num('I'))[1] if old else r.num('H') for _ in range(bone_count)],dtype=np.int32)
    n = r.num(count_fmt)
    def values(dtype, width):
        if old:
            return np.array([(r.num('I'), r.arr(dtype,(width,)))[1] for _ in range(n)])
        return r.arr(dtype,(n,width))
    flags=out['flags']
    if flags & 2:out['positions']=values('<f4',3)
    if flags & 4:out['normals']=values('<f4',3)
    if flags & 8:out['colors']=values('<f4',4)
    if flags & 16 and flags & 32:
        weights=[];indices=[]
        for _ in range(n):
            if old:r.num('I')
            weights.append(r.num('4f'));indices.append(r.num('4I' if old else '4H'))
        out['weights']=np.asarray(weights,np.float32);out['bone_indices']=np.asarray(indices,np.int32)
    if flags & 64:out['tangents']=values('<f4',3)
    for i in range(4):
        if flags & (128 << i):out[f'uv{i+1}']=values('<f4',2)
    triangles = r.num(count_fmt)
    if old:
        out['triangles']=np.array([(r.num('I'),r.num('3I'))[1] for _ in range(triangles)],dtype=np.int32)
    else:
        out['triangles']=r.arr('<u2',(triangles,3)).astype(np.int32)
    mat_count = r.num(count_fmt)
    out['material_face_counts']=[(r.num('I'),r.num('I'))[1] if old else r.num('H') for _ in range(mat_count)]
    if not old:
        out['strip_indices']=[r.num('H') for _ in range(r.num('H'))]
        if magic=='ZMS0008':out['pool']=r.num('H')
    r.done()
    if out['triangles'].size and out['triangles'].max() >= n:raise ValueError('Vertex index outside mesh')
    if not np.isfinite(out['positions']).all():raise ValueError('Nonfinite mesh')
    return out


def read_zmd(data):
    r=Reader(data);magic=r.take(7).decode();bones=[];dummies=[]
    if magic not in ['ZMD0002','ZMD0003']:raise ValueError(magic)
    for _ in range(r.num('I')):
        bones.append({'parent':r.num('i'),'name':r.zstr(),'position':r.num('3f'),'rotation':r.num('4f')})
    for _ in range(r.num('I')):
        name=r.zstr();parent=r.num('i');position=r.num('3f');rotation=r.num('4f') if magic=='ZMD0003' else (1,0,0,0)
        dummies.append({'parent':parent,'name':name,'position':position,'rotation':rotation})
    r.done()
    return {'magic':magic,'bones':bones,'dummies':dummies}


def read_zmo(data, frame=0):
    r=Reader(data);magic=r.zstr().upper()
    if magic!='ZMO0002':raise ValueError(magic)
    fps,frames,count=r.num('3I');channels=[r.num('2I') for _ in range(count)]
    widths={2:3,4:4,8:3,16:1,32:2,64:2,128:2,256:2,512:1,1024:1}
    stride=sum(widths[typ] for typ,_ in channels)*4
    r.pos+=stride*(frame%frames)
    values=[(typ,index,r.num('f'*widths[typ])) for typ,index in channels]
    return {'magic':magic,'fps':fps,'frames':frames,'frame':frame%frames,'values':values,'tail_bytes':len(data)-(20+count*8+stride*frames)}


def matrix(position=(0,0,0),rotation=(1,0,0,0),scale=(1,1,1)):
    w,x,y,z=np.asarray(rotation,float)
    norm=w*w+x*x+y*y+z*z
    if norm<1e-12:w,x,y,z=1,0,0,0
    else:w,x,y,z=np.array([w,x,y,z])/np.sqrt(norm)
    rot=np.array([[1-2*y*y-2*z*z,2*x*y-2*z*w,2*x*z+2*y*w],
                  [2*x*y+2*z*w,1-2*x*x-2*z*z,2*y*z-2*x*w],
                  [2*x*z-2*y*w,2*y*z+2*x*w,1-2*x*x-2*y*y]])
    out=np.eye(4);out[:3,:3]=rot@np.diag(np.broadcast_to(scale,(3,)));out[:3,3]=position
    return out


def skeleton_world(skeleton, motion=None, unit_scale=.01):
    values={}
    if motion:
        for typ,index,value in motion['values']:values[(typ,index)]=value
    world=[]
    for i,bone in enumerate(skeleton['bones']):
        position=np.asarray(values.get((2,i),bone['position']))*unit_scale
        rotation=values.get((4,i),bone['rotation']);scale=values.get((1024,i),1)
        local=matrix(position,rotation,scale)
        parent=bone['parent']
        world.append(world[parent]@local if 0<=parent<i else local)
    dummies=[]
    for dummy in skeleton['dummies']:
        local=matrix(np.asarray(dummy['position'])*unit_scale,dummy['rotation'])
        parent=dummy['parent'];dummies.append(world[parent]@local if 0<=parent<len(world) else local)
    return np.asarray(world),np.asarray(dummies)


def posed_mesh(mesh, bind_world, pose_world, transform=None):
    positions=mesh['positions'].astype(float).copy()
    normals=mesh.get('normals',np.zeros_like(positions)).astype(float).copy()
    if 'weights' in mesh:
        joint_ids=mesh['bones'][mesh['bone_indices']]
        skin=pose_world@np.linalg.inv(bind_world)
        m=skin[joint_ids]
        weights=mesh['weights'][...,None]
        hp=np.concatenate([positions,np.ones((len(positions),1))],axis=1)
        positions=np.sum(np.einsum('nijk,nk->nij',m,hp)[...,:3]*weights,axis=1)
        normals=np.sum(np.einsum('nijk,nk->nij',m[...,:3,:3],normals)*weights,axis=1)
    if transform is not None:
        positions=positions@transform[:3,:3].T+transform[:3,3]
        normals=normals@np.linalg.inv(transform[:3,:3])
    normal_lengths=np.linalg.norm(normals,axis=1,keepdims=True)
    normals/=np.maximum(normal_lengths,1e-6)
    return positions.astype(np.float32),normals.astype(np.float32)
