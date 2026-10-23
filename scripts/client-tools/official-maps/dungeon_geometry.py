"""Inspect exact level files behind blank minimaps; no inferred spawn markers."""
from pathlib import Path
import argparse,json,struct
from client_assets import ClientAssets,Reader,read_stb,normalize,ROOT

def read_zon(raw):
    r=Reader(raw);count=r.num('I');blocks=[(r.num('I'),r.num('I')) for _ in range(count)]
    result={'blocks':blocks}
    for kind,offset in blocks:
        r.pos=offset
        if kind==0:
            result['info']={'type':r.num('I'),'width':r.num('I'),'height':r.num('I'),'gridPerPatch':r.num('I'),'gridSize':r.num('f'),'startX':r.num('I'),'startY':r.num('I')}
        elif kind==1:
            count=r.num('I');result['events']=[]
            for _ in range(count):result['events'].append({'position':[r.num('f') for _ in range(3)],'name':r.string('B')})
        elif kind==2:
            result['textures']=[r.string('B') for _ in range(r.num('I'))]
        elif kind==3:
            result['tiles']=[{'layer1':r.num('I'),'layer2':r.num('I'),'offset1':r.num('I'),'offset2':r.num('I'),'blend':r.num('I'),'rotation':r.num('I'),'reserved':r.num('I')} for _ in range(r.num('I'))]
    return result

def read_ifo_object(r):
    name=r.string('B');warp=r.num('H');event=r.num('H');kind=r.num('I');object_id=r.num('I')
    mini=[r.num('I'),r.num('I')];rotation=[r.num('f') for _ in range(4)];position=[r.num('f') for _ in range(3)];scale=[r.num('f') for _ in range(3)]
    return {'name':name,'warpId':warp,'eventId':event,'type':kind,'objectId':object_id,'minimap':mini,'rotation':rotation,'position':position,'scale':scale}

def read_ifo(raw):
    r=Reader(raw);count=r.num('I');blocks=[(r.num('I'),r.num('I')) for _ in range(count)];result={}
    for kind,offset in blocks:
        r.pos=offset
        if kind in [1,3,6,10,11]:result[str(kind)]=[read_ifo_object(r) for _ in range(r.num('I'))]
    return result

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--current',action='store_true');parser.add_argument('--zones',type=int,nargs='+',default=[91,143,169]);args=parser.parse_args()
    if args.current:
        from current_assets import CurrentClientAssets
        c=CurrentClientAssets(allow_network=True)
    else:c=ClientAssets()
    table=read_stb(c.read('3ddata/stb/list_zone.stb'));columns={name:i-1 for i,name in enumerate(table['columnNames']) if i>0};output=ROOT/('current-dungeon-analysis' if args.current else 'dungeon-analysis');output.mkdir(exist_ok=True)
    summary=[]
    for zone_id in args.zones:
        row=table['cells'][zone_id];path=normalize(row[1]);parent=str(Path(path).parent);zon=read_zon(c.read(path));tile_files=[];objects=[]
        for y in range(64):
            for x in range(64):
                for ext in ['him','til','ifo']:
                    candidate=f'{parent}/{x}_{y}.{ext}';rec=c.metadata(candidate)
                    if not rec:continue
                    tile_files.append({'x':x,'y':y,**rec})
                    if ext=='ifo':objects.append({'tile':[x,y],'path':candidate,'objects':read_ifo(c.read(candidate))})
        rec={'zoneId':zone_id,'sourceName':row[0],'zoneFile':c.metadata(path),'zon':zon,'tileFiles':tile_files,'objects':objects,'decoZsc':normalize(row[columns['Objects Table']]),'cnstZsc':normalize(row[columns['Building Table']])}
        (output/f'zone-{zone_id}-geometry.json').write_text(json.dumps(rec,ensure_ascii=False,indent=2))
        summary.append({'zoneId':zone_id,'name':row[0],'info':zon.get('info'),'eventCount':len(zon.get('events',[])),'textureCount':len(zon.get('textures',[])),'tileFiles':len(tile_files),'objectCounts':{k:sum(len(r['objects'].get(k,[])) for r in objects) for k in ['1','3','6','10','11']}})
    (output/'geometry-summary.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))

if __name__=='__main__':main()
