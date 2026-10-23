import { VERSION, CHECKED, CLASSES, JOBS, STATS, STAT_LABELS, SLOTS, TYPES, KINDS, PLANETS, SOURCES, TEMPLATES, SKILL_FACTS, GUIDES } from './content.js';
import { STORAGE_KEY, LEGACY_KEY, escapeHTML as e, normalizeText, makeId, createBuild, normalizeBuild, validateBuild, draftNeedsSave, loadLibrary, saveLibrary, parseImport, mergeLibraries, encodeBuild, decodeBuild, dropPenalty, timerState, indexCatalog, filterItems, filterMonsters } from './core.js';
import { icon, itemSymbol, isOfficial, sourceLink, tag, empty, planetOptions, pageHead, slotFor } from './ui.js';

const $ = selector => document.querySelector(selector);
const number = n => new Intl.NumberFormat('pl-PL').format(n);
const date = value => new Date(value).toLocaleDateString('pl-PL');
const PAGE_SIZE=24;
let data,index,library,draft,storageError=null,dirty=false,storage;
let state={view:'home',id:null,q:'',planet:'',kind:'kings',type:'',onlyDrops:true,officialOnly:false,knownLocation:false,page:1,detailQ:'',buildTab:'stats',savedQuery:'',journalFilter:'all'};
let toastTimer,queryTimer,autoSaveTimer,pendingAction;

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
  const links=[['home','home','Twoja przygoda'],['drops','diamond','Gdzie dropi?'],['atlas','crown','Kingi i potwory'],['build','sword','Kreator buildu'],['saved','book','Moje buildy'],['journal','bookmark','Plan farmienia'],['guide','spark','Poradnik i źródła']];
  const active=state.view==='item'?'drops':state.view==='monster'?'atlas':state.view;
  return `<button class="sidebar-backdrop" aria-label="Zamknij menu" data-action="menu"></button>
  <aside class="sidebar"><a href="#/home" class="brand" aria-label="ROSE Companion — strona główna"><span class="brand-mark">${icon('spark')}</span><span><strong>ROSE</strong><small>COMPANION</small></span></a>
    <div class="sidebar-label">TWÓJ ŚWIAT. TWOJA PRZYGODA.</div><nav aria-label="Menu główne">${links.map(([route,symbol,label])=>`<a href="#/${route}" class="nav-link ${active===route?'active':''}" ${active===route?'aria-current="page"':''}>${icon(symbol)}<span>${label}</span>${route==='saved'?`<span class="nav-count">${library.builds.length}</span>`:route==='journal'&&library.targets.length?`<span class="nav-count">${library.targets.filter(t=>!t.done).length}</span>`:''}</a>`).join('')}</nav>
    <div class="sidebar-bottom"><div class="world-status"><i></i> ROSE ONLINE GLOBAL</div><p>Fanowski niezbędnik gracza.<br>Przygoda zaczyna się tutaj.</p><a href="https://www.roseonlinegame.com/" target="_blank" rel="noopener noreferrer">Oficjalna strona gry ${icon('external')}</a><div class="version">v${VERSION} · dane ${date(CHECKED)}</div></div>
  </aside><div class="workspace"><header class="topbar"><button class="icon-button mobile-menu" data-action="menu" aria-label="Otwórz menu">${icon('menu')}</button><div class="breadcrumbs">Niezbędnik gracza <span>/</span> <strong>${e(links.find(l=>l[0]===active)?.[2]??'Atlas')}</strong></div><form id="global-search-form" class="top-search" role="search"><label class="sr-only" for="global-search">Szukaj w całej bazie</label>${icon('search')}<input id="global-search" name="q" type="search" placeholder="Szukaj przedmiotu lub Kinga…" autocomplete="off"><button type="submit" aria-label="Szukaj">${icon('arrow')}</button></form><a href="#/guide" class="patch-pill"><span></span> Patch 16.10.2026</a></header>
    <main id="main" tabindex="-1" class="main-content">${storageError?`<div class="notice error">${icon('info')}<div><strong>Nie można odczytać zapisów.</strong> Oryginał pozostał nienaruszony. <button class="text-button" data-action="recovery">Pobierz kopię ratunkową</button></div></div>`:''}${content}</main>
    <footer class="site-footer"><span>Stworzone dla podróżników po świecie ROSE.</span><span>Nieoficjalna aplikacja · <a href="#/guide">Źródła i zakres danych</a> · <a href="https://github.com/Abeel87/rose-builds" target="_blank" rel="noopener noreferrer">GitHub ${icon('external')}</a></span></footer></div>`;
}

