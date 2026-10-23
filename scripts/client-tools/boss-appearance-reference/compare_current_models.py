"""Compare named official updater model definitions to the November 2024 installer."""
import sys,json,copy,hashlib,re,struct
from pathlib import Path
base=Path('/workspace/scratch/520b87b7114a');p=base/'boss-appearance-reference';current=base/'official-maps/current-client/assets'
sys.path[:0]=[str(p),str(base/'official-maps'),str(base/'boss-render')]
from global_boss_models import read_chr,simple_name,norm,intcol
from client_assets import ClientAssets
import rose_formats
stb=json.loads((current/'3ddata/stb/list_npc.stb.json').read_text());stl=json.loads((current/'language/list_npc_s.stl.json').read_text());en={x['key']:x['texts'][0] for x in stl['languages'][1]}
chr=read_chr((current/'3ddata/npc/list_npc.chr').read_bytes());oldm=json.loads((p/'global-boss-model-manifest.json').read_text())['records']+json.loads((p/'global-extra-boss-models.json').read_text())
oldz=rose_formats.read_zsc(ClientAssets().read('3ddata/npc/part_npc.zsc'))
raw=(current/'3ddata/npc/part_npc.zsc').read_bytes();ends=[]
original_done=rose_formats.Reader.done
def capture_end(self):ends.append(self.pos)
rose_formats.Reader.done=capture_end
newz=rose_formats.read_zsc(raw)
rose_formats.Reader.done=original_done
tail=raw[ends[0]:];extensions=[];off=0
while off+8<=len(tail):
 tag=tail[off:off+4].decode('ascii',errors='replace');size=struct.unpack_from('<I',tail,off+4)[0]
 if off+8+size>len(tail):break
 data=tail[off+8:off+8+size];extensions.append({'tag':tag,'length':size,'first16Hex':data[:16].hex(),'sha256':hashlib.sha256(data).hexdigest()});off+=8+size
def canon_zsc(z,ids):
 result=[]
 for i in ids:
  obj=z['objects'][i];entry={'parts':[],'effects':[]}
  for part in obj['parts']:
   x={k:v for k,v in part.items() if k not in ['mesh_id','material_id']};x['mesh']=z['meshes'][part['mesh_id']];x['material']=z['materials'][part['material_id']];entry['parts'].append(x)
  for effect in obj['effects']:
   x={k:v for k,v in effect.items() if k!='effect_id'};x['effect']=z['effects'][effect['effect_id']];entry['effects'].append(x)
  result.append(entry)
 return json.loads(json.dumps(result))
records=[];comparisons=[]
for old in oldm:
 if not old.get('modelAvailable'):continue
 i=old['npcId'];row=stb['cells'][i];rec=copy.deepcopy(old);rec.update({'internalName':simple_name(row[0]),'localizedName':en.get(row[40],''),'stringKey':row[40],'stbDescription':row[0],'level':intcol(row,7),'monsterFilename':row[1],'scalePercent':intcol(row,4),'rightHandPartIndex':intcol(row,5),'leftHandPartIndex':intcol(row,6),'glow':row[39],'textureType':row[28],'sourceVersion':'Official Global updater release ci-38925666467-1; NPC table2026-10-13','live2026AppearanceVerified':False})
 rec.update(chr['npcs'].get(i,{}));rec['validation']='exact-name' if norm(old['name']) in {norm(rec['internalName']),norm(rec['localizedName'])} else 'name-mismatch';g=int(row[39] or 0);rec['glowRGB255']=[g//1000000,(g%1000000)//1000,g%1000]
 if 'nameCandidates' in rec:rec['nameCandidates']=[{'npcId':i,**{k:rec[k] for k in ['internalName','localizedName','stringKey','stbDescription','level']}}]
 diff={k:{'old':old.get(k),'current':rec.get(k)} for k in ['internalName','localizedName','level','scalePercent','rightHandPartIndex','leftHandPartIndex','glow','textureType','skeletonPath','meshObjectIndices','effects'] if old.get(k)!=rec.get(k)}
 oldidle=next((x['path'] for x in old['motionPaths'] if x['motionType']==0),None);newidle=next((x['path'] for x in rec['motionPaths'] if x['motionType']==0),None)
 if oldidle!=newidle:diff['idleMotion']={'old':oldidle,'current':newidle}
 a=canon_zsc(oldz,old['meshObjectIndices']);b=canon_zsc(newz,rec['meshObjectIndices'])
 if a!=b:diff['resolvedZsc']={'old':a,'current':b}
 comparisons.append({'catalogId':old['catalogId'],'npcId':i,'name':old['name'],'validation':rec['validation'],'differences':diff})
 records.append(rec)
allnames=[]
for i,row in enumerate(stb['cells']):
 if len(row)<=40:continue
 s=simple_name(row[0]);e=en.get(row[40],'')
 if re.search('super.*(ulverick|hornet)|balloon|kepris|zatana',s+' '+e,re.I):allnames.append({'npcId':i,'internalName':s,'localizedName':e,'stbDescription':row[0],'level':intcol(row,7),'hasChr':i in chr['npcs']})
source=json.loads((base/'official-maps/current-client/last-extraction.json').read_text())
result={'source':source['source'],'sourceFiles':source['records'],'mapping':'STB row index = NPC ID = CHR index; names use string key cell40 English STL1. Current update tables confirmed; individual mesh/texture bytes not yet compared.','zscExtensions':extensions,'zscUnparsedTrailingBytes':len(tail)-off,'records':records}
(p/'current-boss-model-manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
(p/'current-boss-table-comparison.json').write_text(json.dumps({'records':comparisons,'specialNameHits':allnames,'zscExtensions':extensions},ensure_ascii=False,indent=2)+'\n')
print('Compared',len(records),'models; differences',sum(bool(x['differences']) for x in comparisons));print('STB',stb['rows'],'CHR',chr['characterCount'],'ZSC extensions',extensions)
for r in comparisons:
 if r['differences']:print(json.dumps({**r,'differences':{k:v if k!='resolvedZsc' else 'Resolved geometry/material definition differs; see comparison JSON' for k,v in r['differences'].items()}},ensure_ascii=False))
print('SPECIAL NAME HITS');print(json.dumps(allnames,ensure_ascii=False,indent=2))
