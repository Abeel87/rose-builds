import { VERSION, CHECKED, CLASSES, JOBS, STATS, STAT_LABELS, SLOTS, TYPES, KINDS, PLANETS, SOURCES, TEMPLATES, SKILL_FACTS, GUIDES } from './content.js';
import { STORAGE_KEY, LEGACY_KEY, escapeHTML as e, normalizeText, makeId, createBuild, normalizeBuild, validateBuild, draftNeedsSave, loadLibrary, saveLibrary, parseImport, mergeLibraries, encodeBuild, decodeBuild, dropPenalty, timerState, indexCatalog, filterItems, filterMonsters } from './core.js';
import { icon, isOfficial, sourceLink, tag, empty, planetOptions, pageHead, slotFor } from './ui.js';

import { setVisuals, visualData, itemImage as itemSymbol, classImage, monsterImage, skillImage, matchingSkill, mapForZone, canonicalZone, mapVariant, zoneMatches } from './visuals.js';
import { ARTICLES } from './help.js';
import { readRoute, routeHash, mapRoute, selectedZone } from './navigation.js';
import { markersForMap, mapMarkerGroups, withClientSpawnLocations } from './map-markers.js';

const $ = selector => document.querySelector(selector);
const number = n => new Intl.NumberFormat('pl-PL').format(n);
const date = value => new Date(value).toLocaleDateString('pl-PL');
const PAGE_SIZE=24;
let data,index,library,draft,storageError=null,dirty=false,storage;
let spawns={version:1,sources:{},records:[]};
let state={view:'home',id:null,q:'',planet:'',kind:'kings',type:'',onlyDrops:true,officialOnly:false,knownLocation:false,page:1,detailQ:'',buildTab:'stats',savedQuery:'',journalFilter:'all'};
let toastTimer,queryTimer,autoSaveTimer,pendingAction;
let pickerSlot='Weapon',pickerQuery='',skillQuery='',skillCategory='',mapZoom=1;
let currentRoute='',currentEntry=null;
const routeMemory=new Map(),lastRoutes=new Map();
history.scrollRestoration='manual';

function toast(message,error=false) {
  const el=$('#toast');el.textContent=message;el.className=`toast visible ${error?'error':''}`;
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),6000);
}
function persist(next, success) {
  if(storageError) { toast('Zapisy są chronione po błędzie odczytu. Pobierz kopię ratunkową w Moich buildach.',true);return false; }
  try { library=saveLibrary(storage,next);if(success)toast(success);return true; }
  catch {toast('Nie udało się zapisać: pamięć przeglądarki jest niedostępna lub pełna. Wyeksportuj build do pliku.',true);return false;}
}
function scheduleDraft() {
  dirty=true;$('#draft-status')?.replaceChildren(document.createTextNode('Niezapisane zmiany'));
  clearTimeout(autoSaveTimer);
  autoSaveTimer=setTimeout(()=>{
    if(!validateBuild(draft).length && persist({...library,draft:structuredClone(draft)})) {
      $('#draft-status')?.replaceChildren(document.createTextNode('Szkic zachowany na urządzeniu'));
    }
  },400);
}
function flushDraft() {
  clearTimeout(autoSaveTimer);
  if(!dirty||!draft||!library||storageError||validateBuild(draft).length)return;
  try {library=saveLibrary(storage,{...library,draft:structuredClone(draft)});} catch {}
}
function target(kind,id) { return library.targets.find(t=>t.kind===kind&&t.id===id); }
function pinButton(kind,id,large=false) {
  const pinned=!!target(kind,id);
  return `<button class="${large?'btn secondary':'icon-button'} ${pinned?'pinned':''}" data-action="pin" data-kind="${kind}" data-id="${e(id)}" aria-pressed="${pinned}" aria-label="${pinned?'Usuń z':'Dodaj do'} celów farmienia">${icon('bookmark')}${large?(pinned?'Na liście farmienia':'Dodaj do farmienia'):''}</button>`;
}
function pagination(total) {
  const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));state.page=Math.min(state.page,pages);
  return total>PAGE_SIZE?`<div class="pagination"><span>${number((state.page-1)*PAGE_SIZE+1)}–${number(Math.min(total,state.page*PAGE_SIZE))} z ${number(total)}</span><div><button class="btn small" data-action="page" data-page="${state.page-1}" ${state.page===1?'disabled':''}>${icon('back')}Wstecz</button><span class="page-number">${state.page} / ${pages}</span><button class="btn small" data-action="page" data-page="${state.page+1}" ${state.page===pages?'disabled':''}>Dalej${icon('arrow')}</button></div></div>`:'';
}
function slice(rows){state.page=Math.min(state.page,Math.max(1,Math.ceil(rows.length/PAGE_SIZE)));return rows.slice((state.page-1)*PAGE_SIZE,state.page*PAGE_SIZE);}