function home() {
  const kings=data.monsters.filter(m=>['king','wandering','event'].includes(m.kind));
  const useful=['17523','8178','17715','17729'].map(id=>index.items.get(id)).filter(Boolean);
  return `<section class="hero"><img src="./assets/junon-dawn.png" alt="" width="2048" height="683" fetchpriority="high"><div class="hero-shade"></div><div class="hero-content"><span class="hero-eyebrow">WITAJ, PODRÓŻNIKU ${icon('spark')}</span><h1>Wielki świat.<br>Twój plan na przygodę.</h1><p>Znajdź swój drop. Wytrop Kinga.<br>Zbuduj postać, którą chcesz grać.</p><div class="hero-actions"><a class="btn gold" href="#/drops">${icon('search')}Znajdź drop</a><a class="btn glass" href="#/build">Stwórz build ${icon('arrow')}</a></div></div><span class="hero-caption">ILUSTRACJA INSPIROWANA ŚWIATEM ROSE</span></section>
  <div class="stats-strip"><a href="#/drops"><span class="stat-icon gold-tint">${icon('diamond')}</span><div><strong>${number(index.droppedBy.size)}</strong><span>przedmiotów z dropem</span></div>${icon('arrow')}</a><a href="#/atlas?kind=all"><span class="stat-icon mint-tint">${icon('eye')}</span><div><strong>${number(data.monsters.length)}</strong><span>potworów w bazie</span></div>${icon('arrow')}</a><a href="#/atlas"><span class="stat-icon violet-tint">${icon('crown')}</span><div><strong>${kings.length}</strong><span>Kingów i wydarzeń</span></div>${icon('arrow')}</a><a href="#/saved"><span class="stat-icon blue-tint">${icon('book')}</span><div><strong>${library.builds.length.toString().padStart(2,'0')}</strong><span>twoich buildów</span></div>${icon('arrow')}</a></div>
  <section class="home-search panel"><div><span class="eyebrow">OD PRZEDMIOTU DO MIEJSCA</span><h2>Czego dziś szukasz?</h2></div><form id="hero-search-form" class="search-field">${icon('search')}<label class="sr-only" for="hero-search">Nazwa przedmiotu, potwora lub mapy</label><input id="hero-search" name="q" placeholder="np. Rift Boomer, Plutorune, Golden Ring…" type="search" required><button class="btn primary" type="submit">Szukaj ${icon('arrow')}</button></form><div class="quick-search"><span>Na początek:</span>${['Rift Boomer','Plutorune','Effigy','Ulverick'].map(q=>`<a href="#/drops?q=${encodeURIComponent(q)}">${e(q)}</a>`).join('')}</div></section>
  <section><div class="section-heading"><div><span class="eyebrow">CZTERY PLANETY. SETKI CELÓW.</span><h2>Wybierz kierunek wyprawy</h2></div><a class="text-link" href="#/atlas">Otwórz atlas ${icon('arrow')}</a></div><div class="planet-grid">${PLANETS.map((p,i)=>`<a href="#/atlas?planet=${p.name}" class="planet-card ${p.color}"><span class="planet-number">0${i+1}</span><span class="planet-orb">${icon(p.symbol)}</span><div><h3>${p.name}</h3><p>${p.subtitle}</p></div>${icon('arrow')}</a>`).join('')}</div></section>
  <div class="home-columns"><section class="panel"><div class="section-heading compact"><div><span class="eyebrow">NA TROPIE KINGÓW</span><h2>Wyprawa na Orlo</h2></div>${tag('LV. 250','gold-tag')}</div><div class="king-preview-list">${['2207','2226','2254'].map(id=>monsterRow(index.monsters.get(id),true)).join('')}</div><a class="panel-footer-link" href="#/atlas?planet=Orlo">Zobacz Kingów na Orlo ${icon('arrow')}</a></section><section class="panel"><div class="section-heading compact"><div><span class="eyebrow">WARTO MIEĆ NA OKU</span><h2>Cele do twojego plecaka</h2></div>${icon('bag')}</div>${useful.map(i=>`<div class="loot-preview">${itemSymbol(i)}<a href="#/item/${i.id}"><strong>${e(i.name)}</strong><small>${number(index.droppedBy.get(i.id)?.length??0)} źródeł w katalogu</small></a>${pinButton('item',i.id)}</div>`).join('')}<a class="panel-footer-link" href="#/drops">Przeglądaj dropy ${icon('arrow')}</a></section></div>
  <div class="bottom-callout"><span class="callout-icon">${icon('sword')}</span><div><h2>Dobry build jest początkiem.</h2><p>Zaplanuj staty, sprzęt i umiejętności. Zapisz je na kolejną wyprawę.</p></div><button class="btn primary" data-action="new-build">Nowy build ${icon('plus')}</button></div>
  <p class="data-footnote">${icon('info')} Katalog społecznościowy z oznaczonymi poprawkami z oficjalnych patchy. Pełne tabele i lokalizacje nie są dostępne dla każdego potwora.</p>`;
}

function monsterRow(m,compact=false) {
  const place=m.locations[0];
  return `<article class="monster-row"><span class="monster-emblem ${m.kind==='event'?'event':''}">${icon(m.kind==='monster'?'eye':'crown')}</span><div class="monster-row-main"><a href="#/monster/${e(m.id)}"><strong>${e(m.name)}</strong></a><small>${icon('pin')}${e(place?.zone??'Trasa do potwierdzenia')}${!compact&&place?` · ${place.planet}`:''}</small></div><span class="level-label">${m.level?`Lv. ${m.level}`:'Event'}</span>${compact?`<a class="icon-button" href="#/monster/${e(m.id)}" aria-label="Szczegóły ${e(m.name)}">${icon('arrow')}</a>`:pinButton('monster',m.id)}</article>`;
}
function monsterCard(m) {
  const officialLocation=m.locations.find(l=>isOfficial(l.source));
  const highlights=[...Object.keys(m.officialDrops),...m.drops.filter(id=>['8178','17715'].includes(id))].filter((id,i,a)=>a.indexOf(id)===i).slice(0,3);
  return `<article class="monster-card panel"><div class="card-top"><span class="monster-emblem">${icon(m.kind==='monster'?'eye':'crown')}</span><div class="card-badges">${tag(KINDS[m.kind],m.kind==='wandering'?'violet-tag':'')}${m.level?tag(`Lv. ${m.level}`,'gold-tag'):''}</div>${pinButton('monster',m.id)}</div><h3><a href="#/monster/${e(m.id)}">${e(m.name)}</a></h3><p class="card-location">${icon('pin')}${e(m.locations.map(l=>l.zone).join(' / ')||'BRAK POTWIERDZONEJ LOKALIZACJI')}</p><div class="card-loot">${highlights.length?highlights.map(id=>`<a href="#/item/${e(id)}">${icon('diamond')}${e(index.items.get(id)?.name)}</a>`).join(''):`<span>${m.drops.length?`${m.drops.length} przedmiotów na liście dropów`:'Tabela dropów do uzupełnienia'}</span>`}</div><div class="card-bottom">${sourceLink(officialLocation?.source??m.source)}<a class="text-link" href="#/monster/${e(m.id)}">Szczegóły ${icon('arrow')}</a></div></article>`;
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
  return `${pageHead('WYSZUKIWARKA DROPÓW','Gdzie to dropi?','Od przedmiotu do potwora i miejsca farmienia — w jednej wyszukiwarce.',`<a class="btn secondary" href="#/journal">${icon('bookmark')}Mój plan farmienia</a>`)}
  <div class="filter-bar panel"><div class="search-field">${icon('search')}<label class="sr-only" for="drop-query">Szukaj przedmiotu, potwora lub mapy</label><input id="drop-query" data-query type="search" value="${e(state.q)}" placeholder="Przedmiot, potwór lub mapa…"></div><label class="filter-select">Kategoria<select id="type-filter" data-filter="type"><option value="">Wszystkie przedmioty</option>${Object.entries(TYPES).map(([key,label])=>`<option value="${key}" ${state.type===key?'selected':''}>${label}</option>`).join('')}</select></label><label class="filter-select">Planeta<select id="planet-filter" data-filter="planet">${planetOptions(state.planet)}</select></label></div>
  <div class="filter-options"><label class="checkbox-label"><input type="checkbox" data-filter="onlyDrops" ${state.onlyDrops?'checked':''}>Tylko przedmioty ze źródłem dropu</label><label class="checkbox-label"><input type="checkbox" data-filter="officialOnly" ${state.officialOnly?'checked':''}>Tylko dropy potwierdzone w patchach</label><button class="text-button" data-action="clear-filters">Wyczyść filtry</button></div>
  ${matchedMonsters.length?`<section class="related-monsters"><span class="eyebrow">PASUJĄCE POTWORY I BOSSY</span><div>${matchedMonsters.map(m=>`<a href="#/monster/${e(m.id)}">${icon('crown')}${e(m.name)}${icon('arrow')}</a>`).join('')}</div></section>`:''}
  <div class="result-summary"><span><strong>${number(rows.length)}</strong> przedmiotów</span><span>${state.onlyDrops?'Lista możliwych dropów':'Pełny katalog — dostępność części przedmiotów niepotwierdzona'}</span></div>
  <section class="panel item-list">${slice(rows).map(i=>itemRow(i)).join('')||empty('Nie znaleziono przedmiotu','Zmień nazwę lub filtry. Brak wyniku oznacza brak danych w tej bazie, nie brak dropu w grze.',`<button class="btn secondary" data-action="clear-filters">Wyczyść filtry</button>`)}</section>${pagination(rows.length)}
  <p class="data-footnote">${icon('info')} Lista nie podaje zmyślonych procentów. Brak podanej szansy nie oznacza 0% ani gwarantowanego dropu.</p>`;
}

