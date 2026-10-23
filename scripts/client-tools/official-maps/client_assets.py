"""Read-only asset reader for the pinned official ROSE installer (November 2024).

This reader extracts existing game art for identification. It never edits a game
client or contacts the game service. Format observations are pinned to the public
installer SHA256 e3214a0970355a4df93dad4300fecdd53f2a0b3b47afb7d54bf513d0b20f7477.
The executable contains the format reader; constants are read from that local
executable rather than embedded here. Different releases require revalidation.

Dependencies: cryptography, blake3 (temporary install: /tmp/rose-pylibs).
"""
from pathlib import Path
import argparse, datetime, hashlib, io, json, struct, sys
sys.path.insert(0, '/tmp/rose-pylibs')
import blake3
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms

ROOT = Path(__file__).resolve().parent
DEFAULT_EXE = ROOT / 'full-client/app/trose.exe'
DEFAULT_IDX = ROOT / 'full-client/app/data.idx'
DEFAULT_VFS = Path('/tmp/rose-full-client/app/rose.vfs')

def normalize(path):
    path=str(path).replace('\\', '/').lower().removeprefix('./').lstrip('/')
    while '//' in path:path=path.replace('//','/')
    return path

def utc_timestamp(timestamp):
    return datetime.datetime.fromtimestamp(timestamp,datetime.timezone.utc).isoformat().replace('+00:00','Z')

class ClientAssets:
    def __init__(self, exe=DEFAULT_EXE, idx=DEFAULT_IDX, vfs=DEFAULT_VFS):
        self.vfs = Path(vfs)
        executable = Path(exe).read_bytes()
        if hashlib.sha256(executable).hexdigest()!='7ca774816abc630dcb539725e0634df4da13f733659191262af678f8674ba302':
            raise ValueError('Executable SHA256 differs from the inspected official installer')
        def constant(virtual_address, size):
            offset=virtual_address-0x140001a00
            return executable[offset:offset+size]
        if constant(0x1414c2360,16) != b'expand 32-byte k':
            raise ValueError('Executable does not match the inspected 2024 asset reader')
        index_key=constant(0x1414c2330,16)+constant(0x1414c2320,16)
        index_counter_nonce=struct.pack('<IQI',0,0x35a2352e2dcc13b5,0xfcd28d02)
        self.file_key=constant(0x1414c2350,16)+constant(0x1414c2340,16)
        self.file_counter_nonce=struct.pack('<IQI',0,0xad9b2c7657f83918,0x7331be51)
        plain=Cipher(algorithms.ChaCha20(index_key,index_counter_nonce),None).decryptor().update(Path(idx).read_bytes())
        self.index_plain=plain
        base, current, vfs_count = struct.unpack_from('<III',plain,0)
        if (base,current,vfs_count)!=(0,0,1):
            raise ValueError('Unexpected decoded VFS index header')
        path_len=struct.unpack_from('<H',plain,12)[0]
        self.vfs_name=plain[14:14+path_len].decode('utf-8')
        table_offset=struct.unpack_from('<I',plain,14+path_len)[0]
        count, deleted=struct.unpack_from('<II',plain,table_offset)
        if deleted or len(plain)!=table_offset+8+53*count:
            raise ValueError('Unexpected index table size')
        self.entries={}
        for i in range(count):
            pos=table_offset+8+53*i
            name_hash=plain[pos:pos+32]
            offset,size,timestamp,unknown,encrypted=struct.unpack_from('<IIQIB',plain,pos+32)
            if offset+size>self.vfs.stat().st_size:
                raise ValueError('Incomplete VFS payload')
            self.entries[name_hash]={'entryIndex':i,'offset':offset,'sizeBytes':size,'modifiedTimestamp':timestamp,'modifiedAt':utc_timestamp(timestamp),'reserved':unknown,'encrypted':bool(encrypted),'pathHashBlake3':name_hash.hex()}
        self.count=count

    def metadata(self,path):
        path=normalize(path)
        rec=self.entries.get(blake3.blake3(path.encode('utf-8')).digest())
        return {'path':path,**rec} if rec else None

    def read(self,path):
        rec=self.metadata(path)
        if rec is None:raise FileNotFoundError(path)
        with self.vfs.open('rb') as f:
            f.seek(rec['offset']); raw=f.read(rec['sizeBytes'])
        if len(raw)!=rec['sizeBytes']:raise ValueError('Truncated asset')
        return Cipher(algorithms.ChaCha20(self.file_key,self.file_counter_nonce),None).decryptor().update(raw) if rec['encrypted'] else raw

    def save(self,path,target_root):
        raw=self.read(path); target=Path(target_root)/normalize(path)
        target.parent.mkdir(parents=True,exist_ok=True); target.write_bytes(raw)
        return {**self.metadata(path),'extractedPath':str(target),'extractedSha256':hashlib.sha256(raw).hexdigest()}

