"""Selective reader for the official public updater release, using HTTP Range.

BITA1 archive format is implemented from the public bitar 0.14.0 crate used by
Rednim's open-source updater. Header, per-chunk and whole small-file checksums are
verified with BLAKE2b. Only requested VFS chunks are downloaded and cached.
"""
from pathlib import Path
import argparse,bisect,hashlib,json,struct,subprocess
import zstandard
from client_assets import ROOT,ClientAssets,normalize,utc_timestamp,blake3,Cipher,algorithms,read_stb,read_stl

CURRENT=ROOT/'current-client';BASE='https://updates.roseonlinegame.com/'
MANIFEST=ROOT.parent/'orlo-current-manifest.json'

def varint(data,pos=0):
    result=0;shift=0
    while True:
        v=data[pos];pos+=1;result|=(v&127)<<shift
        if not v&128:return result,pos
        shift+=7
        if shift>70:raise ValueError('Invalid protobuf varint')

def proto(data):
    pos=0;fields={}
    while pos<len(data):
        tag,pos=varint(data,pos);field=tag>>3;wire=tag&7
        if wire==0:value,pos=varint(data,pos)
        elif wire==2:
            size,pos=varint(data,pos);value=data[pos:pos+size];pos+=size
        else:raise ValueError(f'Unsupported protobuf wire type {wire}')
        fields.setdefault(field,[]).append(value)
    return fields

def range_fetch(url,start,size,path):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True);temp=path.with_suffix(path.suffix+'.download')
    args=['curl','--fail','--silent','--show-error','--location','--max-time','60','--max-filesize',str(size+4096),'--range',f'{start}-{start+size-1}',url,'--output',str(temp)]
    subprocess.run(args,check=True)
    if temp.stat().st_size!=size:raise ValueError(f'Unexpected HTTP range length for {url}: {temp.stat().st_size} != {size}')
    temp.replace(path)
    return path.read_bytes()

class CbaArchive:
    def __init__(self,url,cache,allow_network=False,local=None):
        self.url=url;self.cache=Path(cache);self.cache.mkdir(parents=True,exist_ok=True);self.allow_network=allow_network;self.local=Path(local) if local else None
        header_path=self.cache/'header.bin'
        if self.local:
            with self.local.open('rb') as f:
                pre=f.read(14);length=struct.unpack_from('<Q',pre,6)[0];header=pre+f.read(length+72)
            header_path.write_bytes(header)
        elif header_path.exists():header=header_path.read_bytes()
        else:
            if not allow_network:raise FileNotFoundError(f'Archive header not cached: {header_path}')
            pre=range_fetch(url,0,14,self.cache/'preheader.bin');length=struct.unpack_from('<Q',pre,6)[0]
            if length>10_000_000:raise ValueError('Unreasonable CBA dictionary size')
            header=range_fetch(url,0,14+length+72,header_path)
        if header[:6]!=b'BITA1\0':raise ValueError('Invalid CBA magic')
        length=struct.unpack_from('<Q',header,6)[0];tail=14+length+8
        if hashlib.blake2b(header[:tail]).digest()!=header[tail:tail+64]:raise ValueError('CBA header checksum mismatch')
        self.header_sha256=hashlib.sha256(header).hexdigest();self.data_offset=struct.unpack_from('<Q',header,14+length)[0]
        d=proto(header[14:14+length]);self.size=d[3][0];self.source_hash=d[2][0];self.version=d[1][0].decode();self.compression=proto(d[5][0]).get(2,[0])[0]
        self.chunks=[]
        for raw in d[7]:
            c=proto(raw);self.chunks.append({'checksum':c[1][0],'archiveSize':c.get(3,[0])[0],'archiveOffset':self.data_offset+c.get(4,[0])[0],'sourceSize':c.get(5,[0])[0]})
        order=[]
        for value in d[6]:
            if isinstance(value,int):order.append(value)
            else:
                pos=0
                while pos<len(value):v,pos=varint(value,pos);order.append(v)
        self.order=order;self.source_offsets=[];offset=0
        for i in order:self.source_offsets.append(offset);offset+=self.chunks[i]['sourceSize']
        if offset!=self.size:raise ValueError('CBA source length mismatch')
    def chunk(self,i):
        c=self.chunks[i];path=self.cache/f'chunk-{i}.bin'
        if path.exists():raw=path.read_bytes()
        else:
            if self.local:
                with self.local.open('rb') as f:f.seek(c['archiveOffset']);compressed=f.read(c['archiveSize'])
            else:
                if not self.allow_network:raise FileNotFoundError(f'Chunk not cached: {i}; run with network permission')
                compressed=range_fetch(self.url,c['archiveOffset'],c['archiveSize'],self.cache/f'chunk-{i}.compressed')
            if c['archiveSize']==c['sourceSize']:raw=compressed
            elif self.compression==2:raw=zstandard.ZstdDecompressor().decompress(compressed,max_output_size=c['sourceSize'])
            else:raise ValueError(f'Unsupported compression {self.compression}')
            if len(raw)!=c['sourceSize']:raise ValueError('CBA chunk size mismatch')
            if hashlib.blake2b(raw).digest()[:len(c['checksum'])]!=c['checksum']:raise ValueError('CBA chunk checksum mismatch')
            path.write_bytes(raw)
        if len(raw)!=c['sourceSize'] or hashlib.blake2b(raw).digest()[:len(c['checksum'])]!=c['checksum']:raise ValueError('Cached CBA chunk checksum mismatch')
        return raw
    def read(self,offset,size):
        if offset<0 or size<0 or offset+size>self.size:raise ValueError('CBA range outside source')
        out=[];end=offset+size;i=bisect.bisect_right(self.source_offsets,offset)-1
        while offset<end:
            start=self.source_offsets[i];c=self.chunks[self.order[i]];take=min(end-offset,c['sourceSize']-(offset-start));raw=self.chunk(self.order[i]);out.append(raw[offset-start:offset-start+take]);offset+=take;i+=1
        return b''.join(out)