function monsterDetail() {
  const m=index.monsters.get(state.id);
  if(!m)return empty('Nie ma takiego potwora w katalogu','Wpis mógł zostać zmieniony.',`<a class="btn primary" href="#/atlas">Wróć do atlasu</a>`);
  const loot=m.drops.map(id=>index.items.get(id)).filter(i=>normalizeText(i.name).includes(normalizeText(state.detailQ))).sort((a,b)=>(m.officialDrops[b.id]?1:0)-(m.officialDrops[a.id]?1:0)||a.name.localeCompare(b.name));
  const saved=target('monster',m.id);
  return `<a class="back-link" href="#/atlas">${icon('back')} Atlas Kingów i potworów</a><section class="detail-hero panel"><span class="detail-emblem">${icon(m.kind==='monster'?'eye':'crown')}</span><div><span class="eyebrow">${e(KINDS[m.kind])}${m.habitat==='clan'?' · CLAN FIELD / PVP':m.habitat==='dungeon'?' · DUNGEON':''}</span><h1 id="page-title" tabindex="-1">${e(m.name)}</h1><div class="detail-meta">${m.level?tag(`Poziom ${m.level}`,'gold-tag'):tag('Poziom do potwierdzenia')}${sourceLink(m.levelSource??m.source)}${tag(`${m.drops.length} możliwych dropów`)}</div></div><div class="heading-actions">${pinButton('monster',m.id,true)}<button class="btn primary" data-action="kill" data-id="${e(m.id)}">${icon('clock')}Zapisz zabicie</button></div></section>
  <div class="detail-columns"><section class="panel detail-info"><h2>${icon('pin')} Gdzie go znaleźć?</h2>${m.locations.length?m.locations.map(l=>`<div class="location-row"><span>${e(l.planet)}</span><a href="#/atlas?q=${encodeURIComponent(l.zone)}&kind=all">${e(l.zone)} ${icon('arrow')}</a>${sourceLink(l.source)}</div>`).join(''):`<p>BRAK POTWIERDZONYCH DANYCH o dokładnej lokalizacji.${m.planet?` Planeta: ${e(m.planet)}.`:''}</p>`}${m.note?`<p class="info-note">${e(m.note)}</p>${m.noteSource?sourceLink(m.noteSource):''}`:''}</section><section class="panel detail-info"><h2>${icon('clock')} Twoja obserwacja</h2><p>${saved?.killedAt?`Ostatnio zapisane zabicie: <strong>${new Date(saved.killedAt).toLocaleString('pl-PL')}</strong>.`:'Zapisz zabicie, aby wrócić do tej obserwacji w planie farmienia.'}</p>${m.respawn?`<div class="respawn-window"><strong>${m.respawn[0]}–${m.respawn[1]}</strong><span>minut · przedział odrodzenia</span></div>${sourceLink(m.respawnSource)}`:'<div class="muted-box">Czas odrodzenia: brak potwierdzonych danych.</div>'}<p class="small-note">To lokalny dziennik. Aplikacja nie odczytuje obecności bossa na serwerze.</p></section></div>
  ${m.rewards?.length?`<section class="panel rewards-panel"><h2>Nagrody powiązane z wydarzeniem</h2><p>Patch wymienia poniższe przedmioty. Nie potwierdza bezpośredniego dropu z tego bossa.</p>${m.rewards.map(id=>itemRow(index.items.get(id),'patch-october')).join('')}</section>`:''}
  <div class="section-heading"><div><span class="eyebrow">TABELA PRZEDMIOTÓW</span><h2>Co może wypaść?</h2></div><div class="search-field compact-search">${icon('search')}<label class="sr-only" for="detail-query">Szukaj w dropach tego potwora</label><input id="detail-query" data-detail-query type="search" value="${e(state.detailQ)}" placeholder="Filtruj przedmioty…"></div></div>
  <p class="small-note">${m.source==='community-drops'?'Migawka społecznościowa z osobno oznaczonymi poprawkami z patchy. ':''}Nie jest to gwarantowany loot. Procentowe szanse nie zostały potwierdzone.</p><section class="panel item-list">${slice(loot).map(i=>itemRow(i,m.officialDrops[i.id]??m.source)).join('')||empty(m.drops.length?'Brak pasujących przedmiotów':'Tabela dropów do uzupełnienia',m.drops.length?'Wyczyść filtr, aby zobaczyć całą listę.':'Sprawdź aktualną listę w Monster Inspector. Nagrody wydarzenia są opisane osobno.')}</section>${pagination(loot.length)}`;
}