function shell(content) {
  const links=[['home','home','Twoja przygoda'],['drops','bag','Plecak i dropy'],['atlas','crown','Kingi i potwory'],['map','pin','Mapy świata'],['build','sword','Moja postać'],['saved','book','Moje buildy'],['journal','bookmark','Plan farmienia'],['guide','book','Poradnik gracza']];
  const active=state.view==='item'?'drops':state.view==='monster'?'atlas':state.view==='help'?'guide':state.view;
  return `<button class="sidebar-backdrop" aria-label="Zamknij menu" data-action="menu"></button>
  <aside class="sidebar"><a href="#/home" class="brand" aria-label="ROSE Companion — strona główna"><span class="brand-mark">${icon('spark')}</span><span><strong>ROSE</strong><small>COMPANION</small></span></a>
    <div class="sidebar-label">TWÓJ ŚWIAT. TWOJA PRZYGODA.</div><nav aria-label="Menu główne">${links.map(([route,symbol,label])=>`<a href="${e(lastRoutes.get(route)??`#/${route}`)}" class="nav-link ${active===route?'active':''}" ${active===route?'aria-current="page"':''}>${icon(symbol)}<span>${label}</span>${route==='saved'?`<span class="nav-count">${library.builds.length}</span>`:route==='journal'&&library.targets.length?`<span class="nav-count">${library.targets.filter(t=>!t.done).length}</span>`:''}</a>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="world-status"><i></i> ROSE ONLINE GLOBAL</div><p>Fanowski niezbędnik gracza.<br>Przygoda zaczyna się tutaj.</p><a href="#/help/community-art">O grafikach i danych ${icon('info')}</a><div class="version">v${VERSION} · dane ${date(CHECKED)}</div></div>
  </aside><div class="workspace"><header class="topbar"><button class="icon-button mobile-menu" data-action="menu" aria-label="Otwórz menu">${icon('menu')}</button><div class="breadcrumbs">Niezbędnik gracza <span>/</span> <strong>${e(links.find(l=>l[0]===active)?.[2]??'Atlas')}</strong></div><form id="global-search-form" class="top-search" role="search"><label class="sr-only" for="global-search">Szukaj w całej bazie</label>${icon('search')}<input id="global-search" name="q" type="search" placeholder="Szukaj przedmiotu lub Kinga…" autocomplete="off"><button type="submit" aria-label="Szukaj">${icon('arrow')}</button></form><a href="#/help/patch-october" class="patch-pill"><span></span> Patch 16.10.2026</a></header>
    <main id="main" tabindex="-1" class="main-content">${storageError?`<div class="notice error">${icon('info')}<div><strong>Nie można odczytać zapisów.</strong> Oryginał pozostał nienaruszony. <button class="text-button" data-action="recovery">Pobierz kopię ratunkową</button></div></div>`:''}${content}</main>
    <footer class="site-footer"><span>Stworzone dla podróżników po świecie ROSE.</span><span>Nieoficjalna aplikacja · <a href="#/guide">Źródła i zakres danych</a> · <a href="https://github.com/Abeel87/rose-builds" target="_blank" rel="noopener noreferrer">GitHub ${icon('external')}</a></span></footer></div>`;
}

function home() {
  const useful=['8178','17523','17713','17714','17729','11594'].map(id=>index.items.get(id)).filter(Boolean);
  const kings=['203','207','2207','2226','2281','2309'].map(id=>index.monsters.get(id)).filter(Boolean);
  return `<section class="adventure-start panel"><div class="adventure-copy"><span class="eyebrow">ROSE ONLINE GLOBAL · NIEZBĘDNIK GRACZA</span><h1 id="page-title" tabindex="-1">Twoja następna<br><em>wyprawa zaczyna się tutaj.</em></h1><p>Znajdź item. Zobacz, kto go dropi.<br>Przygotuj postać i ruszaj po swoje.</p><form id="hero-search-form" class="search-field">${icon('search')}<label class="sr-only" for="hero-search">Szukaj itemu, Kinga albo mapy</label><input id="hero-search" name="q" placeholder="Rift Boomer, Jelly King, Golden Ring…" type="search" required><button class="btn primary" type="submit">Znajdź</button></form><div class="quick-search"><span>Szybki wybór:</span><a href="#/item/8178">Rift Boomer</a><a href="#/atlas?planet=Orlo">Kingi Orlo</a><a href="#/atlas?q=Ulverick&kind=all">Ulverick</a></div></div><div class="adventure-character">${classImage(draft?.job??'Bourgeois')}<span class="character-caption">${e(draft?.job??'Bourgeois')}<small>Twoja postać. Twój plan.</small></span><a href="#/build" class="btn gold">Otwórz postać ${icon('arrow')}</a></div></section>
  <div class="quest-shortcuts"><a href="#/drops"><span class="shortcut-item">${itemSymbol(index.items.get('8178'))}</span><div><small>01 · PLECAK</small><h2>Gdzie dropi mój item?</h2><p>Ikony, parametry i potwory.</p></div>${icon('arrow')}</a><a href="#/atlas"><span class="shortcut-item">${monsterImage(index.monsters.get('207'))}</span><div><small>02 · BESTIARIUSZ</small><h2>Znajdź swojego Kinga</h2><p>Wygląd, lokalizacja i drop.</p></div>${icon('arrow')}</a><a href="#/map"><span class="shortcut-map">${icon('pin')}</span><div><small>03 · MAPA ŚWIATA</small><h2>Dokąd ruszamy?</h2><p>Mapy gry i cele wyprawy.</p></div>${icon('arrow')}</a></div>
  <section><div class="section-heading"><div><span class="eyebrow">NA TROPIE DROPÓW</span><h2>Do twojego plecaka</h2></div><a class="text-link" href="#/drops">Otwórz cały katalog ${icon('arrow')}</a></div><div class="inventory-grid home-inventory">${useful.map(i=>itemCard(i)).join('')}</div></section>
  <section><div class="section-heading"><div><span class="eyebrow">WYBIERZ CEL WYPRAWY</span><h2>Poznaj Kingów</h2></div><a class="text-link" href="#/atlas">Bestiariusz ${icon('arrow')}</a></div><div class="king-gallery">${kings.map(m=>`<a class="king-tile" href="#/monster/${m.id}">${monsterImage(m)}<strong>${e(m.name)}</strong><small>${e(m.locations[0]?.zone??'Mapa do ustalenia')}</small><span>Lv. ${m.level??'?'}</span></a>`).join('')}</div></section>
  <div class="home-columns"><section class="panel local-intro"><span class="eyebrow">WSZYSTKO POD RĘKĄ</span><h2>Od itemu do miejsca</h2><ol><li>Otwórz przedmiot i zobacz jego źródła.</li><li>Wybierz Kinga i obejrzyj dropy oraz mapę.</li><li>Dodaj cel do farmienia albo item do buildu.</li></ol><a href="#/help/patch-inspector" class="text-link">Pokaż krok po kroku ${icon('arrow')}</a></section><section class="panel local-intro"><span class="eyebrow">TWOJE ZAPISY</span><h2>Gotowy na kolejną sesję?</h2><p>${library.builds.length} zapisanych buildów · ${library.targets.filter(t=>!t.done).length} celów farmienia</p><div class="hero-actions"><a class="btn primary" href="#/saved">Moje buildy</a><a class="btn secondary" href="#/journal">Plan farmienia</a></div><p class="small-note">Zapisy zostają na tym urządzeniu. Kopię możesz pobrać w Moich buildach.</p></section></div>`;
}

function itemCard(item,source=null) {
  const mobs=index.droppedBy.get(item.id)??[],mapDrop=data.zoneDrops.find(z=>z.items.includes(item.id));
  return `<article class="inventory-card"><a href="#/item/${e(item.id)}" class="inventory-open"><div class="inventory-slot">${itemSymbol(item)}${item.level?`<span class="slot-level">${item.level}</span>`:''}</div><strong>${e(item.name)}</strong><small>${e(TYPES[item.type]??item.type)}</small><span class="item-tooltip"><b>${e(item.name)}</b>${item.level?`<span>Wymagany poziom: ${item.level}</span>`:''}<span>${mobs.length?`Drop: ${e(mobs[0].name)}${mobs.length>1?` i ${mobs.length-1} innych`:''}`:mapDrop?e(mapDrop.zone):'Źródło dropu do ustalenia'}</span><span>Kliknij, aby zobaczyć szczegóły</span></span></a><div class="inventory-card-foot"><a href="#/item/${e(item.id)}">${mobs.length?`${mobs.length} źr. dropu`:mapDrop?'Drop mapowy':'Szczegóły'} ${icon('arrow')}</a>${pinButton('item',item.id)}</div>${source?`<div class="inventory-provenance">${sourceLink(source)}</div>`:''}</article>`;
}

function monsterRow(m,compact=false) {
  const place=m.locations[0];
  return `<article class="monster-row">${monsterImage(m)}<div class="monster-row-main"><a href="#/monster/${e(m.id)}"><strong>${e(m.name)}</strong></a><small>${icon('pin')}${e(place?.zone??'Lokalizacja do ustalenia')}${!compact&&place?` · ${place.planet}`:''}</small></div><span class="level-label">${m.level?`Lv. ${m.level}`:'Event'}</span>${compact?`<a class="icon-button" href="#/monster/${e(m.id)}" aria-label="Szczegóły ${e(m.name)}">${icon('arrow')}</a>`:pinButton('monster',m.id)}</article>`;
}

function monsterCard(m) {
  const highlights=[...Object.keys(m.officialDrops),...m.drops].filter((id,i,a)=>a.indexOf(id)===i&&index.items.has(id)).slice(0,4);
  return `<article class="monster-card panel"><div class="card-top"><a href="#/monster/${e(m.id)}" aria-label="Obejrzyj ${e(m.name)}">${monsterImage(m)}</a><div class="card-badges">${tag(KINDS[m.kind],m.kind==='wandering'?'violet-tag':'')}${m.level?tag(`Lv. ${m.level}`,'gold-tag'):''}</div>${pinButton('monster',m.id)}</div><h3><a href="#/monster/${e(m.id)}">${e(m.name)}</a></h3><p class="card-location">${icon('pin')}${e(m.locations.map(l=>l.zone).join(' / ')||'Lokalizacja do ustalenia')}</p><div class="monster-loot-preview">${highlights.map(id=>`<a href="#/item/${id}" title="${e(index.items.get(id).name)}">${itemSymbol(index.items.get(id))}<span class="sr-only">${e(index.items.get(id).name)}</span></a>`).join('')}<span>${m.drops.length} dropów</span></div><div class="card-bottom"><a class="btn small primary" href="#/monster/${e(m.id)}">Drop i szczegóły ${icon('arrow')}</a>${m.locations[0]?`<a class="text-link" href="${e(mapRoute(m.locations[0].zone,{mapKing:m.id}))}">${icon('pin')}Mapa</a>`:''}</div></article>`;
}

function atlas() {
  const rows=filterMonsters(data.monsters,{...state,query:state.q}).sort((a,b)=>(b.locations.some(l=>isOfficial(l.source))?1:0)-(a.locations.some(l=>isOfficial(l.source))?1:0)||(a.level??999)-(b.level??999)||a.name.localeCompare(b.name));
  return `${pageHead('ATLAS ŚWIATA','Kingi, bossy i potwory','Znajdź cel, sprawdź miejsce występowania i zobacz, co może wypaść.')}
  <div class="planet-tabs"><button class="${!state.planet?'active':''}" data-action="planet" data-planet="">Cały świat</button>${PLANETS.map(p=>`<button class="${state.planet===p.name?'active':''}" data-action="planet" data-planet="${p.name}">${icon(p.symbol)}${p.name}</button>`).join('')}</div>
  <div class="filter-bar panel"><div class="search-field">${icon('search')}<label for="atlas-query" class="sr-only">Szukaj potwora lub mapy</label><input id="atlas-query" data-query type="search" value="${e(state.q)}" placeholder="Nazwa Kinga, potwora lub mapy…"></div><label class="filter-select">Typ<select id="kind-filter" data-filter="kind"><option value="" ${!state.kind?'selected':''}>Wszystkie potwory</option><option value="kings" ${state.kind==='kings'?'selected':''}>Kingi i wydarzenia</option><option value="king" ${state.kind==='king'?'selected':''}>King</option><option value="wandering" ${state.kind==='wandering'?'selected':''}>Wandering</option><option value="boss" ${state.kind==='boss'?'selected':''}>Sub-boss</option><option value="event" ${state.kind==='event'?'selected':''}>Wydarzenia</option></select></label><label class="checkbox-label"><input type="checkbox" data-filter="knownLocation" ${state.knownLocation?'checked':''}>Z podaną lokalizacją</label></div>
  <div class="result-summary"><span><strong>${number(rows.length)}</strong> wyników${state.planet?` · ${e(state.planet)}`:''}</span><button class="text-button" data-action="clear-filters">Wyczyść filtry</button></div><div class="monster-grid">${slice(rows).map(monsterCard).join('')}</div>${!rows.length?empty('Nie ma takiego celu w tych filtrach','Spróbuj innej nazwy albo wybierz wszystkie potwory. Nieznana lokalizacja nie oznacza, że potwór nie występuje w grze.',`<button class="btn secondary" data-action="clear-filters">Wyczyść filtry</button>`):''}${pagination(rows.length)}
  <p class="data-footnote">${icon('info')} „Oficjalny patch” potwierdza wskazaną lokalizację lub konkretny drop. Nie nadaje całej karcie statusu zweryfikowanej.</p>`;
}

function itemRow(item,source=null) {
  const mobs=index.droppedBy.get(item.id)??[];
  return `<article class="item-row">${itemSymbol(item)}<div class="item-row-main"><a href="#/item/${e(item.id)}"><strong>${e(item.name)}</strong></a><small>${e(TYPES[item.type]??item.type)}${item.level?` · wymagany Lv. ${item.level}`:''}</small></div>${source?sourceLink(source):`<span class="drop-count">${mobs.length?`${mobs.length} ${mobs.length===1?'potwór':'potworów'}`:data.zoneDrops.some(z=>z.items.includes(item.id))?'Drop mapowy':'Brak tabeli dropu'}</span>`}${pinButton('item',item.id)}<a class="icon-button" href="#/item/${e(item.id)}" aria-label="Gdzie zdobyć ${e(item.name)}">${icon('arrow')}</a></article>`;
}
function drops() {
  const rows=filterItems(data.items,index,{...state,query:state.q},data.zoneDrops).sort((a,b)=>{
    const q=normalizeText(state.q),aa=normalizeText(a.name),bb=normalizeText(b.name);
    return (bb===q?2:bb.startsWith(q)?1:0)-(aa===q?2:aa.startsWith(q)?1:0)||a.name.localeCompare(b.name);
  });
  const matchedMonsters=state.q?filterMonsters(data.monsters,{query:state.q,planet:state.planet}).slice(0,5):[];
  return `${currentEntry?.from?.hash.startsWith('#/map')?backLink('#/map'):''}${pageHead('PLECAK · KATALOG PRZEDMIOTÓW','Wybierz item. Znajdź drop.','Od przedmiotu do potwora i miejsca farmienia — w jednej wyszukiwarce.',`<a class="btn secondary" href="#/journal">${icon('bookmark')}Mój plan farmienia</a>`)}
  <div class="filter-bar panel"><div class="search-field">${icon('search')}<label class="sr-only" for="drop-query">Szukaj przedmiotu, potwora lub mapy</label><input id="drop-query" data-query type="search" value="${e(state.q)}" placeholder="Przedmiot, potwór lub mapa…"></div><label class="filter-select">Kategoria<select id="type-filter" data-filter="type"><option value="">Wszystkie przedmioty</option>${Object.entries(TYPES).map(([key,label])=>`<option value="${key}" ${state.type===key?'selected':''}>${label}</option>`).join('')}</select></label><label class="filter-select">Planeta<select id="planet-filter" data-filter="planet">${planetOptions(state.planet)}</select></label></div>
  <div class="filter-options"><label class="checkbox-label"><input type="checkbox" data-filter="onlyDrops" ${state.onlyDrops?'checked':''}>Tylko przedmioty ze źródłem dropu</label><label class="checkbox-label"><input type="checkbox" data-filter="officialOnly" ${state.officialOnly?'checked':''}>Tylko dropy potwierdzone w patchach</label><button class="text-button" data-action="clear-filters">Wyczyść filtry</button></div>
  ${matchedMonsters.length?`<section class="related-monsters"><span class="eyebrow">PASUJĄCE POTWORY I BOSSY</span><div>${matchedMonsters.map(m=>`<a href="#/monster/${e(m.id)}">${monsterImage(m)}${e(m.name)}${icon('arrow')}</a>`).join('')}</div></section>`:''}
  <div class="result-summary"><span><strong>${number(rows.length)}</strong> przedmiotów</span><span>${state.onlyDrops?'Lista możliwych dropów':'Pełny katalog — dostępność części przedmiotów niepotwierdzona'}</span></div>
  <section class="inventory-grid">${slice(rows).map(i=>itemCard(i)).join('')||empty('Nie znaleziono przedmiotu','Zmień nazwę lub filtry. Brak wyniku oznacza brak danych w tej bazie, nie brak dropu w grze.',`<button class="btn secondary" data-action="clear-filters">Wyczyść filtry</button>`)}</section>${pagination(rows.length)}
  <p class="data-footnote">${icon('info')} Lista nie podaje zmyślonych procentów. Brak podanej szansy nie oznacza 0% ani gwarantowanego dropu.</p>`;
}

function monsterDetail() {
  const m=index.monsters.get(state.id);
  if(!m)return empty('Nie ma takiego potwora w katalogu','Wpis mógł zostać zmieniony.',`<a class="btn primary" href="#/atlas">Wróć do atlasu</a>`);
  const loot=m.drops.map(id=>index.items.get(id)).filter(i=>normalizeText(i.name).includes(normalizeText(state.detailQ))).sort((a,b)=>(m.officialDrops[b.id]?1:0)-(m.officialDrops[a.id]?1:0)||a.name.localeCompare(b.name));
  const saved=target('monster',m.id),appearance=visualData().monsters[m.id];
  return `${backLink('#/atlas')}<section class="detail-hero panel ${appearance?.image?'with-appearance':''}"><figure class="king-figure">${appearance?.image?`<button class="portrait-button" data-action="portrait" data-id="${e(m.id)}" aria-label="Powiększ wygląd ${e(m.name)}">${monsterImage(m,'detail-portrait')}<span class="portrait-expand">${icon('eye')}Powiększ wygląd</span></button><figcaption>${appearance.origin==='official-screenshot'?'Oficjalny zrzut z gry':'Oryginalny model z gry'}</figcaption>`:monsterImage(m,'detail-portrait')}</figure><div><span class="eyebrow">${e(KINDS[m.kind])}${m.habitat==='clan'?' · CLAN FIELD / PVP':m.habitat==='dungeon'?' · DUNGEON':''}</span><h1 id="page-title" tabindex="-1">${e(m.name)}</h1><div class="detail-meta">${m.level?tag(`Poziom ${m.level}`,'gold-tag'):tag('Poziom do potwierdzenia')}${sourceLink(m.levelSource??m.source)}${tag(`${m.drops.length} możliwych dropów`)}</div>${appearance?.image?`<p class="appearance-intro">Tak wygląda ${e(m.name)}. Kliknij wizerunek, aby obejrzeć go w dużym rozmiarze.</p>`:''}</div><div class="heading-actions">${pinButton('monster',m.id,true)}<button class="btn primary" data-action="kill" data-id="${e(m.id)}">${icon('clock')}Zapisz zabicie</button></div></section>
  <div class="detail-columns"><section class="panel detail-info"><h2>${icon('pin')} Gdzie go znaleźć?</h2>${m.locations.length?m.locations.map(l=>`<div class="location-row"><span>${e(l.planet)}</span><a href="${e(mapRoute(l.zone,{mapKing:m.id}))}">${e(l.zone)} ${icon('arrow')}</a>${sourceLink(l.source)}</div>`).join(''):`<p>BRAK POTWIERDZONYCH DANYCH o dokładnej lokalizacji.${m.planet?` Planeta: ${e(m.planet)}.`:''}</p>`}${m.note?`<p class="info-note">${e(m.note)}</p>${m.noteSource?sourceLink(m.noteSource):''}`:''}</section><section class="panel detail-info"><h2>${icon('clock')} Twoja obserwacja</h2><p>${saved?.killedAt?`Ostatnio zapisane zabicie: <strong>${new Date(saved.killedAt).toLocaleString('pl-PL')}</strong>.`:'Zapisz zabicie, aby wrócić do tej obserwacji w planie farmienia.'}</p>${m.respawn?`<div class="respawn-window"><strong>${m.respawn[0]}–${m.respawn[1]}</strong><span>minut · przedział odrodzenia</span></div>${sourceLink(m.respawnSource)}`:'<div class="muted-box">Czas odrodzenia: brak potwierdzonych danych.</div>'}<p class="small-note">To lokalny dziennik. Aplikacja nie odczytuje obecności bossa na serwerze.</p></section></div>
  ${m.locations.length?mapPreview(m.locations[0].zone,m.id):''}
  ${m.rewards?.length?`<section class="panel rewards-panel"><h2>Nagrody powiązane z wydarzeniem</h2><p>Patch wymienia poniższe przedmioty. Nie potwierdza bezpośredniego dropu z tego bossa.</p>${m.rewards.map(id=>itemRow(index.items.get(id),'patch-october')).join('')}</section>`:''}
  <div class="section-heading"><div><span class="eyebrow">TABELA PRZEDMIOTÓW</span><h2>Co może wypaść?</h2></div><div class="search-field compact-search">${icon('search')}<label class="sr-only" for="detail-query">Szukaj w dropach tego potwora</label><input id="detail-query" data-detail-query type="search" value="${e(state.detailQ)}" placeholder="Filtruj przedmioty…"></div></div>
  <p class="small-note">${m.source==='community-drops'?'Migawka społecznościowa z osobno oznaczonymi poprawkami z patchy. ':''}Nie jest to gwarantowany loot. Procentowe szanse nie zostały potwierdzone.</p><section class="inventory-grid">${slice(loot).map(i=>itemCard(i,m.officialDrops[i.id]??m.source)).join('')||empty(m.drops.length?'Brak pasujących przedmiotów':'Tabela dropów do uzupełnienia',m.drops.length?'Wyczyść filtr, aby zobaczyć całą listę.':'Sprawdź aktualną listę w Monster Inspector. Nagrody wydarzenia są opisane osobno.')}</section>${pagination(loot.length)}`;
}

function itemDetail() {
  const item=index.items.get(state.id);
  if(!item)return empty('Nie ma takiego przedmiotu','Wróć do katalogu i wyszukaj jego nazwę.',`<a class="btn primary" href="#/drops">Katalog dropów</a>`);
  const mobs=[...(index.droppedBy.get(item.id)??[])].sort((a,b)=>(b.officialDrops[item.id]?1:0)-(a.officialDrops[item.id]?1:0)||b.locations.length-a.locations.length||(a.level??0)-(b.level??0));
  const zoneDrops=data.zoneDrops.filter(z=>z.items.includes(item.id)),rewards=data.monsters.filter(m=>m.rewards?.includes(item.id));
  const fields={attack_power:'Atak',defense:'Obrona',magic_defense:'Obrona magiczna',dodge_rate:'Unik',movement_speed:'Szybkość ruchu',pvm_atk:'PvM offense',pvm_def:'PvM defense',pvp_atk:'PvP offense',pvp_def:'PvP defense'};
  return `${backLink('#/drops')}<section class="detail-hero panel">${itemSymbol(item,'detail-item')}<div><span class="eyebrow">${e(TYPES[item.type]??item.type)}</span><h1 id="page-title" tabindex="-1">${e(item.name)}</h1><div class="detail-meta">${item.level?tag(`Wymagany Lv. ${item.level}`,'gold-tag'):''}${sourceLink(item.source??'community-drops')}</div></div><div class="heading-actions">${pinButton('item',item.id,true)}${slotFor(item.type)?`<button class="btn primary" data-action="equip" data-id="${e(item.id)}">${icon('sword')}Dodaj do buildu</button>`:''}</div></section>
  ${item.note?`<div class="notice">${icon('info')}<p>${e(item.note)}</p></div>`:''}
  ${item.stats||item.requirement?`<section class="panel item-properties"><h2>Parametry katalogowe</h2><div class="property-grid">${Object.entries(item.stats??{}).map(([key,value])=>`<div><span>${e(fields[key]??key)}</span><strong>${e(value)}${key.startsWith('pv')?'%':''}</strong></div>`).join('')}${item.requirement?`<div><span>Wymaganie</span><strong>${e(item.requirement.stat_name)} ${e(item.requirement.value)}</strong></div>`:''}</div><p class="small-note">Dane społecznościowe dla podstawowego przedmiotu. Nie obejmują refine, opcji ani pełnych bonusów postaci.</p></section>`:''}
  ${zoneDrops.length?`<section class="panel detail-info"><h2>${icon('pin')} Potwierdzone źródła mapowe</h2>${zoneDrops.map(z=>`<div class="location-row"><span>${e(z.planet)}</span><a href="${e(mapRoute(z.zone))}">${e(z.zone)} ${icon('arrow')}</a><p>${e(z.note)}</p>${sourceLink(z.source)}</div>`).join('')}</section>`:''}
  ${rewards.length?`<section class="panel detail-info"><h2>Powiązane wydarzenie</h2><p>Źródło wymienia nagrodę wydarzenia, nie bezpośredni drop.</p>${rewards.map(m=>monsterRow(m)).join('')}</section>`:''}
  <div class="section-heading"><div><span class="eyebrow">SKĄD ZDOBYĆ</span><h2>Potwory z tym dropem <span class="count-badge">${mobs.length}</span></h2></div></div>
  <section class="panel source-table">${slice(mobs).map(m=>`<article class="drop-source-row">${monsterImage(m)}<div><a href="#/monster/${e(m.id)}"><strong>${e(m.name)}</strong></a><small>${e(m.locations.map(l=>`${l.planet} · ${l.zone}`).join(' / ')||'Lokalizacja do potwierdzenia')}${m.level?` · Lv. ${m.level}`:''}</small></div>${m.locations[0]?`<a class="text-link" href="${e(mapRoute(m.locations[0].zone,{mapKing:m.id}))}">${icon('pin')}Mapa</a>`:''}${sourceLink(m.officialDrops[item.id]??m.source)}<a class="btn small" href="#/monster/${e(m.id)}">Zobacz ${icon('arrow')}</a></article>`).join('')||empty('Brak przypisanej tabeli potwora','Przedmiot może pochodzić z questu, craftingu, sklepu lub wydarzenia; baza nie potwierdza wszystkich źródeł.')}</section>${pagination(mobs.length)}<p class="data-footnote">${icon('info')} Przypisania społecznościowe wymagają sprawdzenia w grze. Nie znamy procentowej szansy na ten przedmiot.</p>`;
}

function gearItem(value) {
  const name=normalizeText((value??'').split(' +')[0]);
  return name?data.items.find(i=>normalizeText(i.name)===name):null;
}
function gearPane() {
  return `<div class="pane-heading"><div><h2>Załóż sprzęt na wyprawę</h2><p>Kliknij slot i wybierz przedmiot z plecaka. W polu obok możesz dopisać refine i gem.</p></div></div><div class="equipment-workspace"><div class="paperdoll"><div class="paperdoll-character">${classImage(draft.job)}<strong>${e(draft.job)}</strong><span>Lv. ${draft.level}</span></div>${Object.entries(SLOTS).map(([slot,label])=>`<button class="equipment-slot slot-${slot} ${draft.gear[slot]?'equipped':''}" data-action="pick-gear" data-slot="${slot}" title="${e(draft.gear[slot]||label)}" aria-label="${label}: ${e(draft.gear[slot]||'wybierz przedmiot')}">${gearItem(draft.gear[slot])?itemSymbol(gearItem(draft.gear[slot])):icon(slot==='Weapon'?'sword':slot==='Body'?'shield':slot==='Head'?'crown':'plus')}<small>${label}</small></button>`).join('')}</div><div class="equipment-list">${Object.entries(SLOTS).map(([slot,label])=>`<div class="gear-field"><button class="gear-select" data-action="pick-gear" data-slot="${slot}" aria-label="Wybierz: ${label}">${gearItem(draft.gear[slot])?itemSymbol(gearItem(draft.gear[slot])):icon('plus')}</button><div><label for="gear-${slot}">${label}</label><input id="gear-${slot}" data-gear="${slot}" value="${e(draft.gear[slot])}" maxlength="200" placeholder="Kliknij + lub wpisz nazwę…">${gearItem(draft.gear[slot])?`<a class="small-link" href="#/item/${gearItem(draft.gear[slot]).id}">Gdzie dropi? ${icon('arrow')}</a>`:''}</div>${draft.gear[slot]?`<button class="icon-button" data-action="clear-gear" data-slot="${slot}" aria-label="Zdejmij: ${label}">${icon('close')}</button>`:''}</div>`).join('')}</div></div><p class="small-note">To zapis konfiguracji. Wymagania klasy, poziomu i bonusy po refine sprawdź w aktualnym kliencie.</p>`;
}
function gearPickerRows() {
  const q=normalizeText(pickerQuery),matches=data.items.filter(i=>slotFor(i.type)===pickerSlot&&normalizeText(i.name).includes(q)).sort((a,b)=>(normalizeText(b.name)===q?1:0)-(normalizeText(a.name)===q?1:0)||a.name.localeCompare(b.name));
  return `<p class="small-note">${number(matches.length)} przedmiotów · pokazano pierwsze ${Math.min(60,matches.length)}. Wpisz nazwę, aby zawęzić.</p><div class="picker-grid">${matches.slice(0,60).map(i=>`<button class="picker-item" data-action="choose-gear" data-id="${i.id}">${itemSymbol(i)}<strong>${e(i.name)}</strong><small>${i.level?`Lv. ${i.level}`:TYPES[i.type]}</small></button>`).join('')||empty('Nie znaleziono itemu','Spróbuj krótszej nazwy. Własny przedmiot możesz wpisać ręcznie w slocie.')}</div>`;
}
function openGearPicker(slot) {
  pickerSlot=slot;pickerQuery='';
  dialog(`Plecak · ${SLOTS[slot]}`,`<div class="search-field">${icon('search')}<label for="gear-picker-query" class="sr-only">Szukaj przedmiotu do slotu ${SLOTS[slot]}</label><input id="gear-picker-query" type="search" placeholder="np. Rift Boomer…" autocomplete="off"></div><div id="gear-picker-results">${gearPickerRows()}</div>`,`<button class="btn secondary" data-action="close-dialog">Zamknij plecak</button>`);$('#gear-picker-query').focus();
}
function skillsPane(known) {
  const catalog=visualData().skills.filter(s=>s.jobs.includes(draft.job));
  const categories=[...new Set(catalog.map(s=>s.category))];
  if(!categories.includes(skillCategory))skillCategory='';
  const matches=catalog.filter(s=>(!skillCategory||s.category===skillCategory)&&normalizeText(s.name).includes(normalizeText(skillQuery)));
  return `<div class="pane-heading"><div><h2>Umiejętności · ${e(draft.job)}</h2><p>Kliknij ikonę, aby dodać skill do planu. Potem ustaw własną rangę.</p></div><button class="btn secondary small" data-action="add-skill">${icon('plus')}Własny skill</button></div><div class="skill-plan">${draft.skills.length?draft.skills.map((s,i)=>`<div class="skill-plan-row">${skillImage(matchingSkill(s.name,draft.job,s.catalogId))}<div><label class="sr-only" for="skill-name-${i}">Nazwa umiejętności ${i+1}</label><input id="skill-name-${i}" data-skill-index="${i}" data-skill-field="name" maxlength="100" value="${e(s.name)}"><label class="sr-only" for="skill-note-${i}">Notatka</label><input id="skill-note-${i}" class="subtle-input" data-skill-index="${i}" data-skill-field="note" maxlength="300" value="${e(s.note)}" placeholder="Priorytet, rotacja…"></div><label class="rank-label" for="skill-rank-${i}">Ranga<input id="skill-rank-${i}" type="number" min="0" max="100" data-skill-index="${i}" data-skill-field="rank" value="${s.rank}"></label><button class="icon-button danger" data-action="remove-skill" data-index="${i}" aria-label="Usuń ${e(s.name)}">${icon('trash')}</button></div>`).join(''):`<div class="skill-plan-empty">${icon('spark')}Twój pasek umiejętności jest pusty. Wybierz skille poniżej.</div>`}</div><div class="skill-catalog-heading"><h3>Księga umiejętności <span class="count-badge">${catalog.length}</span></h3><div class="search-field">${icon('search')}<label for="skill-query" class="sr-only">Szukaj umiejętności</label><input id="skill-query" type="search" value="${e(skillQuery)}" placeholder="Szukaj skilla…"></div></div><div class="skill-categories"><button class="${!skillCategory?'active':''}" data-action="skill-category" data-category="">Wszystkie</button>${categories.map(c=>`<button class="${skillCategory===c?'active':''}" data-action="skill-category" data-category="${e(c)}">${e(c)}</button>`).join('')}</div><div class="skill-catalog">${matches.map(s=>{const selected=draft.skills.some(x=>x.catalogId===s.id);return `<button class="skill-choice ${selected?'selected':''}" data-action="catalog-skill" data-skill="${e(s.id)}" aria-pressed="${selected}">${skillImage(s)}<span><strong>${e(s.name)}</strong><small>${e(s.category)} · ${s.type==='passive'?'pasywny':'aktywny'}</small></span>${selected?icon('check'):icon('plus')}</button>`;}).join('')||empty('Brak pasującej umiejętności','Zmień nazwę lub kategorię.')}</div><p class="small-note">Nazwy i ikony: katalog społeczności. Rangi są twoim planem; koszty SP i zależności nie są wyliczane. ${sourceLink('community-skills')}</p>${known.length?`<details class="source-details"><summary>Zmiany skilli potwierdzone w patchach</summary>${known.map(s=>`<article class="skill-fact"><strong>${e(s.name)}</strong><p>${e(s.text)}</p>${sourceLink(s.source)}</article>`).join('')}</details>`:''}`;
}
const pinColors=['#f2c572','#76d7ef','#f298aa','#a7d789','#c0a2f1','#f1a76d'];
const markerColor=number=>pinColors[(number-1)%pinColors.length];
function currentMapView() {
  const base=mapForZone(state.zone),variant=mapVariant(base,state.mapVariant,state.zone);
  const layer=state.mapLayer==='archive'&&base?.archive?'archive':'terrain';
  const map=base?{...base,...(layer==='archive'?base.archive:variant)}:null;
  const markers=markersForMap(spawns,map,{layer});
  return {base,variant,layer,map,markers,groups:mapMarkerGroups(markers,index.monsters)};
}
function mapPins(markers,groups,activeId='',mini=false) {
  const numbered=new Map(groups.map(g=>[g.monsterId,g]));
  return markers.map(p=>{
    const g=numbered.get(p.monsterId);if(!g)return '';
    const style=`left:${p.x*100}%;top:${p.y*100}%;--pin-color:${markerColor(g.number)}`;
    if(mini)return `<span class="mini-map-pin" style="${style}" aria-hidden="true">${icon('crown')}</span>`;
    return `<button id="map-pin-${e(p.id)}" class="king-map-pin ${p.id===activeId?'selected':''}" style="${style}" data-action="map-marker" data-marker="${e(p.id)}" aria-label="${e(g.name)} — miejsce ${g.markers.findIndex(m=>m.id===p.id)+1} z ${g.count}" aria-pressed="${p.id===activeId}"><span class="pin-medallion">${icon('crown')}<b>${g.number}</b></span><span class="pin-name ${p.x>.7?'align-left':p.x<.3?'align-right':''}">${e(g.name)}</span></button>`;
  }).join('');
}
function mapMarkerCard(marker,group) {
  if(!marker||!group)return `<div class="map-marker-prompt">${icon('crown')}Kliknij koronę na mapie, aby zobaczyć Kinga i jego dropy.</div>`;
  const source=spawns.sources[marker.sourceId];
  return `<section class="map-marker-card" aria-live="polite"><div class="marker-card-main">${monsterImage(group.monster)}<div><span class="eyebrow">MIEJSCE ${group.markers.findIndex(p=>p.id===marker.id)+1} Z ${group.count}</span><h3>${e(group.name)}</h3><p>Szukaj w okolicy zaznaczonej korony.</p></div><a class="btn primary small" href="#/monster/${e(group.monsterId)}">Wygląd i dropy ${icon('arrow')}</a></div><details class="marker-source"><summary>${source?.type==='client'?'Miejsce z danych gry':'Miejsce opisane przez graczy'}${source?.date?` · ${date(source.date)}`:''}</summary><p>${e(source?.note??'')}</p>${source?.url?`<a href="${e(source.url)}" target="_blank" rel="noopener noreferrer">Źródło lokalizacji ${icon('external')}</a>`:''}</details></section>`;
}
function mapPreview(zone,monsterId='') {
  const base=mapForZone(zone);
  const selected=base?.variants?.find(v=>markersForMap(spawns,v).some(p=>p.monsterId===monsterId))??mapVariant(base,'',zone);
  const m=base?{...base,...selected}:null,markers=markersForMap(spawns,m).filter(p=>p.monsterId===monsterId);
  const groups=mapMarkerGroups(markers,index.monsters),href=mapRoute(base?.name??zone,{mapKing:monsterId,mapVariant:base?.variants?selected.id:''});
  return `<section class="panel inline-map"><div><span class="eyebrow">MAPA I OKOLICA</span><h2>${e(zone)}</h2><p>${markers.length?`Miejsc do sprawdzenia: ${markers.length}. Otwórz mapę, aby przyjrzeć się okolicy.`:m?'Obejrzyj mapę i miejsca występowania Kingów.':'Zobacz listę Kingów i potworów przypisanych do tej strefy.'}</p><a class="btn primary" href="${e(href)}">${icon('pin')}${markers.length?'Pokaż Kinga na mapie':`Otwórz ${m?'mapę':'strefę'} na stronie`}</a></div>${m?`<a href="${e(href)}" class="map-thumbnail" aria-label="Mapa ${e(zone)}${markers.length?' z miejscami występowania Kinga':''}"><span class="map-thumbnail-stage" style="--map-aspect:${m.width/m.height}"><img src="./${e(m.image)}" alt="Mapa ${e(zone)}" loading="lazy"><span class="mini-map-pins">${mapPins(markers,groups,'',true)}</span></span></a>`:`<div class="map-unavailable"><span>${icon('pin')}</span><strong>${e(zone)}</strong><small>Brak zweryfikowanego obrazu mapy</small></div>`}</section>`;
}
function allZones() {
  const zones=new Map();
  for(const m of visualData().maps)zones.set(m.name,{name:m.name,planet:m.planet});
  for(const m of data.monsters)for(const l of m.locations){const name=canonicalZone(l.zone);if(!zones.has(name)&&PLANETS.some(p=>p.name===l.planet))zones.set(name,{name,planet:l.planet});}
  for(const z of data.zoneDrops){const name=canonicalZone(z.zone);if(!zones.has(name)&&PLANETS.some(p=>p.name===z.planet))zones.set(name,{name,planet:z.planet});}
  return [...zones.values()].sort((a,b)=>Number(!!mapForZone(b.name))-Number(!!mapForZone(a.name))||a.name.localeCompare(b.name));
}
function worldMap() {
  const zones=allZones(),selected=selectedZone(zones,{...state,zone:canonicalZone(state.zone)});
  const visible=zones.filter(z=>(!state.planet||z.planet===state.planet)&&normalizeText([z.name,...(mapForZone(z.name)?.zones??[])].join(' ')).includes(normalizeText(state.mapQ)));
  const terrainMap=selected&&mapForZone(selected.name);
  const variant=mapVariant(terrainMap,state.mapVariant,state.zone);
  const archiveLayer=state.mapLayer==='archive'&&terrainMap?.archive;
  const map=archiveLayer?{...terrainMap,...terrainMap.archive}:terrainMap?{...terrainMap,...variant}:null;
  const markers=markersForMap(spawns,map,{layer:archiveLayer?'archive':'terrain'}),groups=mapMarkerGroups(markers,index.monsters);
  const shownMarkers=markers.filter(p=>(!state.mapKing||p.monsterId===state.mapKing)&&groups.some(g=>g.monsterId===p.monsterId));
  const pinsVisible=state.showMarkers!==false&&!archiveLayer;
  const selectedMarker=pinsVisible?(shownMarkers.find(p=>p.id===state.mapMarker)??(state.mapKing?shownMarkers[0]:null)):null;
  const selectedGroup=selectedMarker&&groups.find(g=>g.monsterId===selectedMarker.monsterId);
  const zoneMarkers=(terrainMap?.variants??(terrainMap?[terrainMap]:[])).flatMap(v=>markersForMap(spawns,v));
  const zoneMarkerIds=new Set(zoneMarkers.map(p=>p.monsterId));
  const mobs=selected?data.monsters.filter(m=>zoneMarkerIds.has(m.id)||m.locations.some(l=>zoneMatches(l.zone,selected.name))).sort((a,b)=>Number(b.kind!=='monster')-Number(a.kind!=='monster')||(a.level??999)-(b.level??999)):[];
  const zoneLoot=selected?data.zoneDrops.filter(z=>zoneMatches(z.zone,selected.name)):[];
  const mapPlanets=[...PLANETS,...[...new Set(zones.map(z=>z.planet))].filter(name=>!PLANETS.some(p=>p.name===name)).map(name=>({name,symbol:'shield'}))];
  const planetLink=planet=>mapRoute(selected&&(!planet||selected.planet===planet)?selected.name:'',{planet});
  const zoneLink=zone=>mapRoute(zone,{planet:state.planet,mapQ:state.mapQ});
  return `${currentEntry?.from?backLink('#/atlas'):''}${pageHead('MAPA ŚWIATA','Dokąd ruszamy?','Wybierz strefę. Obejrzyj mapę i sprawdź jej Kingi oraz dropy.')}
  <div class="atlas-coverage"><strong>${visualData().maps.length} stref</strong><span>Miasta, tereny, jaskinie, dungeony, areny i mapy wydarzeń</span></div>
  <div class="planet-tabs"><a class="${!state.planet?'active':''}" href="${e(planetLink(''))}">Wszystkie planety</a>${mapPlanets.map(p=>`<a class="${state.planet===p.name?'active':''}" href="${e(planetLink(p.name))}">${icon(p.symbol)}${p.name}</a>`).join('')}</div>
  <div class="world-map-layout"><aside class="panel zone-sidebar">
    <label for="map-query">Znajdź strefę</label><div class="map-search"><input id="map-query" type="search" value="${e(state.mapQ??'')}" placeholder="Nazwa mapy…">${state.mapQ?'<button class="icon-button" data-action="map-clear-query" aria-label="Wyczyść wyszukiwanie map">×</button>':''}</div>
    <div class="mobile-zone-picker"><label for="map-zone">Przejdź do mapy</label><select id="map-zone"><option value="">Wybierz strefę (${visible.length})</option>${visible.map(z=>`<option value="${e(z.name)}" ${z.name===selected?.name?'selected':''}>${e(z.name)} · ${e(z.planet)}</option>`).join('')}</select></div>
    <nav aria-label="Strefy świata">${visible.map(z=>`<a class="zone-choice ${z.name===selected?.name?'active':''}" href="${e(zoneLink(z.name))}" ${z.name===selected?.name?'aria-current="page"':''}>${icon(mapForZone(z.name)?'eye':'pin')}<span>${e(z.name)}<small>${e(z.planet)}${mapForZone(z.name)?.variants?` · ${mapForZone(z.name).variants.length} widoki`:mapForZone(z.name)?' · obraz mapy':''}</small></span><b>${data.monsters.filter(m=>m.locations.some(l=>zoneMatches(l.zone,z.name))).length}</b></a>`).join('')}</nav>
    ${!visible.length?'<p class="small-note" role="status">Brak pasujących stref. Wyczyść lub zmień nazwę powyżej.</p>':''}
  </aside><section class="map-main">${selected?`
    <div class="panel map-panel"><div class="map-title"><div><span class="eyebrow">${e(selected.planet)}</span><h2 id="selected-map-title">${e(selected.name)}</h2></div>${map?`<div class="map-controls"><button class="icon-button" data-action="map-zoom" data-step="-0.25" aria-label="Pomniejsz mapę">−</button><output id="map-scale">${Math.round(mapZoom*100)}%</output><button class="icon-button" data-action="map-zoom" data-step="0.25" aria-label="Powiększ mapę">+</button><button class="btn small" data-action="map-reset">Dopasuj</button></div>`:''}</div>
    ${map?.availabilityNote?`<p class="map-availability">${icon('info')}${e(map.availabilityNote)}</p>`:''}
    ${terrainMap?.variants?`<div class="map-variants" role="group" aria-label="Obszar lub piętro mapy">${terrainMap.variants.map(v=>`<button class="${variant?.id===v.id?'active':''}" data-action="map-variant" data-variant="${e(v.id)}" aria-pressed="${variant?.id===v.id}">${e(v.label)}</button>`).join('')}</div>`:''}
    ${terrainMap?.archive?`<div class="map-layers" role="group" aria-label="Widok mapy"><button class="${!archiveLayer?'active':''}" data-action="map-layer" data-layer="terrain" aria-pressed="${!archiveLayer}">${icon('eye')}Teren z gry</button><button class="${archiveLayer?'active':''}" data-action="map-layer" data-layer="archive" aria-pressed="${!!archiveLayer}">${icon('pin')}Oznaczenia społeczności <small>archiwum</small></button></div>`:''}
    ${!archiveLayer&&map?`<div class="map-king-toolbar"><label class="map-pin-switch"><input id="map-show-markers" type="checkbox" ${pinsVisible?'checked':''}>${icon('crown')}Kingi na mapie</label><label class="map-king-filter" for="map-king-filter"><span class="sr-only">Wybierz Kinga na mapie</span><select id="map-king-filter"><option value="">Wszystkie Kingi (${groups.length})</option>${groups.map(g=>`<option value="${e(g.monsterId)}" ${state.mapKing===g.monsterId?'selected':''}>${g.number}. ${e(g.name)} (${g.count})</option>`).join('')}${state.mapKing&&!groups.some(g=>g.monsterId===state.mapKing)?`<option value="${e(state.mapKing)}" selected>${e(index.monsters.get(state.mapKing)?.name??'Wybrany King')} — brak punktów</option>`:''}</select></label></div>`:''}
    ${map?`<div class="map-viewport" tabindex="0" aria-label="Mapa ${e(selected.name)}. Po powiększeniu przewijaj obraz."><div class="map-stage" id="world-map-stage" style="--map-zoom:${mapZoom};--map-aspect:${map.width&&map.height?map.width/map.height:1}"><img id="world-map-image" src="./${e(map.image)}" alt="${e(map.name)} — ${archiveLayer?'archiwalne oznaczenia społeczności':'mapa terenu z gry z miejscami występowania Kingów'}" ${map.width&&map.height?`width="${map.width}" height="${map.height}"`:''}><div class="map-pins" aria-label="Miejsca występowania Kingów">${pinsVisible?mapPins(shownMarkers,groups,selectedMarker?.id):''}</div></div></div>
      <div class="map-caption"><span>${map.origin==='official-client'?'Mapa z klienta gry':map.origin==='official-client-derived'?'Plan z geometrii gry':map.historical?'Archiwalna mapa':'Mapa społeczności'} · ${date(map.date)}</span><span>${icon('info')}${archiveLayer?'Archiwalne oznaczenia autora.':groups.length?`Kingi: ${groups.length} · Miejsca: ${markers.length}. Korony wskazują okolice występowania.`:'Brak ustalonych punktów Kingów na tym widoku.'}</span></div>
      ${!archiveLayer&&groups.length?`<div class="map-king-legend" aria-label="Legenda Kingów">${groups.map(g=>`<button class="map-king-chip ${state.mapKing===g.monsterId?'active':''}" data-action="map-king" data-id="${e(g.monsterId)}" aria-pressed="${state.mapKing===g.monsterId}" style="--pin-color:${markerColor(g.number)}"><span class="legend-number">${g.number}</span><span>${e(g.name)}<small>Miejsc do sprawdzenia: ${g.count}</small></span></button>`).join('')}</div>${pinsVisible&&shownMarkers.length?mapMarkerCard(selectedMarker,selectedGroup):!pinsVisible?'<p class="map-marker-empty">Włącz „Kingi na mapie”, aby pokazać korony.</p>':'<p class="map-marker-empty">Dla wybranego Kinga nie ma ustalonego punktu na tym widoku. Wybierz innego Kinga lub zmień obszar.</p>'}`:!archiveLayer?`<p class="map-marker-empty">${mobs.some(m=>m.kind!=='monster')?'Lokalizacja w tej strefie jest znana, ale dokładne miejsce na tym widoku wymaga jeszcze potwierdzenia.':'Na tym widoku nie mamy przypisanych miejsc występowania Kingów.'}</p>`:''}
      <details class="source-details"><summary>Oznaczenia i źródło mapy</summary><p>${e(map.note)}</p><p>Autor / źródło: ${e(map.author)}. <a href="${e(map.sourceUrl)}" target="_blank" rel="noopener noreferrer">Oryginał materiału ${icon('external')}</a></p></details>`:
      `<div class="map-placeholder"><span>${icon('pin')}</span><h3>${e(selected.name)}</h3><p>Obraz tej mapy jest jeszcze do uzupełnienia. Poniżej znajdziesz przypisane do niej cele i dropy.</p><a class="btn secondary" href="#/drops?q=${encodeURIComponent(selected.name)}">Sprawdź dropy w ${e(selected.name)} ${icon('arrow')}</a></div>`}
    </div><div class="section-heading"><div><span class="eyebrow">CELE W TEJ STREFIE</span><h2>Kingi i potwory <span class="count-badge">${mobs.length}</span></h2></div><a class="text-link" href="#/drops?q=${encodeURIComponent(selected.name)}">Dropy tej strefy ${icon('arrow')}</a></div>
    <section class="panel map-monsters">${mobs.map(m=>{const point=zoneMarkers.find(p=>p.monsterId===m.id);return `<div class="map-monster-entry">${monsterRow(m,true)}${point?`<a class="map-locate-link" href="${e(mapRoute(selected.name,{planet:state.planet,mapQ:state.mapQ,mapVariant:terrainMap.variants?String(point.clientZoneId):'',mapKing:m.id,mapMarker:point.id}))}">${icon('pin')}Pokaż na mapie</a>`:''}</div>`;}).join('')||'<p>Nie mamy jeszcze przypisanych potworów. Brak wpisu nie oznacza pustej mapy.</p>'}</section>
    ${zoneLoot.length?`<h3 class="zone-loot-heading">Drop mapowy</h3><div class="inventory-grid">${[...new Set(zoneLoot.flatMap(z=>z.items))].map(id=>index.items.get(id)).filter(Boolean).map(i=>itemCard(i,zoneLoot[0].source)).join('')}</div>`:''}`:
    empty('Nie znaleziono tej strefy',state.zone?`Nie ma mapy „${state.zone}” w katalogu. Wybierz inną strefę z listy.`:'Wybierz inną planetę lub strefę.')}
  </section></div><p class="small-note">${visualData().maps.length} stref · ${visualData().maps.reduce((sum,m)=>sum+(m.variants?.length??1),0)} widoków map. Korony dotyczą wybranego obszaru lub piętra. Pokazują miejsca możliwego pojawienia się Kinga, nie jego obecność w tej chwili. Lista pod mapą obejmuje całą strefę.</p>`;
}

function helpArticle() {
  const source=SOURCES[state.id];if(!source)return empty('Nie znaleziono poradnika','Wybierz temat z listy.',`<a class="btn primary" href="#/guide">Poradnik gracza</a>`);
  const article=ARTICLES[state.id]??{title:source.title,intro:source.note,facts:state.id==='community-art'?['Ikony przedmiotów są oryginalnymi grafikami gry, spakowanymi lokalnie w katalogu.', 'Bossy i Kingi, również te z wydarzeń, mają duże podglądy oryginalnych modeli i tekstur z klienta Global. Przy wybranych wydarzeniach dostępny jest także oficjalny zrzut z gry. Kliknij wizerunek w karcie bossa, aby go powiększyć i sprawdzić źródło.', 'Portrety ośmiu klas pochodzą z tych samych publicznych materiałów gry.']:['Każdy potwór pokazuje wszystkie przypisane mu w tej bazie przedmioty. Nie jest to gwarancja dropu.', 'Dane społecznościowe są oddzielone od konkretnych informacji potwierdzonych przez oficjalne patche.', 'Gdy brakuje mapy, procentów lub pełnej tabeli instancji, strona informuje o tym wprost.'],links:[['drops','Katalog przedmiotów'],['atlas','Kingi i potwory'],['map','Mapy świata']]};
  return `<a href="#/guide" class="back-link">${icon('back')} Poradnik gracza</a>${pageHead('PORADNIK NA STRONIE',article.title,article.intro)}<article class="panel article-content">${article.steps?`<h2>Krok po kroku</h2><ol class="guide-steps">${article.steps.map(t=>`<li>${e(t)}</li>`).join('')}</ol>`:''}${article.table?`<div class="table-scroll"><table><thead><tr>${article.table.headers.map(t=>`<th>${e(t)}</th>`).join('')}</tr></thead><tbody>${article.table.rows.map(row=>`<tr>${row.map(t=>`<td>${e(t)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`:''}${article.facts?`<h2>Co warto wiedzieć</h2><ul class="guide-facts">${article.facts.map(t=>`<li>${e(t)}</li>`).join('')}</ul>`:''}<div class="article-actions">${article.links.map(([url,label])=>`<a class="btn secondary" href="#/${url}">${e(label)} ${icon('arrow')}</a>`).join('')}</div><details class="source-details"><summary>Źródło informacji · ${date(source.date)} · ${source.type==='official'?'oficjalne':source.type==='client'?'pliki klienta gry':'społeczność'}</summary><p>${e(source.note)}</p><a href="${e(source.url)}" target="_blank" rel="noopener noreferrer">Otwórz oryginalny materiał ${icon('external')}</a></details></article>`;
}

function builder() {
  draft??=library.draft?structuredClone(library.draft):createBuild();
  const template=TEMPLATES.find(t=>t.id===draft.archetype),known=SKILL_FACTS.filter(s=>s.job===draft.job);
  const tabs=[['stats','Statystyki'],['gear','Ekwipunek'],['skills','Umiejętności'],['notes','Notatki i rotacja']];
  let content='';
  if(state.buildTab==='stats') content=`<div class="pane-heading"><div><h2>Zaplanuj statystyki</h2><p>Wpisz własne wartości dla swojej postaci.</p></div><label class="filter-select">Znaczenie wartości<select data-build-field="statMode" id="stat-mode"><option value="target" ${draft.statMode==='target'?'selected':''}>Wartości docelowe</option><option value="allocation" ${draft.statMode==='allocation'?'selected':''}>Przydzielone punkty</option></select></label></div><div class="stat-input-grid">${STATS.map(s=>`<div class="stat-input-card"><label for="stat-${s}"><strong>${s}</strong><span>${STAT_LABELS[s]}</span></label><div class="number-stepper"><button type="button" data-action="stat-step" data-stat="${s}" data-step="-1" aria-label="Zmniejsz ${s}">−</button><input id="stat-${s}" type="number" min="0" max="9999" step="1" data-stat="${s}" value="${draft.stats[s]}"><button type="button" data-action="stat-step" data-stat="${s}" data-step="1" aria-label="Zwiększ ${s}">+</button></div></div>`).join('')}</div><div class="builder-info">${icon('info')}<p>To twój plan, bez automatycznego wyliczania puli punktów, kosztu statów i DPS. Pełne, aktualne formuły nie są potwierdzone w tej bazie.</p></div>`;
  if(state.buildTab==='gear') content=gearPane();
  if(state.buildTab==='skills') content=skillsPane(known);
  if(state.buildTab==='notes') content=`<div class="pane-heading"><div><h2>Twój pomysł na grę</h2><p>Zapisz rotację, priorytety rozwoju, cele i rzeczy do sprawdzenia.</p></div></div><label class="field-label" for="build-notes">Notatki i rotacja</label><textarea id="build-notes" data-build-field="notes" maxlength="5000" rows="12" placeholder="Cel: solo / farmienie / bossy…&#10;Rotacja: …&#10;Następny przedmiot: …&#10;Do sprawdzenia w grze: …">${e(draft.notes)}</textarea><p class="small-note">Notatki są częścią eksportowanego buildu i udostępnionego linku.</p>`;
  return `${pageHead('WARSZTAT POSTACI','Twój build. Twój styl.','Zaplanuj postać i zachowaj konfigurację na następną sesję.',`<button class="btn secondary" data-action="share-build">${icon('share')}Udostępnij</button><button class="btn primary" data-action="save-build">${icon('check')}Zapisz build</button>`)}
  <div class="builder-layout"><aside class="panel class-panel"><span class="eyebrow">WYBIERZ SWOJĄ ŚCIEŻKĘ</span>${Object.entries(CLASSES).map(([path,jobs])=>`<div class="class-family"><h3>${path}</h3><div>${jobs.map(job=>`<button class="class-choice ${draft.job===job?'active':''}" aria-pressed="${draft.job===job}" data-action="job" data-job="${job}">${classImage(job)}<span>${job}</span>${draft.job===job?icon('check'):''}</button>`).join('')}</div></div>`).join('')}<div class="class-panel-foot">${icon('shield')}Twój własny plan.<br>Zapis bez zakładania konta.</div></aside><section class="builder-main"><div class="panel build-identity"><div class="build-name-field"><label for="build-name">Nazwa buildu</label><input id="build-name" data-build-field="name" maxlength="80" value="${e(draft.name)}" required></div><div class="build-meta-fields"><label for="build-level">Poziom<input id="build-level" data-build-field="level" type="number" min="1" max="250" value="${draft.level}"></label><label for="build-role">Cel<select id="build-role" data-build-field="role">${['Farmienie','Solo','Bossy','Drużyna','Wsparcie','Tank','Crafting','PvP','Własny',...(!['Farmienie','Solo','Bossy','Drużyna','Wsparcie','Tank','Crafting','PvP','Własny'].includes(draft.role)?[draft.role]:[])].map(r=>`<option ${r===draft.role?'selected':''}>${e(r)}</option>`).join('')}</select></label><label for="build-archetype">Archetyp<select id="build-archetype" data-build-field="archetype">${TEMPLATES.filter(t=>t.job===draft.job).map(t=>`<option value="${t.id}" ${draft.archetype===t.id?'selected':''}>${e(t.name)}</option>`).join('')}</select></label></div><div class="draft-line"><span><i></i><span id="draft-status">${dirty?'Zmiany poza zapisaną kolekcją':'Własna konfiguracja'}</span></span><span>Archetyp: ${e(template?.weapon??draft.job)} · bez narzuconych statów</span></div></div><div class="panel build-workspace"><nav class="build-tabs" aria-label="Sekcje kreatora">${tabs.map(([key,label])=>`<button class="${state.buildTab===key?'active':''}" data-action="build-tab" data-tab="${key}" aria-pressed="${state.buildTab===key}">${label}${key==='skills'&&draft.skills.length?` <span>${draft.skills.length}</span>`:''}</button>`).join('')}</nav><div class="build-pane">${content}</div></div><div class="builder-actions"><button class="text-button" data-action="export-build">${icon('download')}Eksportuj ten build</button><button class="text-button" data-action="new-build">${icon('plus')}Zacznij nowy</button><a class="text-link" href="#/saved">Moje buildy ${icon('arrow')}</a></div></section></div>`;
}

function savedBuilds() {
  const rows=library.builds.filter(b=>normalizeText(`${b.name} ${b.job} ${b.role}`).includes(normalizeText(state.savedQuery)));
  return `${pageHead('TWOJA KOLEKCJA','Moje buildy','Zapisane na tym urządzeniu. Eksportuj kopię, aby przenieść je na inny komputer.',`<button class="btn secondary" data-action="import">${icon('upload')}Importuj</button><button class="btn secondary" data-action="export-all">${icon('download')}Kopia danych</button><button class="btn primary" data-action="new-build">${icon('plus')}Nowy build</button>`)}<input type="file" id="import-file" accept="application/json,.json" hidden>
  ${library.migratedLegacy?`<div class="notice success">${icon('check')}Buildy z poprzedniego planera zostały przeniesione. Oryginalne zapisy pozostały zachowane.</div>`:''}
  <div class="search-field saved-search">${icon('search')}<label class="sr-only" for="saved-query">Szukaj zapisanych buildów</label><input id="saved-query" type="search" placeholder="Szukaj po nazwie lub klasie…" value="${e(state.savedQuery)}"></div><div class="saved-grid">${rows.map(b=>`<article class="panel saved-card"><div class="card-top">${classImage(b.job)}${tag(`Lv. ${b.level}`,'gold-tag')}${tag(b.job)}</div><h2>${e(b.name)}</h2><p>${e(b.role)} · ${b.skills.length} umiejętności</p><div class="saved-stats">${STATS.map(s=>`<span>${s}<strong>${b.stats[s]}</strong></span>`).join('')}</div><div class="saved-date">Zmieniono ${date(b.updatedAt)}</div><div class="saved-actions"><button class="btn primary small" data-action="load-build" data-id="${e(b.id)}">Otwórz ${icon('arrow')}</button><button class="icon-button" data-action="duplicate-build" data-id="${e(b.id)}" aria-label="Duplikuj ${e(b.name)}">${icon('copy')}</button><button class="icon-button" data-action="share-saved" data-id="${e(b.id)}" aria-label="Udostępnij ${e(b.name)}">${icon('share')}</button><button class="icon-button danger" data-action="delete-build" data-id="${e(b.id)}" aria-label="Usuń ${e(b.name)}">${icon('trash')}</button></div></article>`).join('')}</div>${!rows.length?empty(library.builds.length?'Brak pasujących buildów':'Pierwszy build czeka na ciebie',library.builds.length?'Spróbuj innej nazwy.':'Wybierz klasę, zaplanuj statystyki i sprzęt. Twoja konfiguracja będzie czekała tutaj.',`<button class="btn primary" data-action="new-build">${icon('plus')}Stwórz build</button>`):''}<div class="builder-info">${icon('info')}<p>Buildy nie synchronizują się automatycznie między urządzeniami. Kopia JSON obejmuje buildy, szkic i cele farmienia. Import dodaje dane bez usuwania obecnych zapisów.</p></div>`;
}

function journal() {
  const active=library.targets.filter(t=>!t.done).length;
  const rows=library.targets.filter(t=>state.journalFilter==='all'||(state.journalFilter==='done'?t.done:!t.done));
  return `${pageHead('DZIENNIK PODRÓŻNIKA','Twój plan farmienia','Zapisuj cele, własne notatki i obserwacje. Wszystko pod ręką przed wyprawą.',`<a class="btn primary" href="#/drops">${icon('plus')}Znajdź nowy cel</a>`)}<div class="journal-summary"><span><strong>${active}</strong> do zdobycia / odwiedzenia</span><span><strong>${library.targets.length-active}</strong> ukończonych</span></div><div class="planet-tabs">${[['all','Wszystkie cele'],['active','Do zrobienia'],['done','Ukończone']].map(([value,label])=>`<button data-action="journal-filter" data-filter="${value}" class="${state.journalFilter===value?'active':''}">${label}</button>`).join('')}</div><div class="journal-list">${rows.map(t=>{
    const entry=(t.kind==='item'?index.items:index.monsters).get(t.id),timer=t.kind==='monster'?timerState(t.killedAt,entry?.respawn):null;
    return `<article class="panel journal-card ${t.done?'completed':''}"><div class="journal-main"><label class="goal-checkbox"><input type="checkbox" data-target-done data-kind="${t.kind}" data-id="${e(t.id)}" ${t.done?'checked':''}><span class="sr-only">Ukończono ${e(entry?.name??t.id)}</span></label>${t.kind==='item'&&entry?itemSymbol(entry):monsterImage(entry)}<div><a href="#/${t.kind}/${e(t.id)}"><h2>${e(entry?.name??`Cel #${t.id}`)}</h2></a><small>${t.kind==='item'?'Przedmiot do zdobycia':e(entry?.locations.map(l=>l.zone).join(' / ')||'King / potwór')}</small></div><button class="icon-button danger" data-action="pin" data-kind="${t.kind}" data-id="${e(t.id)}" aria-label="Usuń cel ${e(entry?.name??t.id)}">${icon('trash')}</button></div><label class="sr-only" for="target-note-${t.kind}-${e(t.id)}">Notatki do celu</label><textarea id="target-note-${t.kind}-${e(t.id)}" data-target-notes data-kind="${t.kind}" data-id="${e(t.id)}" maxlength="1000" rows="2" placeholder="Twój plan, potrzebna ilość, miejsce spotkania…">${e(t.notes)}</textarea>${t.kind==='monster'?`<div class="journal-timer"><span>${icon('clock')}${t.killedAt?`Zapis zabicia: ${new Date(t.killedAt).toLocaleString('pl-PL')}`:'Brak obserwacji zabicia'}${timer?`<strong data-timer="${e(t.id)}">${timer.phase==='waiting'?`Okno odrodzenia za ok. ${timer.minutes} min`:timer.phase==='window'?`Trwa możliwe okno odrodzenia (do ${timer.minutes} min)`:'Przedział minął — sprawdź w grze'}</strong>`:''}</span><button class="btn small" data-action="kill" data-id="${e(t.id)}">Zabity teraz</button>${t.killedAt?`<button class="text-button" data-action="clear-kill" data-id="${e(t.id)}">Wyczyść</button>`:''}</div>`:''}</article>`;
  }).join('')}</div>${!rows.length?empty('Zaplanuj następną wyprawę','Kliknij zakładkę przy przedmiocie lub potworze, aby dodać go do swoich celów.',`<a class="btn primary" href="#/atlas">${icon('crown')}Przejdź do Kingów</a>`):''}<p class="data-footnote">${icon('info')} Zapis zabicia i odliczanie są lokalne. Nie pokazują, czy boss rzeczywiście żyje lub został zabity przez innego gracza.</p>`;
}

function guide() {
  const located=data.monsters.filter(m=>m.locations.length).length;
  return `${pageHead('WIEDZA NA DOBRY POCZĄTEK','Mniej zgadywania. Więcej przygód.','Praktyczne wskazówki, aktualne zmiany i jasne źródła danych.')}
  <div class="guide-grid">${GUIDES.map(g=>`<article class="panel guide-card"><span class="guide-icon">${icon(g.icon)}</span><h2>${g.title}</h2><p>${g.text}</p><a class="btn secondary small" href="#/help/${g.source}">Otwórz poradnik ${icon('arrow')}</a></article>`).join('')}</div>
  <section class="panel penalty-panel"><div><span class="eyebrow">POZIOM MA ZNACZENIE</span><h2>Sprawdź karę do dropu</h2><p>Standardowe progi z przewodnika dla otwartego świata. Nie są procentową szansą na przedmiot.</p>${sourceLink('drop-guide')}</div><form id="penalty-form"><label for="player-level">Twój poziom<input id="player-level" type="number" min="1" max="250" value="250" required></label><label for="monster-level">Poziom potwora<input id="monster-level" type="number" min="1" max="999" value="250" required></label><button class="btn primary" type="submit">Oblicz</button><output id="penalty-result" aria-live="polite">0% kary przy równych poziomach.</output></form><p class="small-note">Specjalne strefy, potwory, dungeony i Clan Fields mogą stosować inne zasady. Ostateczną karę sprawdź w Monster Inspector.</p></section>
  <section class="panel coverage-panel"><span class="eyebrow">UCZCIWIE O DANYCH</span><h2>Co obejmuje ta baza?</h2><div class="coverage-grid"><div><strong>${number(data.items.length)}</strong><span>przedmiotów w katalogu</span></div><div><strong>${number(data.monsters.length)}</strong><span>potworów i wydarzeń</span></div><div><strong>${number(located)}</strong><span>wpisów z podaną mapą</span></div><div><strong>${number(data.monsters.reduce((n,m)=>n+m.drops.length,0))}</strong><span>powiązań z dropami</span></div></div><p>Katalog jest migawką społecznościową RoseLite / RoseUtils pobraną ${date(CHECKED)}. Nie mamy dostępu do bazy serwera. Dodaliśmy osobno udokumentowane poprawki z oficjalnych patchy do 16.10.2026. Brakujące lokalizacje, szanse, kompletne tabele instancji i formuły buildów pozostają niepotwierdzone.</p><div class="source-legend">${tag('Oficjalny patch','green-tag')} <span>Potwierdza wskazaną informację.</span>${tag('Społeczność','gold-tag')} <span>Wymaga sprawdzenia w aktualnym kliencie.</span></div><p class="small-note">Tylko ROSE Online Global / Rednim Games. Nie korzystamy z tabel prywatnych serwerów. Mapy obejmują minimapy z oficjalnego klienta, rzuty jego lokacji z góry oraz opcjonalne archiwalne oznaczenia społeczności. Datę i źródło znajdziesz przy każdej mapie. Bossy i Kingi mają podglądy oryginalnych modeli i tekstur z klienta Global; Korony na mapach pokazują punkty zapisane w kliencie gry, ale nie potwierdzają obecności Kinga w danej chwili.</p></section>
  <details class="panel source-details"><summary>Źródła, autorzy i daty aktualizacji</summary><section class="sources-list">${Object.entries(SOURCES).map(([,s])=>`<article><div><span class="source-date">${date(s.date)}${s.type==='community'?' · pobrano':''}</span><h3><a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.title)} ${icon('external')}</a></h3><p>${e(s.note)}</p></div>${tag(s.type==='official'?'Oficjalne':s.type==='client'?'Klient gry':'Społeczność',s.type==='official'?'green-tag':'gold-tag')}</article>`).join('')}</section></details><div class="notice">${icon('info')}<p>ROSE Online, nazwy i dane gry należą do odpowiednich właścicieli. Ten projekt jest fanowską pomocą i nie jest powiązany z Rednim Games ani Gravity. <a href="https://roseutils.com/" target="_blank" rel="noopener noreferrer">RoseUtils</a> · <a href="https://github.com/DrezByte/RoseLite" target="_blank" rel="noopener noreferrer">RoseLite / DrezByte</a> · <a href="./assets/fonts/OFL-1.1.txt" target="_blank" rel="noopener">Licencja fontów</a></p></div>`;
}

function render({focusHeading=false}={}) {
  const active=document.activeElement,focusId=active?.id,selection=active?.selectionStart;
  const previousMap=$('#world-map-image')?.getAttribute('src'),mapPosition=[$('.map-viewport')?.scrollLeft??0,$('.map-viewport')?.scrollTop??0],zonePosition=$('.zone-sidebar>nav')?.scrollTop??0;
  const views={home,drops,atlas,monster:monsterDetail,item:itemDetail,build:builder,saved:savedBuilds,journal,guide,map:worldMap,help:helpArticle};
  $('#app').innerHTML=shell((views[state.view]??home)());
  document.title=`${({home:'Twój niezbędnik gracza',drops:'Gdzie dropi?',atlas:'Kingi i potwory',map:'Mapy świata',help:'Poradnik',build:'Kreator buildu',saved:'Moje buildy',journal:'Plan farmienia',guide:'Poradnik i źródła',monster:index.monsters.get(state.id)?.name,item:index.items.get(state.id)?.name})[state.view]??'Atlas'} · ROSE Companion`;
  if(!focusHeading){const viewport=$('.map-viewport');if(viewport&&previousMap===$('#world-map-image')?.getAttribute('src')){viewport.scrollLeft=mapPosition[0];viewport.scrollTop=mapPosition[1];}if($('.zone-sidebar>nav'))$('.zone-sidebar>nav').scrollTop=zonePosition;}
  if(focusHeading){$('#page-title')?.focus({preventScroll:true});window.scrollTo(0,0);}
  else if(focusId){const el=document.getElementById(focusId);el?.focus({preventScroll:true});if(selection!=null&&['text','search'].includes(el?.type))el.setSelectionRange(selection,selection);}
}
function routeLabel() {
  if(state.view==='map')return `mapy ${state.zone}`;
  if(state.view==='monster')return index.monsters.get(state.id)?.name??'potwora';
  if(state.view==='item')return index.items.get(state.id)?.name??'przedmiotu';
  return ({atlas:'wyników Kingów',drops:'wyników dropów',build:'buildu',journal:'planu farmienia',home:'strony głównej',saved:'zapisanych buildów',help:'poradnika',guide:'poradnika'})[state.view]??'poprzedniej strony';
}
function rememberRoute(commit=false) {
  if(!currentEntry)return;
  const viewport=$('.map-viewport'),sidebar=$('.zone-sidebar>nav');
  currentEntry={...currentEntry,scroll:window.scrollY,mapScroll:[viewport?.scrollLeft??0,viewport?.scrollTop??0],sidebarScroll:sidebar?.scrollTop??0,local:{buildTab:state.buildTab,savedQuery:state.savedQuery,journalFilter:state.journalFilter}};
  routeMemory.set(currentEntry.key,currentEntry);
  if(routeMemory.size>100)routeMemory.delete(routeMemory.keys().next().value);
  if(commit)history.replaceState({...history.state,roseNav:currentEntry},'',currentRoute);
}
function backLink(fallback) {
  const from=currentEntry?.from;
  return `<a class="back-link" data-nav-back href="${e(from?.hash??fallback)}">${icon('back')} Wróć do ${e(from?.label??'wyników')}</a>`;
}
function navigate() {
  const incoming=history.state?.roseNav;
  if(currentEntry&&incoming?.key===currentEntry.key&&currentRoute===location.hash)return;
  rememberRoute();clearTimeout(queryTimer);document.body.classList.remove('menu-open');
  currentEntry=(incoming&&incoming.key!==currentEntry?.key?routeMemory.get(incoming.key)??incoming:null)??{key:makeId(),from:null,scroll:0};
  currentRoute=location.hash||'#/home';
  state={...state,...currentEntry.local,...readRoute(currentRoute)};mapZoom=state.zoom;
  if(state.view==='map'&&!state.zone)state.zone=selectedZone(allZones(),state)?.name??'';
  syncFilters();
  render({focusHeading:true});
  const entryKey=currentEntry.key,restore=currentEntry;
  requestAnimationFrame(()=>{
    if(currentEntry.key!==entryKey)return;
    window.scrollTo(0,restore.scroll??0);
    const viewport=$('.map-viewport'),sidebar=$('.zone-sidebar>nav');
    if(viewport){viewport.scrollLeft=restore.mapScroll?.[0]??0;viewport.scrollTop=restore.mapScroll?.[1]??0;}
    if(sidebar)sidebar.scrollTop=restore.sidebarScroll??0;
  });
  if(state.view==='build'&&state.sharedBuild)receiveShared(state.sharedBuild);
}
function syncFilters() {
  currentRoute=routeHash({...state,zoom:mapZoom});
  history.replaceState({...history.state,roseNav:currentEntry},'',currentRoute);
  lastRoutes.set(state.view,currentRoute);
  const activeLink=$('.nav-link[aria-current="page"]');
  if(activeLink&&['home','drops','atlas','map','build','saved','journal','guide'].includes(state.view))activeLink.setAttribute('href',currentRoute);
}
function navigateTo(hash) {
  if(hash===currentRoute)return;
  rememberRoute(true);
  const entry={key:makeId(),from:currentEntry?{key:currentEntry.key,hash:currentRoute,label:routeLabel()}:null,scroll:0};
  history.pushState({roseNav:entry},'',hash);navigate();
}
function go(route) {navigateTo(`#/${route}`);}

function dialog(title,body,buttons) {
  const el=$('#dialog');el.innerHTML=`<div class="dialog-top"><h2 id="dialog-title">${e(title)}</h2><button class="icon-button" data-action="close-dialog" aria-label="Zamknij">${icon('close')}</button></div><div class="dialog-body">${body}</div><div class="dialog-actions">${buttons}</div>`;
  if(!el.open)el.showModal();
}
function openPortrait(id,screenshot=false) {
  const monster=index.monsters.get(id),entry=visualData().monsters[id];
  const appearance=screenshot?(entry?.officialScreenshot??entry):entry;
  if(!monster||!appearance?.image)return;
  const label=appearance.origin==='official-screenshot'?'Oficjalny zrzut z gry':'Podgląd oryginalnego modelu z gry';
  dialog(monster.name,`<figure class="appearance-viewer">${monsterImage(monster,'expanded-portrait',appearance)}<figcaption>${label}${appearance.date?` · ${date(appearance.date)}`:''}</figcaption></figure><p class="appearance-note">${e(appearance.note??'Oryginalny model i tekstury z klienta ROSE Online Global, pokazane w osobnym podglądzie. Oświetlenie i efekty podczas rozgrywki mogą wyglądać inaczej.')}</p><details class="source-details"><summary>Źródło wizerunku</summary><p>${e(appearance.author??'ROSE Online / Rednim Games')}. <a href="${e(appearance.sourceUrl)}" target="_blank" rel="noopener noreferrer">Otwórz materiał źródłowy ${icon('external')}</a></p>${appearance.originalImage?`<a class="text-link" href="./${e(appearance.originalImage)}" target="_blank" rel="noopener noreferrer">Pełny oryginalny zrzut ${icon('external')}</a>`:''}</details>`,`${entry.officialScreenshot?`<button class="btn secondary" data-action="portrait" data-id="${e(id)}" data-view="${screenshot?'model':'screenshot'}">${screenshot?'Pokaż model':'Zobacz zrzut z gry'}</button>`:''}<button class="btn primary" data-action="close-dialog">Wróć do bossa</button>`);
}
function confirmAction(title,message,fn,label='Potwierdź') {
  pendingAction=fn;dialog(title,`<p>${e(message)}</p>`,`<button class="btn secondary" data-action="close-dialog">Anuluj</button><button class="btn primary" data-action="confirm">${e(label)}</button>`);
}
function replaceDraft(next,success) {
  const apply=()=>{clearTimeout(autoSaveTimer);draft=structuredClone(next);dirty=draftNeedsSave(draft,library.builds);persist({...library,draft});state.buildTab='stats';go('build');render();if(success)toast(success);};
  if(dirty)confirmAction('Zastąpić bieżący szkic?','Masz zmiany w otwartym buildzie. Zapisz je jako build, jeśli chcesz zachować je w kolekcji.',apply,'Otwórz nowy szkic');else apply();
}
function download(value,name) {
  const url=URL.createObjectURL(new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type:'application/json;charset=utf-8'}));
  const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function share(build) {
  try {
    const url=new URL(location.href);url.search='';url.hash=`/build?data=${encodeBuild(build)}`;
    try {await navigator.clipboard.writeText(url.href);toast('Link do buildu skopiowany. Zawiera też jego notatki.');}
    catch {dialog('Link do twojego buildu',`<p>Skopiuj link. Odbiorca zobaczy konfigurację i notatki.</p><label for="share-link">Link</label><textarea id="share-link" readonly rows="5">${e(url.href)}</textarea>`,`<button class="btn primary" data-action="close-dialog">Gotowe</button>`);$('#share-link').select();}
  }catch(error){toast(error.message,true);}
}
function receiveShared(encoded) {
  try {const received=decodeBuild(encoded);replaceDraft(received,'Otworzono udostępnioną konfigurację. Zapisz ją, aby dodać do kolekcji.');}
  catch(error){toast(error.message,true);}
}

async function action(name,el) {
  const id=el.dataset.id,kind=el.dataset.kind;
  if(name==='portrait'){openPortrait(id,el.dataset.view==='screenshot');return;}
  if(name==='map-marker'){const view=currentMapView(),marker=view.markers.find(p=>p.id===el.dataset.marker);if(!marker||!view.groups.some(g=>g.monsterId===marker.monsterId))return;state.mapMarker=marker.id;state.showMarkers=true;syncFilters();render();return;}
  if(name==='map-king'){if(!currentMapView().groups.some(g=>g.monsterId===id))return;state.mapKing=state.mapKing===id?'':id;state.mapMarker='';state.showMarkers=true;syncFilters();render();return;}
  if(name==='map-variant'){state.mapVariant=el.dataset.variant;state.mapMarker='';state.mapLayer='terrain';mapZoom=1;syncFilters();render();return;}
  if(name==='map-layer'){state.mapLayer=el.dataset.layer==='archive'?'archive':'terrain';state.mapMarker='';syncFilters();render();return;}
  if(name==='map-clear-query'){state.mapQ='';syncFilters();render();$('#map-query')?.focus();return;}
  if(name==='map-zoom'||name==='map-reset'){mapZoom=name==='map-reset'?1:Math.max(1,Math.min(3,mapZoom+Number(el.dataset.step)));const stage=$('#world-map-stage');if(stage)stage.style.setProperty('--map-zoom',mapZoom);if($('#map-scale'))$('#map-scale').textContent=`${Math.round(mapZoom*100)}%`;syncFilters();return;}
  if(name==='pick-gear'){openGearPicker(el.dataset.slot);return;}
  if(name==='choose-gear'){const item=index.items.get(id);if(!item||slotFor(item.type)!==pickerSlot)return;draft.gear[pickerSlot]=item.name;scheduleDraft();$('#dialog').close();render();toast(`Założono: ${item.name}. Zapisz build, aby zachować konfigurację.`);return;}
  if(name==='clear-gear'){draft.gear[el.dataset.slot]='';scheduleDraft();render();return;}
  if(name==='skill-category'){skillCategory=el.dataset.category;render();return;}
  if(name==='catalog-skill'){const skill=visualData().skills.find(s=>s.id===el.dataset.skill&&s.jobs.includes(draft.job));if(!skill)return;if(draft.skills.some(s=>s.catalogId===skill.id)){toast('Ten skill jest już na twojej liście. Rangę zmienisz w planie powyżej.');return;}if(draft.skills.length>=80){toast('Limit: 80 umiejętności.',true);return;}draft.skills.push({id:makeId(),name:skill.name,catalogId:skill.id,rank:1,note:''});scheduleDraft();render();toast(`Dodano ${skill.name} do planu.`);return;}
  if(name==='menu'){document.body.classList.toggle('menu-open');return;}
  if(name==='close-dialog'){$('#dialog').close();pendingAction=null;return;}
  if(name==='confirm'){const fn=pendingAction;pendingAction=null;$('#dialog').close();fn?.();return;}
  if(name==='clear-filters'){clearTimeout(queryTimer);state={...state,q:'',planet:'',type:'',kind:'',page:1,onlyDrops:true,officialOnly:false,knownLocation:false};syncFilters();render();return;}
  if(name==='planet'){clearTimeout(queryTimer);state.planet=el.dataset.planet;state.page=1;syncFilters();render();return;}
  if(name==='page'){state.page=Math.max(1,Number(el.dataset.page));syncFilters();render();$('#main').scrollIntoView({behavior:'smooth',block:'start'});return;}
  if(name==='pin') {
    const next=structuredClone(library),existing=target(kind,id);
    if(existing)next.targets=next.targets.filter(t=>!(t.kind===kind&&t.id===id));else next.targets.push({kind,id,done:false,notes:'',killedAt:null});
    if(persist(next,existing?'Usunięto cel z planu.':'Dodano do planu farmienia.'))render();return;
  }
  if(name==='kill'||name==='clear-kill') {
    const next=structuredClone(library);let t=next.targets.find(t=>t.kind==='monster'&&t.id===id);
    if(!t){t={kind:'monster',id,done:false,notes:'',killedAt:null};next.targets.push(t);}t.killedAt=name==='kill'?Date.now():null;
    if(persist(next,name==='kill'?'Zapisano twoją obserwację zabicia.':'Usunięto czas zabicia.'))render();return;
  }
  if(name==='journal-filter'){state.journalFilter=el.dataset.filter;render();return;}
  if(name==='build-tab'){state.buildTab=el.dataset.tab;render();return;}
  if(name==='job'){draft.job=el.dataset.job;draft.archetype=TEMPLATES.find(t=>t.job===draft.job).id;scheduleDraft();render();return;}
  if(name==='stat-step'){const s=el.dataset.stat;draft.stats[s]=Math.max(0,Math.min(9999,(draft.stats[s]||0)+Number(el.dataset.step)));scheduleDraft();render();return;}
  if(name==='new-build'){replaceDraft(createBuild());return;}
  if(name==='save-build') {
    const errors=validateBuild(draft);if(errors.length){toast(errors.join(' '),true);return;}
    clearTimeout(autoSaveTimer);const saved=normalizeBuild({...draft,updatedAt:new Date().toISOString()});
    const next=structuredClone(library),i=next.builds.findIndex(b=>b.id===saved.id);if(i<0)next.builds.push(saved);else next.builds[i]=saved;
    next.draft=saved;if(persist(next,'Build zapisany. Znajdziesz go w Moich buildach.')){draft=structuredClone(saved);dirty=false;render();}return;
  }
  if(name==='load-build'){const b=library.builds.find(b=>b.id===id);if(b)replaceDraft(b);return;}
  if(name==='duplicate-build'){const b=library.builds.find(b=>b.id===id);if(!b)return;const now=new Date().toISOString(),copy={...structuredClone(b),id:makeId(),name:`${b.name.slice(0,65)} (kopia)`,createdAt:now,updatedAt:now};if(persist({...library,builds:[...library.builds,copy]},'Utworzono kopię buildu.'))render();return;}
  if(name==='delete-build'){const b=library.builds.find(b=>b.id===id);if(b)confirmAction('Usunąć zapisany build?',`„${b.name}” zostanie usunięty z kolekcji na tym urządzeniu.`,()=>{if(persist({...library,builds:library.builds.filter(x=>x.id!==id)},'Build usunięty.'))render();},'Usuń build');return;}
  if(name==='share-build'){await share(draft);return;}
  if(name==='share-saved'){const b=library.builds.find(b=>b.id===id);if(b)await share(b);return;}
  if(name==='export-build'){try{download({format:'rose-build',version:2,build:normalizeBuild(draft)},'rose-build.json');toast('Eksport buildu gotowy.');}catch(error){toast(error.message,true);}return;}
  if(name==='export-all'){download({...library,draft:validateBuild(draft??{}).length?library.draft:draft,exportedAt:new Date().toISOString()},`rose-companion-${new Date().toISOString().slice(0,10)}.json`);return;}
  if(name==='recovery'){let current=null,legacy=null;try{current=storage?.getItem(STORAGE_KEY);legacy=storage?.getItem(LEGACY_KEY);}catch{}download({format:'rose-recovery',current,legacy,error:storageError},'rose-kopia-ratunkowa.json');return;}
  if(name==='import'){$('#import-file')?.click();return;}
  if(name==='equip'){const item=index.items.get(id);if(!item)return;draft??=createBuild();draft.gear[slotFor(item.type)]=item.name;state.buildTab='gear';scheduleDraft();go('build');toast(`Dodano ${item.name} do szkicu buildu.`);return;}
  if(name==='add-skill'||name==='known-skill'){if(draft.skills.length>=80){toast('Limit: 80 umiejętności.',true);return;}draft.skills.push({id:makeId(),name:el.dataset.name??'Nowa umiejętność',rank:1,note:''});scheduleDraft();render();document.getElementById(`skill-name-${draft.skills.length-1}`)?.focus();return;}
  if(name==='remove-skill'){draft.skills.splice(Number(el.dataset.index),1);scheduleDraft();render();}
}

document.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#/"]');
  if(link&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey&&event.button===0&&link.target!=='_blank'){event.preventDefault();if(link.hasAttribute('data-nav-back')&&currentEntry?.from){rememberRoute(true);history.back();}else navigateTo(link.getAttribute('href'));return;}
  if(event.target.closest('.skip-link')){event.preventDefault();$('#main')?.focus();return;}
  const button=event.target.closest('[data-action]');if(button){event.preventDefault();action(button.dataset.action,button).catch(error=>toast(`Nie udało się wykonać akcji: ${error.message}`,true));}
});
document.addEventListener('error',event=>{const img=event.target;if(img instanceof HTMLImageElement&&img.classList.contains('skill-icon')){const fallback=document.createElement('span');fallback.className='skill-icon-fallback';fallback.textContent='Brak ikony';fallback.title=`Niedostępna ikona: ${img.alt}`;fallback.setAttribute('aria-label',fallback.title);img.replaceWith(fallback);}},true);
document.addEventListener('submit',event=>{
  if(['global-search-form','hero-search-form'].includes(event.target.id)){event.preventDefault();const q=new FormData(event.target).get('q')?.trim()??'';if(q)go(`drops?q=${encodeURIComponent(q)}`);}
  if(event.target.id==='penalty-form'){event.preventDefault();const p=Number($('#player-level').value),m=Number($('#monster-level').value),penalty=dropPenalty(p,m);$('#penalty-result').textContent=penalty===null?'Wpisz poprawne poziomy.':`${penalty}% kary do szansy dropu${p>m?` · przewaga ${p-m} poziomów`:''}. To nie szansa na konkretny item.`;}
});
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.id==='gear-picker-query'){pickerQuery=el.value;$('#gear-picker-results').innerHTML=gearPickerRows();}
  if(el.id==='skill-query'){skillQuery=el.value;render();}
  if(el.id==='map-query'){state.mapQ=el.value;syncFilters();render();}
  if(el.matches('[data-query]')){state.q=el.value;state.page=1;syncFilters();clearTimeout(queryTimer);queryTimer=setTimeout(()=>render(),140);}
  if(el.matches('[data-detail-query]')){state.detailQ=el.value;state.page=1;syncFilters();clearTimeout(queryTimer);queryTimer=setTimeout(()=>render(),140);}
  if(el.id==='saved-query'){state.savedQuery=el.value;render();}
  if(el.matches('[data-build-field]')){draft[el.dataset.buildField]=el.type==='number'?Number(el.value):el.value;scheduleDraft();}
  if(el.matches('[data-stat]')){draft.stats[el.dataset.stat]=Number(el.value);scheduleDraft();}
  if(el.matches('[data-gear]')){draft.gear[el.dataset.gear]=el.value;scheduleDraft();}
  if(el.matches('[data-target-notes]')){const next=structuredClone(library),t=next.targets.find(t=>t.kind===el.dataset.kind&&t.id===el.dataset.id);if(t){t.notes=el.value;persist(next);}}
  if(el.matches('[data-skill-index]')){const field=el.dataset.skillField;if(field==='name')delete draft.skills[Number(el.dataset.skillIndex)].catalogId;draft.skills[Number(el.dataset.skillIndex)][field]=field==='rank'?Number(el.value):el.value;scheduleDraft();}
});
document.addEventListener('change',async event=>{
  const el=event.target;
  if(el.id==='map-king-filter'){state.mapKing=el.value;state.mapMarker='';state.showMarkers=true;syncFilters();render();return;}
  if(el.id==='map-show-markers'){state.showMarkers=el.checked;if(!el.checked)state.mapMarker='';syncFilters();render();return;}
  if(el.id==='map-zone'&&el.value){navigateTo(mapRoute(el.value,{planet:state.planet,mapQ:state.mapQ}));return;}
  if(el.matches('[data-filter]')){clearTimeout(queryTimer);state[el.dataset.filter]=el.type==='checkbox'?el.checked:el.value;state.page=1;syncFilters();render();}
  if(el.matches('[data-target-done]')){const next=structuredClone(library),t=next.targets.find(t=>t.kind===el.dataset.kind&&t.id===el.dataset.id);if(t){t.done=el.checked;if(persist(next))render();}}
  if(el.id==='import-file'&&el.files[0]){try{const file=el.files[0];if(file.size>2_000_000)throw new Error('Maksymalny rozmiar kopii: 2 MB.');const incoming=parseImport(await file.text());const merged=mergeLibraries(library,incoming);if(persist(merged,`Import zakończony: ${incoming.builds.length} buildów i ${incoming.targets.length} celów. Istniejące zapisy zachowano.`))render();}catch(error){toast(`Import przerwany: ${error.message}`,true);}finally{el.value='';}}
});
setInterval(()=>{
  if(state.view!=='journal'||!library||!index)return;
  document.querySelectorAll('[data-timer]').forEach(el=>{
    const t=target('monster',el.dataset.timer),m=index.monsters.get(el.dataset.timer);
    const timer=timerState(t?.killedAt,m?.respawn);if(!timer)return;
    el.textContent=timer.phase==='waiting'?`Okno odrodzenia za ok. ${timer.minutes} min`:timer.phase==='window'?`Trwa możliwe okno odrodzenia (do ${timer.minutes} min)`:'Przedział minął — sprawdź w grze';
  });
},15000);
window.addEventListener('hashchange',navigate);
window.addEventListener('popstate',navigate);
window.addEventListener('pagehide',()=>{rememberRoute(true);flushDraft();});
window.addEventListener('beforeunload',flushDraft);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){rememberRoute(true);flushDraft();}});
window.addEventListener('storage',event=>{if(event.key!==STORAGE_KEY||!event.newValue)return;try{const result=loadLibrary(storage);if(!result.error){library=result.library;render();toast('Zaktualizowano kolekcję po zmianie w drugiej karcie.');}}catch{}});

