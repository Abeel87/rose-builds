import { SOURCES, PLANETS } from './content.js';
import { escapeHTML as e } from './core.js';
export const paths = {
  search:'m21 21-4.5-4.5 M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0', home:'m3 10 9-7 9 7 M5 9v12h5v-7h4v7h5V9',
  crown:'m3 6 4 5 5-7 5 7 4-5-2 13H5L3 6Z M6 22h12', diamond:'m12 2 9 8-9 12L3 10l9-8Z M3 10h18 M8 4l-1 6 5 12 5-12-1-6',
  sword:'m14 3 7 0 0 7-12 12-3-3L18 7 M5 14l5 5 M3 21l4-4', book:'M3 4h6a4 4 0 0 1 3 2 4 4 0 0 1 3-2h6v16h-6a4 4 0 0 0-3 2 4 4 0 0 0-3-2H3V4Z M12 6v16',
  bookmark:'M6 3h12v19l-6-4-6 4V3Z', pin:'M19 9c0 6-7 12-7 12S5 15 5 9a7 7 0 0 1 14 0Z M15 9a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  arrow:'M4 12h16 m-6-6 6 6-6 6', back:'M20 12H4 m6-6-6 6 6 6', plus:'M12 4v16 M4 12h16', check:'m4 12 5 5L20 6', close:'m6 6 12 12 M18 6 6 18', menu:'M4 6h16 M4 12h16 M4 18h16',
  external:'M14 3h7v7 M21 3 10 14 M10 4H4v16h16v-6', clock:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 6v6l4 2', shield:'m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6l9-4Z',
  leaf:'M21 3C8 1 1 9 5 17s18 2 16-14Z M4 21 17 7', moon:'M20 15a9 9 0 1 1-11-12 8 8 0 0 0 11 12Z', sun:'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0 M12 1v3 M12 20v3 M1 12h3 M20 12h3 m-4-9-2 2 M5 19l2-2 M3 3l3 3 M18 18l3 3',
  eye:'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0', download:'M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5', upload:'M12 16V4 m-5 5 5-5 5 5 M4 16v5h16v-5',
  share:'M18 7a3 3 0 1 1 0-6 3 3 0 0 1 0 6 M6 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6 M18 23a3 3 0 1 1 0-6 3 3 0 0 1 0 6 M8.5 10.5 15.5 5.5 M8.5 13.5 15.5 18.5',
  trash:'M3 6h18 M9 6V3h6v3 M5 6l1 16h12l1-16 M9 10v8 M15 10v8', copy:'M9 9h12v12H9V9Z M15 9V3H3v12h6', bag:'M5 7h14l2 15H3L5 7Z M8 8V5a4 4 0 0 1 8 0v3',
  info:'M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0 M12 11v6 M12 7v1', spark:'m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z',
};
export const icon=(name,cls='')=>`<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]??paths.spark}"/></svg>`;
const typeIcon=type=>({weapon:'sword',gem:'diamond',material:'diamond',body:'shield',shield:'shield',mount:'leaf',cart:'sun',consumable:'bag'})[type]??'bag';
export const itemSymbol=item=>`<span class="item-symbol type-${e(item.type)}">${icon(typeIcon(item.type))}</span>`;
export const isOfficial=key=>SOURCES[key]?.type==='official';
export const sourceLink=(key,short=true)=>{
  const s=SOURCES[key];return s?`<a class="source-link ${s.type}" href="#/help/${e(key)}" title="Informacje na tej stronie: ${e(s.title)} · ${s.date}">${icon(s.type==='official'?'check':'book')}${short?(s.type==='official'?'Potwierdzone w patchu':'Dane społeczności'):e(s.title)}${icon('info')}</a>`:'';
};
export const tag=(text,cls='')=>`<span class="tag ${cls}">${e(text)}</span>`;
export const empty=(title,description,action='')=>`<div class="empty-state">${icon('search')}<h3>${e(title)}</h3><p>${e(description)}</p>${action}</div>`;
export const planetOptions=(selected,allLabel='Wszystkie planety')=>`<option value="">${allLabel}</option>${PLANETS.map(p=>`<option ${p.name===selected?'selected':''}>${p.name}</option>`).join('')}`;
export const pageHead=(kicker,title,subtitle,actions='')=>`<div class="page-heading"><div><span class="eyebrow">${e(kicker)}</span><h1 tabindex="-1" id="page-title">${e(title)}</h1><p>${e(subtitle)}</p></div>${actions?`<div class="heading-actions">${actions}</div>`:''}</div>`;
export const slotFor=type=>({weapon:'Weapon',body:'Body',head:'Head',arms:'Gloves',feet:'Shoes',back:'Back',face:'Face',accessory:'Jewelry',shield:'Offhand'})[type];