function itemDetail() {
  const item=index.items.get(state.id);
  if(!item)return empty('Nie ma takiego przedmiotu','Wróć do katalogu i wyszukaj jego nazwę.',`<a class="btn primary" href="#/drops">Katalog dropów</a>`);
  const mobs=[...(index.droppedBy.get(item.id)??[])].sort((a,b)=>(b.officialDrops[item.id]?1:0)-(a.officialDrops[item.id]?1:0)||b.locations.length-a.locations.length||(a.level??0)-(b.level??0));
  const zoneDrops=data.zoneDrops.filter(z=>z.items.includes(item.id)),rewards=data.monsters.filter(m=>m.rewards?.includes(item.id));
  const fields={attack_power:'Atak',defense:'Obrona',magic_defense:'Obrona magiczna',dodge_rate:'Unik',movement_speed:'Szybkość ruchu',pvm_atk:'PvM offense',pvm_def:'PvM defense',pvp_atk:'PvP offense',pvp_def:'PvP defense'};
  return `<a class="back-link" href="#/drops">${icon('back')} Wyszukiwarka dropów</a><section class="detail-hero panel">${itemSymbol(item)}<div><span class="eyebrow">${e(TYPES[item.type]??item.type)}</span><h1 id="page-title" tabindex="-1">${e(item.name)}</h1><div class="detail-meta">${item.level?tag(`Wymagany Lv. ${item.level}`,'gold-tag'):''}${sourceLink(item.source??'community-drops')}</div></div><div class="heading-actions">${pinButton('item',item.id,true)}${slotFor(item.type)?`<button class="btn primary" data-action="equip" data-id="${e(item.id)}">${icon('sword')}Dodaj do buildu</button>`:''}</div></section>
  ${item.note?`<div class="notice">${icon('info')}<p>${e(item.note)}</p></div>`:''}
  ${item.stats||item.requirement?`<section class="panel item-properties"><h2>Parametry katalogowe</h2><div class="property-grid">${Object.entries(item.stats??{}).map(([key,value])=>`<div><span>${e(fields[key]??key)}</span><strong>${e(value)}${key.startsWith('pv')?'%':''}</strong></div>`).join('')}${item.requirement?`<div><span>Wymaganie</span><strong>${e(item.requirement.stat_name)} ${e(item.requirement.value)}</strong></div>`:''}</div><p class="small-note">Dane społecznościowe dla podstawowego przedmiotu. Nie obejmują refine, opcji ani pełnych bonusów postaci.</p></section>`:''}
  ${zoneDrops.length?`<section class="panel detail-info"><h2>${icon('pin')} Potwierdzone źródła mapowe</h2>${zoneDrops.map(z=>`<div class="location-row"><span>${e(z.planet)}</span><strong>${e(z.zone)}</strong><p>${e(z.note)}</p>${sourceLink(z.source)}</div>`).join('')}</section>`:''}
  ${rewards.length?`<section class="panel detail-info"><h2>Powiązane wydarzenie</h2><p>Źródło wymienia nagrodę wydarzenia, nie bezpośredni drop.</p>${rewards.map(m=>monsterRow(m)).join('')}</section>`:''}
  <div class="section-heading"><div><span class="eyebrow">SKĄD ZDOBYĆ</span><h2>Potwory z tym dropem <span class="count-badge">${mobs.length}</span></h2></div></div>
  <section class="panel source-table">${slice(mobs).map(m=>`<article class="drop-source-row"><div><a href="#/monster/${e(m.id)}"><strong>${e(m.name)}</strong></a><small>${e(m.locations.map(l=>`${l.planet} · ${l.zone}`).join(' / ')||'Lokalizacja do potwierdzenia')}${m.level?` · Lv. ${m.level}`:''}</small></div>${sourceLink(m.officialDrops[item.id]??m.source)}<a class="btn small" href="#/monster/${e(m.id)}">Zobacz ${icon('arrow')}</a></article>`).join('')||empty('Brak przypisanej tabeli potwora','Przedmiot może pochodzić z questu, craftingu, sklepu lub wydarzenia; baza nie potwierdza wszystkich źródeł.')}</section>${pagination(mobs.length)}<p class="data-footnote">${icon('info')} Przypisania społecznościowe wymagają sprawdzenia w grze. Nie znamy procentowej szansy na ten przedmiot.</p>`;
}

