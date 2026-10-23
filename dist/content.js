export const VERSION = '3.2.0';
export const CHECKED = '2026-10-23';
export const CLASSES = {
  Soldier: ['Knight', 'Champion'], Muse: ['Cleric', 'Mage'],
  Hawker: ['Raider', 'Scout'], Dealer: ['Bourgeois', 'Artisan'],
};
export const JOBS = Object.values(CLASSES).flat();
export const STATS = ['STR', 'DEX', 'INT', 'CON', 'CHA', 'SEN'];
export const STAT_LABELS = { STR: 'Strength', DEX: 'Dexterity', INT: 'Intelligence', CON: 'Concentration', CHA: 'Charm', SEN: 'Sense' };
export const SLOTS = { Weapon: 'Broń', Offhand: 'Druga ręka', Head: 'Głowa', Body: 'Pancerz', Gloves: 'Rękawice', Shoes: 'Buty', Back: 'Plecy', Face: 'Twarz', Jewelry: 'Biżuteria' };
export const TYPES = { weapon: 'Broń', body: 'Pancerze', head: 'Nakrycia głowy', feet: 'Buty', arms: 'Rękawice', back: 'Plecy', face: 'Twarz', shield: 'Tarcze / druga ręka', accessory: 'Biżuteria', gem: 'Gemy', consumable: 'Przedmioty użytkowe', material: 'Materiały', cart: 'PAT', mount: 'Mounty' };
export const KINDS = { king: 'King', boss: 'Sub-boss', wandering: 'Wandering', event: 'Wydarzenie', monster: 'Potwór' };
export const PLANETS = [
  { name: 'Junon', color: 'green', symbol: 'sun', subtitle: 'Początek przygody' },
  { name: 'Luna', color: 'blue', symbol: 'moon', subtitle: 'Kraina lodu' },
  { name: 'Eldeon', color: 'violet', symbol: 'leaf', subtitle: 'W cieniu dżungli' },
  { name: 'Orlo', color: 'gold', symbol: 'diamond', subtitle: 'Wśród piasków' },
];
const revision = '613d91e2d37a3c445877e28219c60652cf9774db';
const forum = 'https://forum.roseonlinegame.com/topic/';
export const SOURCES = {
  "client-npc-current": {"title": "Aktualny oficjalny klient Global — katalog NPC", "type": "official", "date": "2026-10-13", "url": "https://updates.roseonlinegame.com/manifest.json", "note": "LIST_NPC.STB i angielski LIST_NPC_S.STL z oficjalnej aktualizacji ci-38925666467-1, pobranej23.10.2026. Poziom265 i nazwa Kepris są zapisane w bieżącej tabeli klienta; nie jest to odczyt parametrów serwera na żywo."},
  "patch-ocf-temple": {"title": "Orlo Clan Field Temple — Kepris i Black Scarabs", "type": "official", "date": "2024-10-31", "publishedAt": "2024-10-30T18:19:52+0000", "url": "https://forum.roseonlinegame.com/topic/6224-patch-notes-2024-10-31-orlo-clan-field-temple/", "note": "Patch nazywa osobną strefę Orlo Clan Field Temple, nowego bossa Kepris oraz towarzyszące mu Black Scarabs. Nie publikuje pełnej tabeli dropów."},
  "client-npc-2024": {"title": "Oryginalny klient Global — katalog NPC", "type": "official", "date": "2024-11-22", "url": "https://www.roseonlinegame.com/download", "note": "Nazwy, identyfikatory, rangi i poziomy z LIST_NPC.STB oraz angielskiego LIST_NPC_S.STL w oficjalnym instalatorze. Data to znacznik tabeli; nie oznacza potwierdzenia poziomów na serwerze w 2026 r."},

  'community-art': { title:'Grafiki gry, bossy i ikony',type:'community',date:CHECKED,url:`https://github.com/DrezByte/RoseLite/tree/${revision}/RoseData/game-icons`,note:'Oryginalne ikony przedmiotów z katalogu RoseLite. Wygląd bossów pokazują osobno podglądy modeli klienta Global oraz oficjalne zrzuty; źródło jest dostępne przy powiększonym wizerunku.' },
  'community-maps': { title:'Mapy z klienta ROSE Online Global',type:'community',date:'2025-04-18',url:'https://marronglace-presso.hatenablog.com/entry/2025/04/18/141821',note:'Zrzuty map z klienta Global autorstwa marronglace_presso. Artykuł opisuje Jelly Kinga w Adventurer’s Plains. Oznaczenia na zrzutach pochodzą od autora; nie potwierdzamy dokładnych aktualnych spawnów.' },
  'community-skills': { title:'Katalog umiejętności i ikon',type:'community',date:CHECKED,url:'https://roseonlinetoolbox.com/builds',note:'Nazwy, klasy i ikony z publicznego katalogu ROSE Online Toolbox. Ikony: luckystriike / prawa właścicieli gry. Bez potwierdzania puli SP, kosztów rang ani zależności drzewka.' },
  'community-drops': { title: 'RoseLite / RoseUtils — katalog i dropy', type: 'community', date: CHECKED, url: `https://github.com/DrezByte/RoseLite/tree/${revision}/RoseData`, note: 'Publiczna migawka danych społecznościowych. Data pobrania nie jest datą potwierdzenia wszystkich wpisów na serwerze. Część lokalizacji i nagród instancji jest niepełna.' },
  'community-kings': { title: 'RoseLite — lokalizacje Kingów', type: 'community', date: CHECKED, url: `https://github.com/DrezByte/RoseLite/blob/${revision}/overlay/kings.json`, note: 'Nazwy i mapy ze społecznościowej listy. Nie kopiujemy niepotwierdzonych, dokładnych czasów odrodzenia. Rozbieżności poziomów oznaczamy przy potworze.' },
  'patch-october': { title: 'Dolphin Island, Orlo i Super Ulverick', type: 'official', date: '2026-10-16', url: `${forum}7789-patch-notes-2026-10-16-dolphin-island-rmlui-desert-of-the-dead/`, note: 'Kingowie Orlo: poziom 250. Wandering: przedział odrodzenia 5–90 min. Wydarzenia i nowe nagrody nie oznaczają automatycznie potwierdzonego dropu z każdego bossa.' },
  'patch-inspector': { title: 'Monster Inspector i nowe spawny', type: 'official', date: '2026-07-01', url: `${forum}7709-patch-notes-2026-07-01-monster-inspector-mob-density-fixes/`, note: 'Nowe spawny w Wastelands i Golden Ring; większe zagęszczenie potworów w kilku strefach.' },
  'patch-may': { title: 'Dropy Kingów i stałe skille klanowe', type: 'official', date: '2026-05-31', url: `${forum}7664-patch-notes-2026-05-31-clan-skills-treasure-chests-gem-10-difficulty-drop-rate-increase/`, note: 'Plutorune i Prismatic Dust na Kingach Orlo; Separation Drill i Prismatic Fiber na Wandering. Usunięto drop gemy.' },
  'patch-effigies': { title: 'Effigy, Orby i miejsca farmienia', type: 'official', date: '2026-04-24', url: `${forum}7629-patch-notes-2026-04-24-effigies/`, note: 'Przywoływanie Kingów, wybrane przypisania Orbów (L), chemikalia na Golden Ring. Nie publikuje pełnej tabeli dropów.' },
  'patch-uniques': { title: 'Unique weapons i Super Boss', type: 'official', date: '2025-06-26', url: `${forum}7145-patch-notes-2025-06-26-unique-rework-proximity-system-choice-boxes-super-boss/`, note: 'Unique weapons przeniesiono wyłącznie na Kingów i zmieniono ich przypisania. Starsze tabele mogą być nieaktualne.' },
  'drop-guide': { title: 'Oficjalny przewodnik po dropach', type: 'official', date: '2024-02-03', url: `${forum}5829-drop-table-guide/`, note: 'Używamy progów kary za poziom. Informacje o drop gemach i czasowych bonusach klanowych zastąpił patch z maja 2026. Instancje i Clan Fields mogą mieć inne zasady.' },
  'daily-dungeons': { title: 'Daily Dungeon Quests — HoneyBuns', type: 'official', date: '2025-06-22', url: `${forum}7143-guide-daily-dungeon-quests/`, note: 'Identyfikacja bossów Cave of Ulverick i powiązanych NPC. Dawne wymagania poziomowe nie opisują wszystkich obecnych wariantów dungeonów.' },
  'patch-champ': { title: 'Zmiany Champion', type: 'official', date: '2026-09-11', url: `${forum}7782-patch-notes-2026-09-11-champ-update/`, note: 'Potwierdza wymienione zmiany umiejętności, nie kompletną pulę punktów ani drzewko.' },
  'patch-summons': { title: 'Summony, Scout i niższe dungeony', type: 'official', date: '2026-09-13', url: `${forum}7788-patch-notes-2026-09-13-summons-scout-dungeon-nerf-update/`, note: 'Zmiany summonów i Scouta; osłabienie niższych wariantów Ulverick, Halls of Oblivion i Sea of Dawn.' },
};
export const TEMPLATES = [
  ['knight-0','Knight','Tarcza i wytrzymałość','Tank','Shield'],
  ['knight-1','Knight','Battle Knight','Solo','Melee'],
  ['champion-0','Champion','Spear AoE','Farmienie','Spear'],
  ['champion-1','Champion','Sword / Axe','Bossy','Sword / Axe'],
  ['cleric-0','Cleric','Full Support','Wsparcie','Support'],
  ['cleric-1','Cleric','Battle Summoner','Solo','Summon'],
  ['mage-0','Mage','AoE Mage','Farmienie','Magic'],
  ['mage-1','Mage','Boss Mage','Bossy','Magic'],
  ['raider-0','Raider','Katar','Solo','Katar'],
  ['raider-1','Raider','Dual Sword','Drużyna','Dual Sword'],
  ['scout-0','Scout','Bow','Farmienie','Bow'],
  ['scout-1','Scout','Crossbow','Drużyna','Crossbow'],
  ['bourgeois-0','Bourgeois','Launcher · solo & farm','Farmienie','Launcher'],
  ['bourgeois-1','Bourgeois','Gun / Mercenary','Solo','Gun'],
  ['artisan-0','Artisan','Crafting','Crafting','Crafting'],
  ['artisan-1','Artisan','Battle Gun / Summon','Solo','Gun'],
].map(([id,job,name,role,weapon])=>({id,job,name,role,weapon}));
export const SKILL_FACTS = [
  { name:'Spear Deflection Stance', job:'Champion', text:'2 dodge za 2 STR po wrześniowej zmianie.', source:'patch-champ' },
  { name:'Spear Dancer', job:'Champion', text:'Czas działania skrócono do 20 sekund.', source:'patch-champ' },
  { name:'Graceful Swings', job:'Champion', text:'Stacki aktywują się także po udanym użyciu skilla.', source:'patch-champ' },
  { name:'Earth Elemental', job:'Cleric', text:'Dodano obszarowy taunt.', source:'patch-summons' },
  { name:'Fire Elemental', job:'Cleric', text:'Dodano obszarowy burn.', source:'patch-summons' },
  { name:'Ice Dragon', job:'Cleric', text:'Frost Nova spowalnia o 25%; efekt na wszystkich pięciu rangach.', source:'patch-summons' },
  { name:'Crossbow Arrow Shower', job:'Scout', text:'Cooldown 10 s; redukcja fizycznej obrony o 10% na 6 s.', source:'patch-summons' },
  { name:'Bow Arrow Shower', job:'Scout', text:'Osobny cooldown 8 s.', source:'patch-summons' },
  { name:'Poison Arrow Shower', job:'Scout', text:'Osobny cooldown 8 s.', source:'patch-summons' },
];
export const GUIDES = [
  { icon:'eye', title:'Zanim zaczniesz farmić', text:'W grze użyj Monster Inspector na wybranym potworze. Sprawdź jego wariant, listę przedmiotów i karę za poziom. To najlepszy sposób potwierdzenia danych po aktualizacji.', source:'patch-inspector' },
  { icon:'crown', title:'Przywołaj własnego Kinga', text:'Zdobądź surowe Effigy i przygotuj u Artisana wersję Imbued. Użyj jej na dozwolonej mapie. Garden of Aru akceptuje Effigy z różnych planet, z wyjątkiem bossów Clan Field. Przywołanie nie rezerwuje bossa dla ciebie.', source:'patch-effigies' },
  { icon:'diamond', title:'Unique nie wypada z każdego moba', text:'Od czerwca 2025 broń Unique wypada z Kingów. Zmieniono przypisania broni, dlatego stare poradniki mogą prowadzić w złe miejsce. Unique Weapon Fragment jest osobnym przedmiotem.', source:'patch-uniques' },
  { icon:'shield', title:'Bonusy klanowe zamiast drop gemów', text:'Drop gemy usunięto. Skille dropu klanu są stałe i mają pięć poziomów. Jest też osobny bonus Drop Quantity. Nie potrzebujesz starego zestawu z drop gemami.', source:'patch-may' },
  { icon:'moon', title:'Dungeon a otwarty świat', text:'Nie łącz tabel bossów o podobnych nazwach. Ulverick w instancji oraz Super Ulverick w Desert of the Dead to osobne wpisy. Niższe wersje dungeonów mają własne parametry.', source:'patch-summons' },
  { icon:'clock', title:'Kiedy pojawi się Wandering?', text:'Aktualny przedział wynosi 5–90 minut. Zapis zabicia w dzienniku jest twoją lokalną obserwacją, nie odczytem serwera ani gwarancją pojawienia się bossa.', source:'patch-october' },
];
