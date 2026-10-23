"""Map catalog bosses to the pinned official Global installer tables without substituting private-server assets."""
import sys,json,re,hashlib
from pathlib import Path
sys.path.insert(0,'/workspace/scratch/520b87b7114a/official-maps')
from client_assets import ClientAssets,Reader,read_stb,read_stl,normalize
ROOT=Path('/workspace/scratch/520b87b7114a/boss-appearance-reference')

def cstring(r):
 end=r.data.index(0,r.pos);data=r.take(end-r.pos+1)[:-1]
 try:return data.decode('utf-8')
 except UnicodeDecodeError:return data.decode('cp949',errors='replace')

def read_chr(data):
 r=Reader(data)
 skeletons=[cstring(r) for _ in range(r.num('H'))]
 motions=[cstring(r) for _ in range(r.num('H'))]
 effects=[cstring(r) for _ in range(r.num('H'))]
 count=r.num('H');npcs={}
 for npc_id in range(count):
  if r.num('B')==0:continue
  skeleton=r.num('H');name=cstring(r)
  models=[r.num('H') for _ in range(r.num('H'))]
  motion_refs=[(r.num('H'),r.num('H')) for _ in range(r.num('H'))]
  effect_refs=[(r.num('H'),r.num('H')) for _ in range(r.num('H'))]
  npcs[npc_id]={'chrIndex':npc_id,'chrName':name,'skeletonIndex':skeleton,'skeletonPath':normalize(skeletons[skeleton]) if skeleton<len(skeletons) else None,'meshObjectIndices':models,'motionPaths':[{'motionType':m,'motionIndex':i,'path':normalize(motions[i]) if i<len(motions) and m!=65535 else None} for m,i in motion_refs],'effects':[{'dummyIndex':m,'effectIndex':i,'path':normalize(effects[i]) if i<len(effects) and m!=65535 else None} for m,i in effect_refs]}
 if r.pos!=len(data):raise ValueError(f'CHR trailing bytes {len(data)-r.pos}')
 return {'characterCount':count,'skeletonPaths':skeletons,'motionFiles':motions,'effectFiles':effects,'npcs':npcs}

def simple_name(s):
 s=re.sub(r'^\(\d+\)\s*','',s)
 s=re.sub(r'\s*\([^)]*\)(?:\s*\[[^]]*\])?\s*$','',s)
 return s.strip()
def norm(s):return re.sub('[^a-z0-9]','',s.lower())
def intcol(row,n):return int(row[n]) if row[n].lstrip('-').isdigit() else None

def main():
 client=ClientAssets()
 paths=['3ddata/stb/list_npc.stb','3ddata/npc/list_npc.chr','language/list_npc_s.stl']
 blobs={p:client.read(p) for p in paths}
 stb=read_stb(blobs[paths[0]]);chr=read_chr(blobs[paths[1]]);stl=read_stl(blobs[paths[2]])
 en={x['key']:x['texts'][0] for x in stl['languages'][1]}
 allnames=[]
 for idx,row in enumerate(stb['cells']):
  internal=simple_name(row[0]);localized=en.get(row[40],'')
  allnames.append({'npcId':idx,'internalName':internal,'localizedName':localized,'stringKey':row[40],'stbDescription':row[0],'level':intcol(row,7)})
 inventory=json.loads((ROOT/'catalog-boss-inventory.json').read_text())
 records=[]
 for m in inventory:
  rec={'catalogId':m['id'],'name':m['name'],'kind':m['kind'],'catalogLevel':m['level'],'live2026AppearanceVerified':False,'sourceVersion':'Global public installer, table date November 2024'}
  if m['id'].isdigit():
   npc_id=int(m['id']);candidates=[allnames[npc_id]] if npc_id<len(allnames) else []
  else:
   candidates=[n for n in allnames if norm(m['name']) in {norm(n['internalName']),norm(n['localizedName'])}]
   npc_id=candidates[0]['npcId'] if len(candidates)==1 else None
  rec['nameCandidates']=candidates
  if npc_id is not None:
   row=stb['cells'][npc_id];rec.update(allnames[npc_id]);rec['name']=m['name']
   rec['validation']='exact-name' if norm(m['name']) in {norm(rec['internalName']),norm(rec['localizedName'])} else 'name-mismatch'
   rec.update({'modelIndex':npc_id,'monsterFilename':row[1],'scalePercent':intcol(row,4),'rightHandPartIndex':intcol(row,5),'leftHandPartIndex':intcol(row,6),'glow':row[39],'textureType':row[28]})
   if npc_id in chr['npcs']:rec.update(chr['npcs'][npc_id]);rec['modelAvailable']=True
   else:rec['modelAvailable']=False
  else:
   rec['validation']='ambiguous-exact-name' if len(candidates)>1 else 'not-found-by-exact-name'
   rec['modelAvailable']=False
  records.append(rec)
 manifest={'sourceFiles':[{**client.metadata(p),'decodedSha256':hashlib.sha256(blobs[p]).hexdigest()} for p in paths],'languageIndex':1,'mapping':'STB row index = NPC ID = CHR index; localized name uses STB cell 40 string key, not numeric NPC ID. ZSC object indices are the CHR model list.','records':records}
 (ROOT/'global-boss-model-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'global-chr.json').write_text(json.dumps(chr,ensure_ascii=False,indent=2)+'\n')
 (ROOT/'global-npc-name-index.json').write_text(json.dumps(allnames,ensure_ascii=False,indent=2)+'\n')
 print('STB rows',stb['rows'],'CHR characters',chr['characterCount'],'active CHR',len(chr['npcs']))
 from collections import Counter
 print('Validation',dict(Counter(x['validation'] for x in records)),'models',sum(x['modelAvailable'] for x in records))
 for x in records:
  if x['validation']!='exact-name' or not x['catalogId'].isdigit():print(json.dumps(x,ensure_ascii=False))
 print('OTHER SPECIAL NAME HITS')
 for n in allnames:
  if re.search(r'Wandering|Super |Balloon|Kepris',n['internalName']+' '+n['localizedName'],re.I):print(json.dumps(n,ensure_ascii=False))
if __name__=='__main__':main()