function builder() {
  draft??=library.draft?structuredClone(library.draft):createBuild();
  const template=TEMPLATES.find(t=>t.id===draft.archetype),known=SKILL_FACTS.filter(s=>s.job===draft.job);
  const tabs=[['stats','Statystyki'],['gear','Ekwipunek'],['skills','Umiejętności'],['notes','Notatki i rotacja']];
  let content='';
  if(state.buildTab==='stats') content=`<div class="pane-heading"><div><h2>Zaplanuj statystyki</h2><p>Wpisz własne wartości dla swojej postaci.</p></div><label class="filter-select">Znaczenie wartości<select data-build-field="statMode" id="stat-mode"><option value="target" ${draft.statMode==='target'?'selected':''}>Wartości docelowe</option><option value="allocation" ${draft.statMode==='allocation'?'selected':''}>Przydzielone punkty</option></select></label></div><div class="stat-input-grid">${STATS.map(s=>`<div class="stat-input-card"><label for="stat-${s}"><strong>${s}</strong><span>${STAT_LABELS[s]}</span></label><div class="number-stepper"><button type="button" data-action="stat-step" data-stat="${s}" data-step="-1" aria-label="Zmniejsz ${s}">−</button><input id="stat-${s}" type="number" min="0" max="9999" step="1" data-stat="${s}" value="${draft.stats[s]}"><button type="button" data-action="stat-step" data-stat="${s}" data-step="1" aria-label="Zwiększ ${s}">+</button></div></div>`).join('')}</div><div class="builder-info">${icon('info')}<p>To twój plan, bez automatycznego wyliczania puli punktów, kosztu statów i DPS. Pełne, aktualne formuły nie są potwierdzone w tej bazie.</p></div>`;
  if(state.buildTab==='gear') content=`<div class="pane-heading"><div><h2>Ekwipunek na twoją wyprawę</h2><p>Dodawaj przedmioty z katalogu lub zapisuj własne nazwy, refine i gemy.</p></div><a href="#/drops" class="text-link">Znajdź przedmiot ${icon('arrow')}</a></div><div class="gear-grid">${Object.entries(SLOTS).map(([slot,label])=>`<div class="gear-field"><span>${icon(slot==='Weapon'?'sword':slot==='Body'?'shield':'bag')}</span><div><label for="gear-${slot}">${label}</label><input id="gear-${slot}" data-gear="${slot}" value="${e(draft.gear[slot])}" maxlength="200" placeholder="Nazwa, refine, gem…">${draft.gear[slot]?`<a class="small-link" href="#/drops?q=${encodeURIComponent(draft.gear[slot].split(' +')[0])}">Sprawdź źródło dropu ${icon('external')}</a>`:''}</div></div>`).join('')}</div><p class="small-note">Własny wpis nie potwierdza zgodności przedmiotu z klasą lub poziomem. Wymagania sprawdź w grze.</p>`;
  if(state.buildTab==='skills') content=`<div class="pane-heading"><div><h2>Plan umiejętności</h2><p>Ułóż listę skilli i rang, które chcesz osiągnąć.</p></div><button class="btn secondary" data-action="add-skill">${icon('plus')}Dodaj skill</button></div><div class="skill-plan">${draft.skills.length?draft.skills.map((s,i)=>`<div class="skill-plan-row"><span class="skill-order">${i+1}</span><div><label class="sr-only" for="skill-name-${i}">Nazwa umiejętności ${i+1}</label><input id="skill-name-${i}" data-skill-index="${i}" data-skill-field="name" maxlength="100" value="${e(s.name)}" placeholder="Nazwa umiejętności"><label class="sr-only" for="skill-note-${i}">Notatka o umiejętności</label><input id="skill-note-${i}" class="subtle-input" data-skill-index="${i}" data-skill-field="note" maxlength="300" value="${e(s.note)}" placeholder="Priorytet, wymagania, zastosowanie…"></div><label class="rank-label" for="skill-rank-${i}">Ranga<input id="skill-rank-${i}" type="number" min="0" max="100" data-skill-index="${i}" data-skill-field="rank" value="${s.rank}"></label><button class="icon-button danger" data-action="remove-skill" data-index="${i}" aria-label="Usuń ${e(s.name)}">${icon('trash')}</button></div>`).join(''):empty('Twój plan umiejętności jest pusty','Dodaj skill, określ rangę i zapisz własny priorytet.',`<button class="btn primary" data-action="add-skill">Dodaj pierwszy skill</button>`)}</div><div class="builder-info">${icon('info')}<p>Rangi są twoimi wpisami. Nie potwierdzamy kosztów SP, maksymalnych rang ani wymaganych poprzedników. To plan umiejętności, nie zweryfikowany kalkulator drzewka.</p></div>${known.length?`<div class="skill-facts"><h3>Co potwierdzają aktualne patche?</h3>${known.map(s=>`<article><div><strong>${e(s.name)}</strong><p>${e(s.text)}</p>${sourceLink(s.source)}</div><button class="btn small" data-action="known-skill" data-name="${e(s.name)}">${icon('plus')}Do planu</button></article>`).join('')}</div>`:''}`;
  if(state.buildTab==='notes') content=`<div class="pane-heading"><div><h2>Twój pomysł na grę</h2><p>Zapisz rotację, priorytety rozwoju, cele i rzeczy do sprawdzenia.</p></div></div><label class="field-label" for="build-notes">Notatki i rotacja</label><textarea id="build-notes" data-build-field="notes" maxlength="5000" rows="12" placeholder="Cel: solo / farmienie / bossy…&#10;Rotacja: …&#10;Następny przedmiot: …&#10;Do sprawdzenia w grze: …">${e(draft.notes)}</textarea><p class="small-note">Notatki są częścią eksportowanego buildu i udostępnionego linku.</p>`;
  return `${pageHead('WARSZTAT POSTACI','Twój build. Twój styl.','Zaplanuj postać i zachowaj konfigurację na następną sesję.',`<button class="btn secondary" data-action="share-build">${icon('share')}Udostępnij</button><button class="btn primary" data-action="save-build">${icon('check')}Zapisz build</button>`)}
  <div class="builder-layout"><aside class="panel class-panel"><span class="eyebrow">WYBIERZ SWOJĄ ŚCIEŻKĘ</span>${Object.entries(CLASSES).map(([path,jobs])=>`<div class="class-family"><h3>${path}</h3><div>${jobs.map(job=>`<button class="class-choice ${draft.job===job?'active':''}" aria-pressed="${draft.job===job}" data-action="job" data-job="${job}">${icon(path==='Soldier'?'sword':path==='Muse'?'spark':path==='Hawker'?'leaf':'bag')}<span>${job}</span>${draft.job===job?icon('check'):''}</button>`).join('')}</div></div>`).join('')}<div class="class-panel-foot">${icon('shield')}Twój własny plan.<br>Zapis bez zakładania konta.</div></aside><section class="builder-main"><div class="panel build-identity"><div class="build-name-field"><label for="build-name">Nazwa buildu</label><input id="build-name" data-build-field="name" maxlength="80" value="${e(draft.name)}" required></div><div class="build-meta-fields"><label for="build-level">Poziom<input id="build-level" data-build-field="level" type="number" min="1" max="250" value="${draft.level}"></label><label for="build-role">Cel<select id="build-role" data-build-field="role">${['Farmienie','Solo','Bossy','Drużyna','Wsparcie','Tank','Crafting','PvP','Własny',...(!['Farmienie','Solo','Bossy','Drużyna','Wsparcie','Tank','Crafting','PvP','Własny'].includes(draft.role)?[draft.role]:[])].map(r=>`<option ${r===draft.role?'selected':''}>${e(r)}</option>`).join('')}</select></label><label for="build-archetype">Archetyp<select id="build-archetype" data-build-field="archetype">${TEMPLATES.filter(t=>t.job===draft.job).map(t=>`<option value="${t.id}" ${draft.archetype===t.id?'selected':''}>${e(t.name)}</option>`).join('')}</select></label></div><div class="draft-line"><span><i></i><span id="draft-status">${dirty?'Zmiany poza zapisaną kolekcją':'Własna konfiguracja'}</span></span><span>Archetyp: ${e(template?.weapon??draft.job)} · bez narzuconych statów</span></div></div><div class="panel build-workspace"><nav class="build-tabs" aria-label="Sekcje kreatora">${tabs.map(([key,label])=>`<button class="${state.buildTab===key?'active':''}" data-action="build-tab" data-tab="${key}" aria-pressed="${state.buildTab===key}">${label}${key==='skills'&&draft.skills.length?` <span>${draft.skills.length}</span>`:''}</button>`).join('')}</nav><div class="build-pane">${content}</div></div><div class="builder-actions"><button class="text-button" data-action="export-build">${icon('download')}Eksportuj ten build</button><button class="text-button" data-action="new-build">${icon('plus')}Zacznij nowy</button><a class="text-link" href="#/saved">Moje buildy ${icon('arrow')}</a></div></section></div>`;
}

