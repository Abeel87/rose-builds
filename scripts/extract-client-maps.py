"""Extract only positively identified minimaps from a pinned ROSE installer VFS.

This does not decrypt the index, reconstruct terrain, or infer spawn coordinates.
The source is the official Full Client installer retrieved on 2026-10-23. Its
index timestamp is 2024-11-22, not a guarantee of the latest patched game state.
Each input DDS fragment is verified against its SHA-256 before conversion.
"""
import argparse, hashlib, io, json, struct
from pathlib import Path
from PIL import Image

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('vfs',type=Path)
    parser.add_argument('manifest',type=Path)
    parser.add_argument('output',type=Path)
    args=parser.parse_args();manifest=json.loads(args.manifest.read_text());args.output.mkdir(parents=True,exist_ok=True)
    with args.vfs.open('rb') as f:
        for r in manifest['maps']:
            f.seek(r['offset']);raw=f.read(r['ddsBytes'])
            if hashlib.sha256(raw).hexdigest()!=r['ddsSha256']:
                raise ValueError(f"Source DDS does not match pinned installer: {r['name']}")
            try:
                im=Image.open(io.BytesIO(raw));im.load();im=im.convert('RGB')
            except NotImplementedError:
                masks=struct.unpack_from('<4I',raw,92)
                if r['bits']!=16 or masks[:3]!=(63488,2016,31):raise
                im=Image.frombytes('RGB',(r['width'],r['height']),raw[128:],'raw','BGR;16')
            im.save(args.output/r['filename'],format='WEBP',lossless=True,method=6)
            print(r['name'],r['filename'])
if __name__=='__main__':main()