class CurrentClientAssets:
    def __init__(self,allow_network=False):
        self.manifest=json.loads(MANIFEST.read_text());files={r['source_path']:r for r in self.manifest['files']};self.release=files['data.idx']['path'].split('/data/')[0]
        executable=(ROOT/'full-client/app/trose.exe').read_bytes()
        rd=lambda va,n:executable[va-0x140001a00:va-0x140001a00+n]
        if hashlib.sha256(executable).hexdigest()!='7ca774816abc630dcb539725e0634df4da13f733659191262af678f8674ba302':raise ValueError('Unexpected local format-reference executable')
        self.file_key=rd(0x1414c2350,16)+rd(0x1414c2340,16);self.file_counter_nonce=struct.pack('<IQI',0,0xad9b2c7657f83918,0x7331be51)
        self.archive=CbaArchive(BASE+files['rose.vfs']['path'],CURRENT/'vfs-chunks',allow_network=allow_network)
        if self.archive.size!=files['rose.vfs']['source_size'] or self.archive.source_hash!=bytes(files['rose.vfs']['source_hash']):raise ValueError('VFS archive disagrees with official manifest')
        raw=(CURRENT/'data.idx').read_bytes()
        if len(raw)!=files['data.idx']['source_size'] or hashlib.blake2b(raw).digest()!=bytes(files['data.idx']['source_hash']):raise ValueError('Index disagrees with official manifest')
        exe=(ROOT/'full-client/app/trose.exe').read_bytes();rd=lambda va,n:exe[va-0x140001a00:va-0x140001a00+n]
        key=rd(0x1414c2330,16)+rd(0x1414c2320,16);nonce=struct.pack('<IQI',0,0x35a2352e2dcc13b5,0xfcd28d02)
        plain=Cipher(algorithms.ChaCha20(key,nonce),None).decryptor().update(raw)
        base,current,flags=struct.unpack_from('<III',plain);extended=bool(flags&0x80000000);vfs_count=flags&0x7fffffff
        if (base,current,vfs_count)!=(0,0,1):raise ValueError('Unexpected current VFS header')
        plen=struct.unpack_from('<H',plain,12)[0];table=struct.unpack_from('<I',plain,14+plen)[0]
        count=struct.unpack_from('<I',plain,table)[0];header=table+(12 if extended else 8);stride=57 if extended else 53
        if len(plain)!=header+count*stride:raise ValueError('Unexpected current index size')
        self.entries={};self.count=count
        for i in range(count):
            pos=header+i*stride;h=plain[pos:pos+32];offset,size,timestamp,reserved,encrypted=struct.unpack_from('<QIQIB' if extended else '<IIQIB',plain,pos+32)
            if offset+size>self.archive.size:raise ValueError('VFS record outside payload')
            self.entries[h]={'entryIndex':i,'offset':offset,'sizeBytes':size,'modifiedTimestamp':timestamp,'modifiedAt':utc_timestamp(timestamp),'reserved':reserved,'encrypted':bool(encrypted),'pathHashBlake3':h.hex()}
        self.source={'manifestUrl':BASE+'manifest.json','manifestSha256':hashlib.sha256(MANIFEST.read_bytes()).hexdigest(),'release':self.release,'indexUrl':BASE+files['data.idx']['path'],'indexBlake2b':bytes(files['data.idx']['source_hash']).hex(),'vfsUrl':self.archive.url,'vfsSourceSize':self.archive.size,'vfsBlake2b':self.archive.source_hash.hex(),'archiveHeaderSha256':self.archive.header_sha256,'retrievedAt':'2026-10-23','retrievalMethod':'HTTP byte ranges; each CBA header and downloaded chunk verified by BLAKE2b','gameVersion':None}
    def metadata(self,path):
        path=normalize(path);r=self.entries.get(blake3.blake3(path.encode()).digest());return {'path':path,**r} if r else None
    def read(self,path):
        rec=self.metadata(path)
        if not rec:raise FileNotFoundError(path)
        raw=self.archive.read(rec['offset'],rec['sizeBytes'])
        return Cipher(algorithms.ChaCha20(self.file_key,self.file_counter_nonce),None).decryptor().update(raw) if rec['encrypted'] else raw
    def save(self,path,target_root):
        raw=self.read(path);target=Path(target_root)/normalize(path);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
        return {**self.metadata(path),'extractedPath':str(target),'extractedSha256':hashlib.sha256(raw).hexdigest()}

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('paths',nargs='+');p.add_argument('--fetch',action='store_true');args=p.parse_args();c=CurrentClientAssets(allow_network=args.fetch);out=CURRENT/'assets';records=[]
    for path in args.paths:
        rec=c.save(path,out);records.append(rec);print(path,rec['sizeBytes'],rec['modifiedAt'],flush=True)
        if path.lower().endswith('.stb'):parsed=read_stb(c.read(path))
        elif path.lower().endswith('.stl'):parsed=read_stl(c.read(path))
        else:parsed=None
        if parsed is not None:Path(rec['extractedPath']+'.json').write_text(json.dumps(parsed,ensure_ascii=False,indent=2))
    (CURRENT/'last-extraction.json').write_text(json.dumps({'source':c.source,'records':records},indent=2))

if __name__=='__main__':main()