function savedBuilds() {
  const rows=library.builds.filter(b=>normalizeText(`${b.name} ${b.job} ${b.role}`).includes(normalizeText(state.savedQuery)));
  return `${pageHead('TWOJA KOLEKCJA','Moje buildy','Zapisane na tym urządzeniu. Eksportuj kopię, aby przenieść je na inny komputer.',`<button class="btn secondary" data-action="import">${icon('upload')}Importuj</button><button class="btn secondary" data-action="export-all">${icon('download')}Kopia danych</button><button class="btn primary" data-action="new-build">${icon('plus')}Nowy build</button>`)}<input type="file" id="import-file" accept="application/json,.json" hidden>
  ${library.migratedLegacy?`<div class="notice success">${icon('check')}Buildy z poprzedniego planera zostały przeniesione. Oryginalne zapisy pozostały zachowane.</div>`:''}
  <div class="search-field saved-search">${icon('search')}<label class="sr-only" for="saved-query">Szukaj zapisanych buildów</label><input id="saved-query" type="search" placeholder="Szukaj po nazwie lub klasie…" value="${e(state.savedQuery)}"></div><div class="saved-grid">${rows.map(b=>`<article class="panel saved-card"><div class="card-top"><span class="monster-emblem">${icon('sword')}</span>${tag(`Lv. ${b.level}`,'gold-tag')}${tag(b.job)}</div><h2>${e(b.name)}</h2><p>${e(b.role)} · ${b.skills.length} umiejętności</p><div class="saved-stats">${STATS.map(s=>`<span>${s}<strong>${b.stats[s]}</strong></span>`).join('')}</div><div class="saved-date">Zmieniono ${date(b.updatedAt)}</div><div class="saved-actions"><button class="btn primary small" data-action="load-build" data-id="${e(b.id)}">Otwórz ${icon('arrow')}</button><button class="icon-button" data-action="duplicate-build" data-id="${e(b.id)}" aria-label="Duplikuj ${e(b.name)}">${icon('copy')}</button><button class="icon-button" data-action="share-saved" data-id="${e(b.id)}" aria-label="Udostępnij ${e(b.name)}">${icon('share')}</button><button class="icon-button danger" data-action="delete-build" data-id="${e(b.id)}" aria-label="Usuń ${e(b.name)}">${icon('trash')}</button></div></article>`).join('')}</div>${!rows.length?empty(library.builds.length?'Brak pasujących buildów':'Pierwszy build czeka na ciebie',library.builds.length?'Spróbuj innej nazwy.':'Wybierz klasę, zaplanuj statystyki i sprzęt. Twoja konfiguracja będzie czekała tutaj.',`<button class="btn primary" data-action="new-build">${icon('plus')}Stwórz build</button>`):''}<div class="builder-info">${icon('info')}<p>Buildy nie synchronizują się automatycznie między urządzeniami. Kopia JSON obejmuje buildy, szkic i cele farmienia. Import dodaje dane bez usuwania obecnych zapisów.</p></div>`;
}

function journal() {
  const active=library.targets.filter(t=>!t.done).length;
  const rows=library.targets.filter(t=>state.journalFilter==='all'||(state.journalFilter==='done'?t.done:!t.done));
  return `${pageHead('DZIENNIK PODRÓŻNIKA','Twój plan farmienia','Zapisuj cele, własne notatki i obserwacje. Wszystko pod ręką przed wyprawą.',`<a class="btn primary" href="#/drops">${icon('plus')}Znajdź nowy cel</a>`)}<div class="journal-summary"><span><strong>${active}</strong> do zdobycia / odwiedzenia</span><span><strong>${library.targets.length-active}</strong> ukończonych</span></div><div class="planet-tabs">${[['all','Wszystkie cele'],['active','Do zrobienia'],['done','Ukończone']].map(([value,label])=>`<button data-action="journal-filter" data-filter="${value}" class="${state.journalFilter===value?'active':''}">${label}</button>`).join('')}</div><div class="journal-list">${rows.map(t=>{
    const entry=(t.kind==='item'?index.items:index.monsters).get(t.id),timer=t.kind==='monster'?timerState(t.killedAt,entry?.respawn):null;
    return `<article class="panel journal-card ${t.done?'completed':''}"><div class="journal-main"><label class="goal-checkbox"><input type="checkbox" data-target-done data-kind="${t.kind}" data-id="${e(t.id)}" ${t.done?'checked':''}><span class="sr-only">Ukończono ${e(entry?.name??t.id)}</span></label>${t.kind==='item'&&entry?itemSymbol(entry):`<span class="monster-emblem">${icon('crown')}</span>`}<div><a href="#/${t.kind}/${e(t.id)}"><h2>${e(entry?.name??`Cel #${t.id}`)}</h2></a><small>${t.kind==='item'?'Przedmiot do zdobycia':e(entry?.locations.map(l=>l.zone).join(' / ')||'King / potwór')}</small></div><button class="icon-button danger" data-action="pin" data-kind="${t.kind}" data-id="${e(t.id)}" aria-label="Usuń cel ${e(entry?.name??t.id)}">${icon('trash')}</button></div><label class="sr-only" for="target-note-${t.kind}-${e(t.id)}">Notatki do celu</label><textarea id="target-note-${t.kind}-${e(t.id)}" data-target-notes data-kind="${t.kind}" data-id="${e(t.id)}" maxlength="1000" rows="2" placeholder="Twój plan, potrzebna ilość, miejsce spotkania…">${e(t.notes)}</textarea>${t.kind==='monster'?`<div class="journal-timer"><span>${icon('clock')}${t.killedAt?`Zapis zabicia: ${new Date(t.killedAt).toLocaleString('pl-PL')}`:'Brak obserwacji zabicia'}${timer?`<strong data-timer="${e(t.id)}">${timer.phase==='waiting'?`Okno odrodzenia za ok. ${timer.minutes} min`:timer.phase==='window'?`Trwa możliwe okno odrodzenia (do ${timer.minutes} min)`:'Przedział minął — sprawdź w grze'}</strong>`:''}</span><button class="btn small" data-action="kill" data-id="${e(t.id)}">Zabity teraz</button>${t.killedAt?`<button class="text-button" data-action="clear-kill" data-id="${e(t.id)}">Wyczyść</button>`:''}</div>`:''}</article>`;
  }).join('')}</div>${!rows.length?empty('Zaplanuj następną wyprawę','Kliknij zakładkę przy przedmiocie lub potworze, aby dodać go do swoich celów.',`<a class="btn primary" href="#/atlas">${icon('crown')}Przejdź do Kingów</a>`):''}<p class="data-footnote">${icon('info')} Zapis zabicia i odliczanie są lokalne. Nie pokazują, czy boss rzeczywiście żyje lub został zabity przez innego gracza.</p>`;
}

