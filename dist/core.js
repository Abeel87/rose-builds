import { JOBS, STATS, SLOTS, TEMPLATES } from './content.js';

export const STORAGE_KEY = 'rose-companion-v2';
export const LEGACY_KEY = 'rose-build-planner-saves-v1';
const MAX_IMPORT = 2_000_000;
export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const normalizeText = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g,'l').replace(/Ł/g,'L').toLowerCase().trim();
export const makeId = () => globalThis.crypto?.randomUUID?.() ?? `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
const plain = v => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v, n=200) => typeof v === 'string' ? v.slice(0,n) : '';
const integer = (v,min,max,fallback) => Number.isInteger(v) && v>=min && v<=max ? v : fallback;

export function createBuild(job='Bourgeois', templateId) {
  const template = TEMPLATES.find(t=>t.id===templateId&&t.job===job) ?? TEMPLATES.find(t=>t.job===job) ?? TEMPLATES[12];
  return { id:makeId(), name:`Mój ${template.job}`, job:template.job, archetype:template.id,
    role:template.role, level:250, statMode:'target', stats:Object.fromEntries(STATS.map(s=>[s,0])),
    skills:[], gear:Object.fromEntries(Object.keys(SLOTS).map(s=>[s,''])), notes:'',
    createdAt:new Date().toISOString(), updatedAt:new Date().toISOString() };
}

export function normalizeBuild(input, { legacy=false }={}) {
  if (!plain(input) || !JOBS.includes(input.job)) throw new Error('Niepoprawna klasa w pliku buildu.');
  if (!Number.isInteger(input.level) || input.level<1 || input.level>250) throw new Error('Poziom buildu musi być liczbą 1–250.');
  const out = createBuild(input.job, input.archetype ?? input.build);
  out.id = text(input.id,100) || out.id;
  out.name = text(input.name,80).trim() || `Mój ${input.job}`;
  out.level = input.level;
  out.role = text(input.role,60) || out.role;
  out.statMode = legacy || input.statMode === 'allocation' ? 'allocation' : 'target';
  for (const key of STATS) {
    const value = plain(input.stats) ? input.stats[key] ?? 0 : 0;
    if (!Number.isInteger(value) || value<0 || value>9999) throw new Error(`Niepoprawna wartość ${key}.`);
    out.stats[key] = value;
  }
  for (const key of Object.keys(SLOTS)) out.gear[key] = text(plain(input.gear) ? input.gear[key] : '',200);
  out.notes = text(input.notes,5000);
  if (input.skills !== undefined && !Array.isArray(input.skills)) throw new Error('Niepoprawna lista umiejętności.');
  if (input.skills?.length>80) throw new Error('Build może zawierać najwyżej 80 umiejętności.');
  out.skills = (input.skills ?? []).map(s=>{
    if (!plain(s) || !text(s.name).trim() || !Number.isInteger(s.rank) || s.rank<0 || s.rank>100) throw new Error('Niepoprawna umiejętność lub ranga.');
    return { id:text(s.id,100)||makeId(), name:text(s.name,100), rank:s.rank, note:text(s.note,300), ...(text(s.catalogId,100)?{catalogId:text(s.catalogId,100)}:{}) };
  });
  if (legacy && plain(input.ranks)) {
    out.skills = Object.entries(input.ranks).filter(([,rank])=>Number.isInteger(rank)&&rank>0).slice(0,80)
      .map(([name,rank])=>({id:makeId(), name:text(name,100), rank:Math.min(rank,100), note:'Ranga z poprzedniej wersji planera.'}));
  }
  for (const key of ['createdAt','updatedAt']) {
    if (typeof input[key]==='string' && Number.isFinite(Date.parse(input[key]))) out[key]=new Date(input[key]).toISOString();
  }
  return out;
}

export function validateBuild(build) {
  const errors=[];
  try { normalizeBuild(build); } catch(error) { errors.push(error.message); }
  if (!build?.name?.trim()) errors.push('Nadaj buildowi nazwę.');
  return errors;
}

export function draftNeedsSave(draft, builds) {
  if(!draft) return false;
  const saved=builds.find(b=>b.id===draft.id);
  return !saved || JSON.stringify(saved)!==JSON.stringify(draft);
}

export function emptyLibrary() { return { version:2, builds:[], targets:[], draft:null, migratedLegacy:false }; }
export function normalizeLibrary(input) {
  if (!plain(input) || input.version!==2 || !Array.isArray(input.builds) || !Array.isArray(input.targets)) throw new Error('Nieobsługiwany format kopii ROSE Companion.');
  if (input.builds.length>300 || input.targets.length>1000) throw new Error('Kopia zawiera zbyt wiele zapisów.');
  const builds=input.builds.map(b=>normalizeBuild(b));
  if(new Set(builds.map(b=>b.id)).size!==builds.length) throw new Error('Powtarzające się identyfikatory buildów w kopii.');
  const targets=input.targets.map(t=>{
    if(!plain(t)||!['item','monster'].includes(t.kind)||!text(t.id,100)) throw new Error('Niepoprawny cel farmienia.');
    return {kind:t.kind,id:text(t.id,100),done:t.done===true,notes:text(t.notes,1000),
      killedAt:typeof t.killedAt==='number' && Number.isFinite(t.killedAt) && t.killedAt>0 ? t.killedAt:null};
  });
  return { version:2, builds, targets:[...new Map(targets.map(t=>[`${t.kind}:${t.id}`,t])).values()],
    draft:input.draft ? normalizeBuild(input.draft) : null, migratedLegacy:input.migratedLegacy===true };
}

export function loadLibrary(storage) {
  let raw;
  try {
    raw=storage.getItem(STORAGE_KEY);
    if(raw) return {library:normalizeLibrary(JSON.parse(raw)),error:null};
    const legacyRaw=storage.getItem(LEGACY_KEY);
    const library=emptyLibrary();
    if(legacyRaw) {
      const old=JSON.parse(legacyRaw);
      if(!Array.isArray(old)||old.length>300) throw new Error('Niepoprawna lista zapisów poprzedniej wersji.');
      // Transactional migration: any invalid row prevents overwriting either store.
      library.builds=old.map((b,i)=>({...normalizeBuild(b,{legacy:true}),id:`legacy-${i}`}));
      library.migratedLegacy=true;
      storage.setItem(STORAGE_KEY,JSON.stringify(library));
    }
    return {library,error:null};
  } catch(error) {
    return {library:emptyLibrary(),error:`Nie można odczytać lub zachować zapisów: ${error.message}`};
  }
}

export function saveLibrary(storage, library) {
  const normalized=normalizeLibrary(library);
  storage.setItem(STORAGE_KEY,JSON.stringify(normalized));
  return normalized;
}

export function parseImport(raw) {
  if(typeof raw!=='string'||raw.length>MAX_IMPORT) throw new Error('Plik jest zbyt duży (maks. 2 MB).');
  let input;
  try { input=JSON.parse(raw); } catch { throw new Error('To nie jest poprawny plik JSON.'); }
  if(Array.isArray(input)) return {...emptyLibrary(),builds:input.map(b=>normalizeBuild(b,{legacy:true}))};
  if(input?.format==='rose-build' && input.build) return {...emptyLibrary(),builds:[normalizeBuild(input.build)]};
  if(input?.job) return {...emptyLibrary(),builds:[normalizeBuild(input,{legacy:!!input.build})]};
  return normalizeLibrary(input);
}

export function mergeLibraries(current, incoming) {
  const result=structuredClone(current);
  const ids=new Set(result.builds.map(b=>b.id));
  for(const build of incoming.builds) {
    const previous=result.builds.find(b=>b.id===build.id);
    if(previous && JSON.stringify(previous)===JSON.stringify(build)) continue;
    const copy=structuredClone(build);
    if(ids.has(copy.id)) { copy.id=makeId();copy.name=`${copy.name.slice(0,65)} (import)`; }
    ids.add(copy.id);result.builds.push(copy);
  }
  // Import never replaces an existing target or clears current progress/draft.
  const keys=new Set(result.targets.map(t=>`${t.kind}:${t.id}`));
  for(const target of incoming.targets) if(!keys.has(`${target.kind}:${target.id}`)) {
    result.targets.push(structuredClone(target));keys.add(`${target.kind}:${target.id}`);
  }
  return normalizeLibrary(result);
}

export function encodeBuild(build) {
  const b=normalizeBuild(build);
  // Shared links carry the configuration only, with no local library or timestamps.
  const {id,createdAt,updatedAt,...config}=b;
  const bytes=new TextEncoder().encode(JSON.stringify(config));
  if(bytes.length>12000) throw new Error('Build jest za duży do linku. Użyj eksportu JSON.');
  return btoa(Array.from(bytes,c=>String.fromCharCode(c)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function decodeBuild(encoded) {
  if(typeof encoded!=='string'||encoded.length>20000||!/^[A-Za-z0-9_\-+/=]+$/.test(encoded)) throw new Error('Niepoprawny link buildu.');
  try {
    const raw=atob(encoded.replace(/-/g,'+').replace(/_/g,'/'));
    const input=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(raw,c=>c.charCodeAt(0))));
    return {...normalizeBuild(input,{legacy:!!input.build}),id:makeId()};
  } catch { throw new Error('Nie można odczytać buildu z linku. Zapisane buildy są bez zmian.'); }
}

export function dropPenalty(playerLevel,monsterLevel) {
  if(!Number.isInteger(playerLevel)||!Number.isInteger(monsterLevel)||playerLevel<1||monsterLevel<1) return null;
  const difference=playerLevel-monsterLevel;
  return difference<=3?0:difference<=8?10:difference<=14?25:difference<=21?50:75;
}

export function timerState(killedAt, respawn, now=Date.now()) {
  if(!killedAt||!respawn||respawn.length!==2) return null;
  const earliest=killedAt+respawn[0]*60000, latest=killedAt+respawn[1]*60000;
  if(now<earliest) return {phase:'waiting',minutes:Math.ceil((earliest-now)/60000)};
  if(now<latest) return {phase:'window',minutes:Math.ceil((latest-now)/60000)};
  return {phase:'elapsed',minutes:Math.floor((now-latest)/60000)};
}

export function indexCatalog(data) {
  const items=new Map(data.items.map(i=>[String(i.id),i]));
  const monsters=new Map(data.monsters.map(m=>[String(m.id),m]));
  const droppedBy=new Map();
  for(const monster of data.monsters) for(const id of monster.drops) {
    if(!items.has(id)) throw new Error(`Nieznany przedmiot ${id} w tabeli ${monster.id}.`);
    if(!droppedBy.has(id)) droppedBy.set(id,[]);
    droppedBy.get(id).push(monster);
  }
  const zones=new Map();
  for(const monster of data.monsters) for(const l of monster.locations) {
    const key=`${l.planet}|${l.zone}`;
    if(!zones.has(key)) zones.set(key,{...l,monsters:[]});
    zones.get(key).monsters.push(monster);
  }
  return {items,monsters,droppedBy,zones};
}

export function filterMonsters(monsters, {query='',planet='',kind='',knownLocation=false}={}) {
  const words=normalizeText(query).split(/\s+/).filter(Boolean);
  return monsters.filter(m=>{
    const hay=normalizeText(`${m.name} ${m.rank} ${m.planet??''} ${m.locations.map(l=>`${l.planet} ${l.zone}`).join(' ')}`);
    return words.every(w=>hay.includes(w)) && (!planet||m.planet===planet||m.locations.some(l=>l.planet===planet))
      && (!kind||(kind==='kings'?['king','wandering','event'].includes(m.kind):m.kind===kind)) && (!knownLocation||m.locations.length>0);
  });
}

export function filterItems(items, index, {query='',type='',planet='',onlyDrops=true,officialOnly=false}={}, zoneDrops=[]) {
  const words=normalizeText(query).split(/\s+/).filter(Boolean);
  return items.filter(item=>{
    const mobs=index.droppedBy.get(item.id)??[];
    const mapDrops=zoneDrops.filter(z=>z.items.includes(item.id));
    if(type&&item.type!==type || onlyDrops&&!mobs.length&&!mapDrops.length) return false;
    const eligibleMobs=mobs.filter(m=>(!officialOnly||m.officialDrops[item.id])&&(!planet||m.planet===planet||m.locations.some(l=>l.planet===planet)));
    const eligibleMaps=mapDrops.filter(z=>!planet||z.planet===planet||z.planet==='Wszystkie');
    if((officialOnly||planet)&&!eligibleMobs.length&&!eligibleMaps.length) return false;
    const hay=normalizeText(`${item.name} ${mobs.map(m=>`${m.name} ${m.locations.map(l=>l.zone).join(' ')}`).join(' ')} ${mapDrops.map(z=>z.zone).join(' ')}`);
    return words.every(w=>hay.includes(w));
  });
}
