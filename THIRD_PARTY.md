# Źródła i prawa

## Dane gry

ROSE Online i związane z nim nazwy należą do odpowiednich właścicieli, w tym Rednim Games. ROSE Companion jest nieoficjalnym narzędziem fanowskim, bez afiliacji z wydawcą.

Fakty katalogowe (nazwy, klasyfikacje, wybrane parametry liczbowe i powiązania dropów) pochodzą z publicznej migawki [DrezByte/RoseLite](https://github.com/DrezByte/RoseLite/tree/613d91e2d37a3c445877e28219c60652cf9774db), commit `613d91e2d37a3c445877e28219c60652cf9774db`, pobranej 23.10.2026:

- `RoseData/list_items.json`
- `RoseData/drops.json`
- `RoseData/list_npc.json`
- `overlay/kings.json` (wyłącznie identyfikacja i mapy wybranych Kingów, bez niepotwierdzonych timerów).

RoseLite wskazuje RoseUtils jako źródło danych dropów. Zgodnie z upstream `NOTICE` licencja MIT kodu RoseLite nie obejmuje danych i materiałów gry w `RoseData`. Nie przypisujemy tym danym licencji MIT. Nie kopiujemy kodu UI ani tekstów poradników ze źródłowego projektu. W wersji 3.2 używamy oryginalnych ikon, minimap i renderów modeli gry wskazanych poniżej. Zawarte tutaj zestawienie faktów ma wskazane pochodzenie i nie stanowi oficjalnej, kompletnej bazy serwera.

Oficjalne korekty i krótkie parafrazy pochodzą z forum [ROSE Online Global](https://forum.roseonlinegame.com/). Dokładne URL-e, daty i zakres wykorzystania są w `dist/content.js`, a oznaczenie źródła każdej korekty w `scripts/catalog-overrides.json` i wynikowym katalogu. Nie kopiujemy pełnych artykułów.

Katalog 3.2 zawiera 19 474 przedmioty i 641 potworów, w tym 95 wpisów Kingów, bossów, Wandering i wydarzeń. Kepris i osobny Orlo Clan Field Temple mają źródło w [patchu z 31.10.2024](https://forum.roseonlinegame.com/topic/6224-patch-notes-2024-10-31-orlo-clan-field-temple/), opublikowanym 30.10.2024. Nazwę i poziom 265 sprawdzono dodatkowo w bieżących `LIST_NPC.STB` i angielskim `LIST_NPC_S.STL`, zmodyfikowanych 13.10.2026. Patch nie zawiera pełnej tabeli dropów Kepris; aplikacja nie uzupełnia jej przypuszczeniami.

## Fonty

Manrope: Copyright 2018 The Manrope Project Authors (https://github.com/sharanda/manrope).

Cinzel: Copyright 2012 The Cinzel Project Authors (https://github.com/NDISCOVER/Cinzel).

Lokalne pliki WOFF2 są objęte SIL Open Font License 1.1. Pełną licencję i informacje o autorach zachowano w `dist/assets/fonts/OFL-1.1.txt` oraz `FONT-NOTICES.txt`.

## Grafika i ikony

`dist/assets/junon-dawn.png` to nowa ilustracja wygenerowana na potrzeby aplikacji. Jest dekoracyjną interpretacją klimatu ROSE, nie zrzutem ekranu ani mapą lokacji. W wersji 3 nie jest używana w interfejsie ani jako mapa.

Założenia promptu: panoramiczna scena 3:1 inspirowana radosnym MMORPG z początku lat 2000; dolina z rzeką, miasto o koralowych dachach i jasnej wieży, lewitująca wyspa z kryształami, pastelowe turkusy i brzoskwiniowy świt; po prawej mały podróżnik i niebieski stworek, po lewej spokojna przestrzeń na tekst; bez tekstów, logotypów i interfejsu. Wygenerowano 23.10.2026.

Ikony i znak aplikacji są prostymi wektorami zapisanymi w `dist/ui.js` i `dist/icon.svg`.


## Oryginalne ikony i portrety klas

- `dist/assets/game/items-*.webp`: oryginalne ikony 40 × 40 z `RoseData/game-icons` powyższego przypiętego commita RoseLite. Bez zmiany zawartości ułożono je w arkusze z przezroczystym marginesem 2 px. Mapowanie 15 168 przedmiotów jest w `dist/data/visuals.json`, importer w `scripts/import-visuals.py`.
- Portrety ośmiu klas: `overlay/assets/classes/{Knight,Champion,Cleric,Mage,Raider,Scout,Bourgeois,Artisan}.png` z tej samej rewizji.
- Ikony Imbued Effigy zachowano jako grafiki przedmiotów i powiązania przywołania. W wersji 3.2 nie są używane jako portrety potworów; `world.json` zapisuje `summoningItemIconsUsedAsPortraits: false`.
- Katalog 476 wpisów umiejętności: faktyczne nazwy, klasy i kategorie z [ROSE Online Toolbox](https://roseonlinetoolbox.com/builds). Ikony przypisano luckystriike w [credits](https://roseonlinetoolbox.com/credits). Nie przenosimy kodu UI, formuł SP ani treści tooltipów. Oryginalne źródło ikony każdego wpisu jest zapisane w `world.json`. 56 dostępnych ikon spakowano lokalnie w `skills-00.webp` (82 wpisy katalogu); pozostałe ładuje standardowy obraz z adresu wydawcy katalogu. Brak dostępności obrazu daje podpisany fallback; nazwa i wybór skilla nadal działają. Nie wszystkie ikony skilli są dostępne offline.

Materiały gry, ikony i portrety pozostają własnością odpowiednich właścicieli, w tym Rednim Games i artystów. Publiczna dostępność nie oznacza licencji MIT. Repozytorium nie nadaje tym materiałom nowej licencji i nie reprezentuje wydawcy. Układ strony, polskie objaśnienia i kod aplikacji zostały przygotowane osobno.

## Oryginalne minimapy bieżącego klienta — wersja 3.2

Pliki `dist/assets/maps/zone-*.webp` z typem `official-client-minimap` pochodzą z [oficjalnego updatera ROSE Online](https://updates.roseonlinegame.com/manifest.json), odczytanego 23.10.2026. Przypięte wydanie: **`releases/ci-38925666467-1`**. Wykorzystano [archiwum indeksu](https://updates.roseonlinegame.com/releases/ci-38925666467-1/data/data.idx.cba) i potrzebne zakresy [archiwum zasobów](https://updates.roseonlinegame.com/releases/ci-38925666467-1/data/rose.vfs.cba). Kod oficjalnego [rose-updater](https://github.com/rednimgames/rose-updater) oraz format `bitar` służyły jako źródła opisu archiwów CBA.

SHA-256 pobranego manifestu: `df8fcb75cd9de66148300fa3edb6a3a6cb005552f1044083f4aff8375d744bb6`. Pełne sumy BLAKE2b archiwów, hash nagłówka, sumy DDS i wynikowych WEBP oraz daty plików są w [scripts/current-client-map-manifest.json](scripts/current-client-map-manifest.json). Każdy wykorzystany nagłówek i pobrany chunk CBA zweryfikowano przez BLAKE2b. Selektywny odczyt zakresów dostarczył wszystkie bajty każdego wykorzystywanego obrazu bez pobierania całego archiwum.

Identyfikacja stref przebiega przez **ID w aktualnym `LIST_ZONE.STB` → angielski klucz `LIST_ZONE_S.STL` → nazwaną ścieżkę minimapy → hash BLAKE3 ścieżki w `data.idx`**. Tabela stref i nazwy lokalizacyjne mają datę modyfikacji 10.10.2026. Nie ustalamy nazwy mapy na podstawie napisu portalu prowadzącego do innej strefy. Konwersja DDS → bezstratny WEBP zachowuje zawartość minimapy; nie dorysowujemy terenu, bossów ani znaczników.

Pełny manifest zawiera 92 rekordy tabeli. Aplikacja obejmuje **82 rekordy klienta, zgrupowane w 77 stref i 81 widoków**, w tym dwa pochodne widoki opisane poniżej. Wyłączenia są jawne: sceny tytułowe/techniczne ID 4, 7, 16, 19, 100, 103, 104; wycofany wpis ID 6; oznaczony jako nieużywany/niedostępny ID 8; test obciążeniowy ID 15. Żaden pozostały rekord nie czeka na obraz (`pending: []`).

Warianty zachowują własne identyfikatory: Junon Clan Field 11/12/13, Wastelands 78/79, Forgotten Temple 56/57. Age of Zatana 174 i Free Tour 91 korzystają z tego samego DDS i są prezentowane razem. Orlo Clan Field 89 i Orlo Clan Field Temple 90 są odrębnymi mapami. Cały zestaw Orlo, w tym Golden Ring, Fossil Sanctuary i Wasteland Ruins Path, ma przypisanie z tabeli klienta.

`retrievedAt: 2026-10-23` oznacza datę pobrania migawki aktualizatora. `modifiedAt`/`assetModifiedAt` to data zapisana w indeksie przy danym pliku; bywa starsza niż wydanie i nie oznacza daty premiery strefy. Identyfikator wydania CI nie jest deklarowany jako numer wersji gry. Obecność zasobu i zgodność plików nie potwierdzają aktualnych spawnów ani dostępności wejścia na serwerze.

Historyczne `scripts/client-maps-manifest.json` i `scripts/extract-client-maps.py` dokumentują wcześniejszy etap 3.1 z dziewięcioma mapami rozpoznanymi przez porównanie obrazu. Nie są bieżącym indeksem atlasu. W wersji 3.2 autorytatywne przypisania i zakres są w `current-client-map-manifest.json`, `derived-client-map-manifest.json` i `dist/data/world.json`.

### Dwa widoki poziomów z oryginalnej geometrii

Oryginalne DDS Halls of Oblivion (143) i Sikuku Catacombs (169) zawierają tylko jednolite czarne placeholdery 4 × 4. Wyświetlane obrazy `zone-143-derived-client-level.webp` i `zone-169-derived-client-level.webp` są widokami z góry utworzonymi z **aktualnych, oryginalnych** ZON, IFO, HIM, TIL, ZSC, ZMS i tekstur klienta. Nie są oryginalną grafiką minimapy ani obrazami wygenerowanymi przez AI.

| Strefa | Sposób prezentacji | Plik w aplikacji |
| --- | --- | --- |
| Halls of Oblivion | Oryginalny teren i rozmieszczenie obiektów, widok ortograficzny | 1392 × 1392 WEBP |
| Sikuku Catacombs | Ten sam rodzaj widoku, z pominięciem wyłącznie nazwanych siatek sufitu | 1391 × 1010 WEBP |

W Catacombs pominięto 128 instancji trzech modeli: `sikucelling6000_cap.zms`, `sikucelling2000.zms` i `sikucelling6000.zms`. Ściany, podłogi, dekoracje statyczne i ich pozycje pochodzą z plików poziomu. Transformacje terenu i obiektów sprawdzono według [źródła klienta exjam/rose-offline-client, commit 9802251b1f99921cc67408273e0c1e0133153a55](https://github.com/exjam/rose-offline-client/blob/9802251b1f99921cc67408273e0c1e0133153a55/src/zone_loader.rs).

Renderer stosuje neutralne oświetlenie; pomija wypalone oświetlenie, NPC, animowane dekoracje i dynamiczne efekty. Nie wyprowadza z geometrii dostępności przejść ani punktów odrodzenia. Obrazy do aplikacji wyeksportowano jako WEBP quality 92, bez skalowania, z przycięciem przezroczystego marginesu. Pełna lista zużytych zasobów, SHA-256, pominięcia i parametry prezentacji są w [scripts/derived-client-map-manifest.json](scripts/derived-client-map-manifest.json).

### Mapy o niepotwierdzonej publicznej dostępności

Kontrola oficjalnych materiałów na 23.10.2026 nie ustaliła bieżących zasad publicznego dostępu dla następujących **13 rekordów/trybów klienta**. Są widoczne jako **12 pozycji atlasu**, ponieważ Age of Zatana i Free Tour są zgrupowane.

| ID klienta | Lokacja lub tryb |
| --- | --- |
| 91, 174 | Age of Zatana (Free Tour) / Age of Zatana |
| 175 | Goblin Cave Dungeon (Free Tour) |
| 176 | Mammoth Ice Cave (Free Tour) |
| 177–185 | Karkia Outpost (Free Tour), Karkian Reach, Karkian Undercaves, Vel, Sky Cruise, Broodspire, Brood Deeps, The Underriver, Karkia Interiors |

Źródła i granice wniosku:

- [Oficjalna historia świata](https://www.roseonlinegame.com/game/story) wymienia Karkia i Orlo jako osobne planety, bez potwierdzenia dostępności wszystkich lokacji. Dlatego mapy nazwane Karkia nie są przypisywane do Orlo wyłącznie na podstawie surowej wartości `Planet Number = 4`.
- [Patch 01.04.2024](https://forum.roseonlinegame.com/topic/5935-patch-notes-2024-04-01-small-fixes-ocf-zatana-announcement/) zapowiada Age of Zatana w sekcji Work In Progress. [Patch 30.09.2025](https://forum.roseonlinegame.com/topic/7238-patch-notes-2025-09-30-luna-clan-field-updates-ui-improvements-fixes/) wspomina poprawkę summonów, lecz nie opisuje zasad udostępnienia dungeonu.
- [Wypowiedź developera z 11.03.2025](https://forum.roseonlinegame.com/topic/6516-arent-some-of-jroses-assets-too-strange-for-the-game/) opisuje własną Karkia jako etap rozwoju. [Patch 31.01.2025](https://forum.roseonlinegame.com/topic/6511-patch-notes-2025-01-31-world-map-more/) wprost informuje o dodaniu assetów na potrzeby przyszłej zawartości.

Etykieta oznacza **„Mapa klienta — dostępność niepotwierdzona”**. Brak znalezionego potwierdzenia nie dowodzi, że zawartość nie została wydana. Nie nazywamy tych map definitywnie testowymi ani publicznie dostępnymi i nie wywodzimy z nazwy Free Tour zasad wejścia lub farmienia.

## Oryginalne modele 95 bossów i wydarzeń

Pliki `dist/assets/bosses/*-model.webp` to 95 renderów oryginalnej geometrii, szkieletów, tekstur, póz animacji i wyposażonych części klienta Global. Przypisania są oparte na ID i nazwach NPC oraz odwołaniach STB/CHR/ZSC do modeli; pełna proweniencja i sumy kontrolne są w [scripts/boss-appearances-manifest.json](scripts/boss-appearances-manifest.json). Każdy z 95 wpisów spoza kategorii zwykłych potworów w katalogu ma taki podgląd.

| Źródło renderu | Liczba | Zakres |
| --- | ---: | --- |
| Oficjalny instalator z indeksem z listopada 2024 | 90 | Oryginalne modele i zasoby przypiętej migawki |
| Oficjalny updater `ci-38925666467-1` | 5 | Moon Sister Inguz (654), Pantharis King (1806), Super Hornet (3133), Super Ulverick (4645), Dolphin Island Balloon (4451) |

Instalator pobrano 23.10.2026 z [oficjalnej strony pobierania](https://www.roseonlinegame.com/download): [RoseOnlineSetup.exe](https://f002.backblazeb2.com/file/rose-public/RoseOnlineSetup.exe), 998 961 846 B, SHA-256 `e3214a0970355a4df93dad4300fecdd53f2a0b3b47afb7d54bf513d0b20f7477`. Zachowany `data.idx` ma datę 22.11.2024. Przed renderowaniem odzyskano pełny VFS instalatora, 3 058 154 795 B, i potwierdzono SHA-1 `23d194b636c717768def4e48fa8b8234dcc97783`. Numer instalatora Inno Setup nie jest numerem wersji ROSE. Repozytorium nie zawiera instalatora, VFS ani kluczy odczytu.

Pięć aktualnych renderów korzysta z tego samego przypiętego oficjalnego updatera co atlas. `LIST_NPC.STB` i `LIST_NPC_S.STL` mają datę modyfikacji 13.10.2026. Źródło pozostaje zapisane osobno dla każdego obrazu; kontrola zgodności nie zmienia źródła 90 wcześniejszych renderów na rok 2026.

### Zakres porównania z aktualnym klientem

Kontrola z 23.10.2026 dała następujące wyniki:

- Wszystkie 92 wcześniej istniejące ID i nazwy są zgodne z bieżącymi STB/STL/CHR. Potwierdzono powiązania szkieletów, indeksy części, ścieżki animacji idle, skalę, indeksy części w dłoniach i parametry glow. W siedmiu rekordach zmieniły się indeksy efektów, przy zachowanych ścieżkach i przypisaniach punktów zaczepienia.
- Sprawdzono piksele RGBA wszystkich 157 unikalnych tekstur ciała wykorzystanych przez wybrane 95 modeli. **147 istniejących tekstur ma identyczne piksele względem instalatora 2024; 10 tekstur Balloon jest nowych.** To porównanie pikseli, nie twierdzenie o identyczności całych plików DDS.
- Dwie zmiany materiałów uwzględniono przez ponowne renderowanie: wyłączenie testu alpha dla głowy Moon Sister Inguz oraz zmiana progu alpha Pantharis King ze 128 na 200.
- Dla siatek geometrii, szkieletów i animacji porównano metadane istniejących plików. Nie wykonano pełnego porównania SHA ich bajtów. Pliki broni i wybrane rekordy scen broni nie były porównane z bieżącym wydaniem.

Porównanie nie obejmuje obrazu renderowanego przez działającą grę. Podglądy stosują neutralne światło i pomijają odbicia środowiska, bloom/aurę, cząsteczki i nieinterpretowane efekty rozszerzenia ZSC2 `EMIS`. Każdy portret jest kadrowany osobno; rozmiary obrazów nie oddają względnej wielkości potworów. `scalePercent` zachowuje źródłową skalę modelu. Nie deklarujemy pełnej zgodności wszystkich podglądów z wyglądem każdej sytuacji na serwerze na żywo.

Eksport do aplikacji: 640 × 640, WEBP quality 92, przezroczyste tło; kanał alpha sprawdzono jako bezstratny dla wszystkich 95 obrazów. Nie użyto generatywnego tworzenia wyglądu bossów. Dokumentacja formatu i źródła wykorzystane do niezależnego odczytu/renderowania: [ROSE formats](https://ralphminderhoud.com/rose-formats/), [rose-tools / rose-lib](https://github.com/rminderhoud/rose-tools/tree/master/rose-lib/src/files), [model_loader.rs](https://github.com/exjam/rose-offline-client/blob/9802251/src/model_loader.rs), [object_material.rs](https://github.com/exjam/rose-offline-client/blob/9802251/src/render/object_material.rs), [zz_skeleton.cpp](https://github.com/shid0x/rose-next/blob/ca675d5fc0dea34d0f44bd1dc6dadf4bd469d5f1/src/engine/src/zz_skeleton.cpp). Źródła narzędzi są zachowane w `scripts/client-tools/`; pliki gry trzeba dostarczyć osobno.

### Trzy opcjonalne oficjalne zrzuty bossów

| Boss / wydarzenie | Oficjalne źródło | Data patcha |
| --- | --- | --- |
| Super Hornet | [Super Boss & Dirties](https://forum.roseonlinegame.com/topic/6866-patch-notes-2025-05-01-super-boss-dirties/) | 01.05.2025 |
| Super Ulverick | [Dolphin Island, RmlUI, Desert of the Dead](https://forum.roseonlinegame.com/topic/7789-patch-notes-2026-10-16-dolphin-island-rmlui-desert-of-the-dead/) | 16.10.2026 |
| Dolphin Island Balloon | [Dolphin Island, RmlUI, Desert of the Dead](https://forum.roseonlinegame.com/topic/7789-patch-notes-2026-10-16-dolphin-island-rmlui-desert-of-the-dead/) | 16.10.2026 |

Autorem/źródłem są ROSE Online i Rednim Games. Obrazy pobrano 23.10.2026. Daty w tabeli pochodzą z tytułów patch notes; nie ustalono osobnej daty wykonania zrzutów. Metadane forum wskazują publikację wpisów odpowiednio 30.04.2025 i 18.09.2026; manifest zachowuje zarówno te wartości, jak i datę patcha.

Super Hornet zachowuje pełny kadr. Super Ulverick i Balloon mają jedynie prostokątne wycięcia z oryginalnych pikseli, z dostępnym pełnym obrazem; nie usuwano tła, nie retuszowano i nie dorysowywano części modeli. Wycięcie Balloon ma 140 × 185 px, więc powiększenie nie dostarcza nowych szczegółów. Pliki dystrybucyjne przekonwertowano do WEBP; manifest zachowuje osobno sumy oryginału, wycięcia i dostarczanego pliku. To dodatkowy widok obok renderów, a nie zastępstwo brakujących portretów.

## Archiwalne widoki map zachowane z wersji 3.1

Osiem plików `dist/assets/maps/*-community-2023.webp` pobrano z publicznych stron ROSE Online Wiki 23.10.2026. To istniejące obrazy terenu z gry; nie zostały wygenerowane ani uzupełnione o nowe znaczniki. Nazwa konkretnego autora obrazu nie jest ustalona; źródłem są autorzy ROSE Online Wiki. Oznaczenia naniesione w oryginale nie są potwierdzeniem aktualnych spawnów ROSE Online Global.

| Mapa | Strona źródłowa | Data rewizji obrazu |
| --- | --- | --- |
| Xita Refuge | [Xita Refuge](https://roseonline.fandom.com/wiki/Xita_Refuge) | 2023-01-29 |
| Anima Lake | [Anima Lake](https://roseonline.fandom.com/wiki/Anima_Lake) | 2023-02-04 |
| Forest of Wisdom | [Forest of Wisdom](https://roseonline.fandom.com/wiki/Forest_of_Wisdom) | 2023-02-07 |
| Breezy Hills | [Breezy Hills](https://roseonline.fandom.com/wiki/Breezy_Hills) | 2023-02-03 |
| El Verloon Desert | [El Verloon Desert](https://roseonline.fandom.com/wiki/El_Verloon_Desert) | 2023-02-03 |
| Arumic Valley | [Arumic Valley](https://roseonline.fandom.com/wiki/Arumic_Valley) | 2023-01-29 |
| Crystal Snowfields | [Crystal Snowfields](https://roseonline.fandom.com/wiki/Crystal_Snowfields) | 2023-01-29 |
| Mana Snowfields | [Mana Snowfields](https://roseonline.fandom.com/wiki/Mana_Snowfields) | 2023-01-29 |

Data pochodzi z parametru rewizji oryginalnego URL obrazu; nie potwierdzono oddzielnie pierwszej daty publikacji. `dist/data/world.json` zachowuje bezpośredni `sourceImageUrl`, stronę `sourceUrl`, SHA-256 lokalnych bajtów, wymiary i oznaczenie `historical: true`. Pliki zachowano bez zmiany treści. Przypisanie potworów do stref nadal pochodzi z osobnego katalogu Global, a nie z czerwonych kół na archiwalnych mapach.

Trzy dodatkowe widoki archiwalne są rzeczywistymi zrzutami Global autorstwa marronglace_presso z kwietnia 2025: [Adventurer’s Plains, 18.04.2025](https://marronglace-presso.hatenablog.com/entry/2025/04/18/141821), [Valley of Luxem Tower, 20.04.2025](https://marronglace-presso.hatenablog.com/entry/2025/04/20/133657), [Canyon City of Zant, 27.04.2025](https://marronglace-presso.hatenablog.com/entry/2025/04/27/211136). Autor, daty i źródła pozostają w `world.json` i panelu mapy. Czerwone oznaczenie na pierwszym obrazie pochodzi od autora. Wersja 3.2 wyświetla dla tych stref bieżące minimapy klienta jako podstawowy widok, a te zrzuty jako opcjonalne archiwum.

Łącznie zachowano 11 archiwalnych widoków: osiem z wiki i trzy z bloga. Nie są wliczane do 81 widoków bieżącego atlasu i nie przenosimy ich oznaczeń na czysty teren jako aktualnych spawnów. Materiały graficzne pozostają własnością artystów gry, Rednim Games i Gravity Interactive. Źródłowe strony wiki odsyłają do [zasad CC BY-SA Fandom](https://www.fandom.com/licensing); prawa do bazowych grafik gry pozostają odrębne. Aplikacja zachowuje autorstwo, odnośniki i informacje o pochodzeniu.