function guide() {
  const located=data.monsters.filter(m=>m.locations.length).length;
  return `${pageHead('WIEDZA NA DOBRY POCZĄTEK','Mniej zgadywania. Więcej przygód.','Praktyczne wskazówki, aktualne zmiany i jasne źródła danych.')}
  <div class="guide-grid">${GUIDES.map(g=>`<article class="panel guide-card"><span class="guide-icon">${icon(g.icon)}</span><h2>${g.title}</h2><p>${g.text}</p>${sourceLink(g.source,false)}</article>`).join('')}</div>
  <section class="panel penalty-panel"><div><span class="eyebrow">POZIOM MA ZNACZENIE</span><h2>Sprawdź karę do dropu</h2><p>Standardowe progi z przewodnika dla otwartego świata. Nie są procentową szansą na przedmiot.</p>${sourceLink('drop-guide')}</div><form id="penalty-form"><label for="player-level">Twój poziom<input id="player-level" type="number" min="1" max="250" value="250" required></label><label for="monster-level">Poziom potwora<input id="monster-level" type="number" min="1" max="999" value="250" required></label><button class="btn primary" type="submit">Oblicz</button><output id="penalty-result" aria-live="polite">0% kary przy równych poziomach.</output></form><p class="small-note">Specjalne strefy, potwory, dungeony i Clan Fields mogą stosować inne zasady. Ostateczną karę sprawdź w Monster Inspector.</p></section>
  <section class="panel coverage-panel"><span class="eyebrow">UCZCIWIE O DANYCH</span><h2>Co obejmuje ta baza?</h2><div class="coverage-grid"><div><strong>${number(data.items.length)}</strong><span>przedmiotów w katalogu</span></div><div><strong>${number(data.monsters.length)}</strong><span>potworów i wydarzeń</span></div><div><strong>${number(located)}</strong><span>wpisów z podaną mapą</span></div><div><strong>${number(data.monsters.reduce((n,m)=>n+m.drops.length,0))}</strong><span>powiązań z dropami</span></div></div><p>Katalog jest migawką społecznościową RoseLite / RoseUtils pobraną ${date(CHECKED)}. Nie mamy dostępu do bazy serwera. Dodaliśmy osobno udokumentowane poprawki z oficjalnych patchy do 16.10.2026. Brakujące lokalizacje, szanse, kompletne tabele instancji i formuły buildów pozostają niepotwierdzone.</p><div class="source-legend">${tag('Oficjalny patch','green-tag')} <span>Potwierdza wskazaną informację.</span>${tag('Społeczność','gold-tag')} <span>Wymaga sprawdzenia w aktualnym kliencie.</span></div><p class="small-note">Tylko ROSE Online Global / Rednim Games. Nie korzystamy z tabel prywatnych serwerów. Ilustracja na stronie głównej jest dekoracyjna, nie przedstawia mapy spawnów.</p></section>
  <div class="section-heading"><div><span class="eyebrow">MOŻESZ SPRAWDZIĆ SAM</span><h2>Źródła i aktualizacje</h2></div></div><section class="panel sources-list">${Object.entries(SOURCES).map(([,s])=>`<article><div><span class="source-date">${date(s.date)}${s.type==='community'?' · pobrano':''}</span><h3><a href="${e(s.url)}" target="_blank" rel="noopener noreferrer">${e(s.title)} ${icon('external')}</a></h3><p>${e(s.note)}</p></div>${tag(s.type==='official'?'Oficjalne':'Społeczność',s.type==='official'?'green-tag':'gold-tag')}</article>`).join('')}</section><div class="notice">${icon('info')}<p>ROSE Online, nazwy i dane gry należą do odpowiednich właścicieli. Ten projekt jest fanowską pomocą i nie jest powiązany z Rednim Games ani Gravity. <a href="https://roseutils.com/" target="_blank" rel="noopener noreferrer">RoseUtils</a> · <a href="https://github.com/DrezByte/RoseLite" target="_blank" rel="noopener noreferrer">RoseLite / DrezByte</a> · <a href="./assets/fonts/OFL-1.1.txt" target="_blank" rel="noopener">Licencja fontów</a></p></div>`;
}