async function start() {
  try {
    try{storage=window.localStorage;const result=loadLibrary(storage);library=result.library;storageError=result.error;}
    catch{storageError='Pamięć przeglądarki jest niedostępna.';library={version:2,builds:[],targets:[],draft:null,migratedLegacy:false};}
    const response=await fetch('./data/catalog.json');if(!response.ok)throw new Error(`Baza danych: HTTP ${response.status}`);
    data=await response.json();
    const [visualResponse,worldResponse,spawnResponse]=await Promise.all([fetch('./data/visuals.json'),fetch('./data/world.json'),fetch('./data/spawns.json')]);
    if(!visualResponse.ok||!worldResponse.ok||!spawnResponse.ok)throw new Error('Nie udało się wczytać ikon, map i miejsc występowania Kingów.');
    setVisuals(await visualResponse.json(),await worldResponse.json());spawns=await spawnResponse.json();
    data={...data,monsters:withClientSpawnLocations(data.monsters,visualData().maps,spawns)};index=indexCatalog(data);
    draft=library.draft?structuredClone(library.draft):null;dirty=draftNeedsSave(draft,library.builds);
    const legacyLink=new URL(location.href).searchParams.get('build');navigate();
    if(legacyLink){history.replaceState(null,'',`${location.pathname}#/build`);state.view='build';render();receiveShared(legacyLink);}
    if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});let refreshed=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshed){refreshed=true;toast('Wersja offline gotowa. Nową wersję zobaczysz po odświeżeniu.');}});}
  }catch(error){$('#app').innerHTML=`<main class="loading-shell"><h1>Nie udało się otworzyć atlasu</h1><p>${e(error.message)}</p><p>Sprawdź połączenie i odśwież stronę. Twoje lokalne zapisy pozostały nienaruszone.</p><button class="btn primary" id="retry">Spróbuj ponownie</button></main>`;$('#retry').onclick=()=>location.reload();}
}
start();
