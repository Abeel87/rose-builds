// Rebuild zone-level annotations from attributed catalog locations.
// No zone-only report is converted to a point or an invented roaming radius.
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {SOURCES} from '../dist/content.js';
const read=name=>JSON.parse(readFileSync(`dist/data/${name}.json`,'utf8'));
const catalog=read('catalog'),world=read('world'),spawns=read('spawns');
const byId=new Map(catalog.monsters.map(m=>[m.id,m]));
const mapFor=zone=>world.maps.find(m=>[m.name,...(m.zones??[])].includes(zone));
const sourceId=id=>`area-${id}`;
const location=(id,zone,source)=>{
  const m=byId.get(id),map=mapFor(zone);assert.ok(m&&map,`${id}: ${zone}`);
  if(!m.locations.some(l=>l.zone===zone))m.locations.push({zone,planet:map.planet,source});
};
location('201','Gorge of Silence','worm-dragon-location');
byId.get('201').note='Orientacyjnie: Gorge of Silence. Źródło opisuje Worm Dragons w tej strefie, ale nie potwierdza osobno wariantu NPC 201. Oznaczenie obejmuje całą mapę.';
byId.get('201').noteSource='worm-dragon-location';
location('3583','Cave of Ulverick','patch-ocf-temple');
byId.get('3583').habitat='dungeon';
const wandering={
  '2305':'Golden Ring','wandering-scarab':'Golden Ring',
  '2309':'Fossil Sanctuary','wandering-snapper':'Fossil Sanctuary',
  'wandering-terrasaurus':'Fossil Sanctuary','wandering-devourer':'Wasteland Ruins Path'
};
for(const [id,zone] of Object.entries(wandering)){
  const m=byId.get(id);
  m.locations=[{zone,planet:'Orlo',source:'wandering-zones'}];
  m.note='Znana strefa z relacji graczy. Od 25.08.2026 Wandering pojawia się w losowych miejscach — przeszukaj całą mapę. Dawne stałe punkty nie są aktualne; przydział strefy wymaga potwierdzenia po zmianie.';
  m.noteSource='wandering-zones';
}
const hornet=byId.get('super-hornet');
hornet.locations=['Valley of Luxem Tower','Breezy Hills','El Verloon Desert','Forest of Wisdom','Gorge of Silence','Sunshine Coast (Event)'].map(zone=>({zone,planet:'Junon',source:'super-hornet-areas'}));
hornet.note='Wydarzenie Super Boss. Lokalizacje uwzględniają zmiany ze stycznia i czerwca 2026; Anima Lake usunięto z listy. Bossa i odliczanie sprawdź w grze.';
hornet.noteSource='super-hornet-areas';
spawns.areas=[];
for(const m of catalog.monsters.filter(m=>m.kind!=='monster'))for(const loc of m.locations){
  const map=mapFor(loc.zone);assert.ok(map,`${m.name}: ${loc.zone}`);
  const allViews=map.variants??[map];
  const exactAlias=allViews.filter(v=>(v.zones??[]).includes(loc.zone));
  const views=exactAlias.length?exactAlias:allViews;
  if(views.some(v=>spawns.records.some(p=>p.monsterId===m.id&&v.clientZoneIds.includes(p.clientZoneId)&&p.imageSha256===v.sha256)))continue;
  const src=SOURCES[loc.source];assert.ok(src,loc.source);
  const sid=sourceId(loc.source);
  spawns.sources[sid]={label:src.title,type:src.type==='official'?'official':src.type==='client'?'client':'community',date:src.date,url:src.url,...(src.urls?{urls:src.urls}:{}),note:src.note};
  for(const view of views){
    const zid=view.clientZoneIds[0],id=`area-${zid}-${m.id}`;
    if(spawns.areas.some(a=>a.id===id))continue;
    const note=m.id==='201'?m.note:m.kind==='wandering'?'Pojawia się w losowych miejscach. Przeszukaj całą tę mapę; przydział strefy pochodzi ze starszych relacji graczy i wymaga potwierdzenia po zmianie z sierpnia 2026.':m.habitat==='dungeon'?'Boss tej instancji. Oznaczenie obejmuje dungeon; konkretna sala nie jest potwierdzona w tym źródle.':m.id==='dolphin-balloon'?'Szukaj balonów na całej wyspie. Po zniszczeniu mogą pojawiać się w innym miejscu.':m.kind==='event'?'Obszar wydarzenia. Szukaj w tej strefie po uruchomieniu wydarzenia; nie jest to stały punkt ani podgląd obecności bossa.':'Znana strefa występowania. Oznaczony obszar obejmuje całą mapę; dokładne miejsce wymaga sprawdzenia w grze.';
    spawns.areas.push({id,monsterId:m.id,clientZoneId:zid,imageSha256:view.sha256,layer:'terrain',sourceId:sid,precision:'zone',label:`${map.name}${map.variants?` · ${view.label}`:''}`,note});
  }
}
spawns.areas.sort((a,b)=>a.clientZoneId-b.clientZoneId||a.monsterId.localeCompare(b.monsterId));
writeFileSync('dist/data/catalog.json',JSON.stringify(catalog)+'\n');
writeFileSync('dist/data/spawns.json',JSON.stringify(spawns,null,2)+'\n');
console.log(JSON.stringify({points:spawns.records.length,areas:spawns.areas.length,areaBosses:new Set(spawns.areas.map(a=>a.monsterId)).size,bosses:catalog.monsters.filter(m=>m.kind!=='monster').length}));
