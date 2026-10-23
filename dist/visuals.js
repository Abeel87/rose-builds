import { escapeHTML as e, normalizeText } from './core.js';

let media={items:{},classes:{},sheets:[],effigies:{},cols:24}, monsters={},maps=[],skills=[];
const mapsByZone=new Map();
export function setVisuals(data,world={}) {
  media=data;monsters=world.monsters??{};maps=world.maps??[];skills=world.skills??[];
  mapsByZone.clear();
  for(const map of maps)for(const alias of [map.name,...(map.zones??[])]) {
    const name=normalizeText(alias);
    // Preserve the first match when maps share a normalized name or alias.
    if(name&&!mapsByZone.has(name))mapsByZone.set(name,map);
  }
}
export const visualData=()=>({media,monsters,maps,skills});
export function sprite(ref,label='',extra='') {
  if(!Array.isArray(ref)||!media.sheets[ref[0]])return `<span class="game-icon missing-icon ${extra}" aria-label="Brak ikony${label?': '+e(label):''}">?</span>`;
  return `<span class="game-icon ${extra}" role="img" aria-label="${e(label)}" style="--sheet:url('./${e(media.sheets[ref[0]])}');--sx:${ref[1]};--sy:${ref[2]};--cols:${media.cols}"></span>`;
}
export const itemImage=(item,extra='')=>sprite(media.items[item?.id],item?.name??'Przedmiot',extra);
export function classImage(job,extra='') {return media.classes[job]?`<img class="class-art ${extra}" src="./${e(media.classes[job])}" alt="${e(job)}" width="160" height="160" loading="lazy">`:'';}
export function monsterImage(monster,extra='',appearance=null) {
  const entry=appearance??monsters[monster?.id];
  if(entry?.image)return `<img class="monster-art ${entry.origin==='official-screenshot'?'screenshot-art':''} ${extra}" src="./${e(entry.image)}" alt="Wygląd ${e(monster.name)} w grze" width="${entry.width??640}" height="${entry.height??640}" loading="lazy">`;
  return `<span class="monster-portrait unknown-portrait ${extra}" aria-label="Brak grafiki ${e(monster?.name)}"><span>?</span><small>Brak obrazu</small></span>`;
}
export function matchingSkill(name,job,catalogId) {const n=normalizeText(name);return catalogId?skills.find(s=>s.id===catalogId):skills.find(s=>normalizeText(s.name)===n&&(!job||s.jobs?.includes(job)||s.job===job));}
export function skillImage(skill,extra='') {return skill?.sprite?sprite(skill.sprite,skill.name,`skill-sprite ${extra}`):skill?.image?`<img class="skill-icon ${extra}" src="${skill.image.startsWith('https://')?'':'./'}${e(skill.image)}" alt="${e(skill.name)}" width="40" height="40" loading="lazy" referrerpolicy="no-referrer">`:`<span class="skill-icon missing-icon ${extra}" aria-label="Własna umiejętność">✦</span>`;}
export function mapForZone(zone) {
  return mapsByZone.get(normalizeText(zone));
}
export const canonicalZone=zone=>mapForZone(zone)?.name??zone;
export function mapVariant(map,id='',zone='') {return map?.variants?.find(v=>v.id===id)??map?.variants?.find(v=>v.zones?.some(z=>normalizeText(z)===normalizeText(zone)))??map?.variants?.[0]??map;}
export function zoneMatches(location,zone) {return canonicalZone(location)===canonicalZone(zone);}