class Reader:
    def __init__(self,data):self.data=data; self.pos=0
    def take(self,n):
        out=self.data[self.pos:self.pos+n]
        if len(out)!=n:raise ValueError('Truncated structured asset')
        self.pos+=n; return out
    def num(self,fmt):
        fmt='<'+fmt;return struct.unpack(fmt,self.take(struct.calcsize(fmt)))[0]
    def string(self,kind='H'):
        if kind=='var':
            length=self.num('B')
            if length&0x80:length=(self.num('B')<<7)|(length&0x7f)
        else:length=self.num(kind)
        data=self.take(length)
        try:return data.decode('utf-8')
        except UnicodeDecodeError:return data.decode('cp949',errors='replace')

def read_stb(data):
    r=Reader(data); magic=r.take(4)
    if magic not in [b'STB0',b'STB1']:raise ValueError(magic)
    data_offset=r.num('I'); rows=r.num('I'); columns=r.num('I'); row_height=r.num('I')
    r.take(4 if magic==b'STB0' else 2*(columns+1))
    column_names=[r.string() for _ in range(columns)]
    title=r.string();row_names=[r.string() for _ in range(rows-1)]
    r.pos=data_offset
    cells=[[r.string() for _ in range(columns-1)] for _ in range(rows-1)]
    if r.pos!=len(data):raise ValueError(f'STB trailing bytes: {len(data)-r.pos}')
    return {'format':magic.decode(),'rows':rows-1,'columns':columns-1,'columnNames':column_names,'title':title,'rowNames':row_names,'cells':cells}

def read_stl(data):
    r=Reader(data); kind=r.string('var')
    if kind not in ['ITST01','NRST01','QEST01']:raise ValueError(kind)
    count=r.num('I'); keys=[{'key':r.string('var'),'id':r.num('I')} for _ in range(count)]
    languages=r.num('I');language_offsets=[r.num('I') for _ in range(languages)]; output=[]
    for offset in language_offsets:
        r.pos=offset; entry_offsets=[r.num('I') for _ in range(count)]; entries=[]
        for key,entry_offset in zip(keys,entry_offsets):
            r.pos=entry_offset
            texts=[r.string('var') for _ in range({'NRST01':1,'ITST01':2,'QEST01':4}[kind])]
            entries.append({**key,'texts':texts})
        output.append(entries)
    return {'format':kind,'languages':output}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('paths',nargs='+');p.add_argument('--output',type=Path,default=ROOT/'tables');args=p.parse_args()
    client=ClientAssets();manifest=[]
    for path in args.paths:
        rec=client.save(path,args.output);manifest.append(rec)
        if path.lower().endswith('.stb'):parsed=read_stb(client.read(path))
        elif path.lower().endswith('.stl'):parsed=read_stl(client.read(path))
        else:parsed=None
        if parsed is not None:Path(rec['extractedPath']+'.json').write_text(json.dumps(parsed,ensure_ascii=False,indent=2))
        print(path,rec['sizeBytes'],rec['modifiedAt'])
    (args.output/'extraction-manifest.json').write_text(json.dumps(manifest,indent=2))

if __name__=='__main__':main()