function render({focusHeading=false}={}) {
  const active=document.activeElement,focusId=active?.id,selection=active?.selectionStart;
  const views={home,drops,atlas,monster:monsterDetail,item:itemDetail,build:builder,saved:savedBuilds,journal,guide};
  $('#app').innerHTML=shell((views[state.view]??home)());
  document.title=`${({home:'Twój niezbędnik gracza',drops:'Gdzie dropi?',atlas:'Kingi i potwory',build:'Kreator buildu',saved:'Moje buildy',journal:'Plan farmienia',guide:'Poradnik i źródła',monster:index.monsters.get(state.id)?.name,item:index.items.get(state.id)?.name})[state.view]??'Atlas'} · ROSE Companion`;
  if(focusHeading){$('#page-title')?.focus({preventScroll:true});window.scrollTo(0,0);}
  else if(focusId){const el=document.getElementById(focusId);el?.focus({preventScroll:true});if(selection!=null&&['text','search'].includes(el?.type))el.setSelectionRange(selection,selection);}
}
function navigate() {
  clearTimeout(queryTimer);document.body.classList.remove('menu-open');
  const [route,search='']=location.hash.replace(/^#\/?/,'').split('?');
  const [view='home',id]=route.split('/'),params=new URLSearchParams(search);
  state={...state,view:view||'home',id:id??null,q:params.get('q')??'',planet:params.get('planet')??'',type:params.get('type')??'',kind:params.get('kind')==='all'?'':params.get('kind')??'kings',page:1,detailQ:'',knownLocation:false,officialOnly:false,onlyDrops:true};
  render({focusHeading:true});if(view==='build'&&params.get('data'))receiveShared(params.get('data'));
}
function syncFilters() {
  const params=new URLSearchParams();
  if(state.q)params.set('q',state.q);if(state.planet)params.set('planet',state.planet);if(state.type)params.set('type',state.type);
  if(state.view==='atlas'&&state.kind!=='kings')params.set('kind',state.kind||'all');
  history.replaceState(null,'',`#/${state.view}${params.size?'?'+params:''}`);
}
function go(route) {if(location.hash===`#/${route}`)render();else location.hash=`/${route}`;}
function dialog(title,body,buttons) {
  const el=$('#dialog');el.innerHTML=`<div class="dialog-top"><h2 id="dialog-title">${e(title)}</h2><button class="icon-button" data-action="close-dialog" aria-label="Zamknij">${icon('close')}</button></div><div class="dialog-body">${body}</div><div class="dialog-actions">${buttons}</div>`;
  if(!el.open)el.showModal();
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
  if(name==='menu'){document.body.classList.toggle('menu-open');return;}
  if(name==='close-dialog'){$('#dialog').close();pendingAction=null;return;}
  if(name==='confirm'){const fn=pendingAction;pendingAction=null;$('#dialog').close();fn?.();return;}
  if(name==='clear-filters'){clearTimeout(queryTimer);state={...state,q:'',planet:'',type:'',kind:'',page:1,onlyDrops:true,officialOnly:false,knownLocation:false};syncFilters();render();return;}
  if(name==='planet'){clearTimeout(queryTimer);state.planet=el.dataset.planet;state.page=1;syncFilters();render();return;}
  if(name==='page'){state.page=Math.max(1,Number(el.dataset.page));render();$('#main').scrollIntoView({behavior:'smooth',block:'start'});return;}
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
  if(event.target.closest('.skip-link')){event.preventDefault();$('#main')?.focus();return;}
  const button=event.target.closest('[data-action]');if(button){event.preventDefault();action(button.dataset.action,button).catch(error=>toast(`Nie udało się wykonać akcji: ${error.message}`,true));}
});
document.addEventListener('submit',event=>{
  if(['global-search-form','hero-search-form'].includes(event.target.id)){event.preventDefault();const q=new FormData(event.target).get('q')?.trim()??'';if(q)go(`drops?q=${encodeURIComponent(q)}`);}
  if(event.target.id==='penalty-form'){event.preventDefault();const p=Number($('#player-level').value),m=Number($('#monster-level').value),penalty=dropPenalty(p,m);$('#penalty-result').textContent=penalty===null?'Wpisz poprawne poziomy.':`${penalty}% kary do szansy dropu${p>m?` · przewaga ${p-m} poziomów`:''}. To nie szansa na konkretny item.`;}
});
document.addEventListener('input',event=>{
  const el=event.target;
  if(el.matches('[data-query]')){const value=el.value;clearTimeout(queryTimer);queryTimer=setTimeout(()=>{state.q=value;state.page=1;syncFilters();render();},140);}
  if(el.matches('[data-detail-query]')){const value=el.value;clearTimeout(queryTimer);queryTimer=setTimeout(()=>{state.detailQ=value;state.page=1;render();},140);}
  if(el.id==='saved-query'){state.savedQuery=el.value;render();}
  if(el.matches('[data-build-field]')){draft[el.dataset.buildField]=el.type==='number'?Number(el.value):el.value;scheduleDraft();}
  if(el.matches('[data-stat]')){draft.stats[el.dataset.stat]=Number(el.value);scheduleDraft();}
  if(el.matches('[data-gear]')){draft.gear[el.dataset.gear]=el.value;scheduleDraft();}
  if(el.matches('[data-target-notes]')){const next=structuredClone(library),t=next.targets.find(t=>t.kind===el.dataset.kind&&t.id===el.dataset.id);if(t){t.notes=el.value;persist(next);}}
  if(el.matches('[data-skill-index]')){const field=el.dataset.skillField;draft.skills[Number(el.dataset.skillIndex)][field]=field==='rank'?Number(el.value):el.value;scheduleDraft();}
});
document.addEventListener('change',async event=>{
  const el=event.target;
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
window.addEventListener('beforeunload',()=>{clearTimeout(autoSaveTimer);if(dirty&&draft&&!validateBuild(draft).length&&!storageError){try{saveLibrary(storage,{...library,draft});}catch{}}});
window.addEventListener('storage',event=>{if(event.key!==STORAGE_KEY||!event.newValue)return;try{const result=loadLibrary(storage);if(!result.error){library=result.library;render();toast('Zaktualizowano kolekcję po zmianie w drugiej karcie.');}}catch{}});

async function start() {
  try {
    try{storage=window.localStorage;const result=loadLibrary(storage);library=result.library;storageError=result.error;}
    catch{storageError='Pamięć przeglądarki jest niedostępna.';library={version:2,builds:[],targets:[],draft:null,migratedLegacy:false};}
    const response=await fetch('./data/catalog.json');if(!response.ok)throw new Error(`Baza danych: HTTP ${response.status}`);
    data=await response.json();index=indexCatalog(data);draft=library.draft?structuredClone(library.draft):null;dirty=draftNeedsSave(draft,library.builds);
    const legacyLink=new URL(location.href).searchParams.get('build');navigate();
    if(legacyLink){history.replaceState(null,'',`${location.pathname}#/build`);state.view='build';render();receiveShared(legacyLink);}
    if('serviceWorker' in navigator){navigator.serviceWorker.register('./sw.js').catch(()=>{});let refreshed=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(!refreshed){refreshed=true;toast('Wersja offline gotowa. Nową wersję zobaczysz po odświeżeniu.');}});}
  }catch(error){$('#app').innerHTML=`<main class="loading-shell"><h1>Nie udało się otworzyć atlasu</h1><p>${e(error.message)}</p><p>Sprawdź połączenie i odśwież stronę. Twoje lokalne zapisy pozostały nienaruszone.</p><button class="btn primary" id="retry">Spróbuj ponownie</button></main>`;$('#retry').onclick=()=>location.reload();}
}
start();
