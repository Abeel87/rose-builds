# Źródła i prawa

## Dane gry

ROSE Online i związane z nim nazwy należą do odpowiednich właścicieli, w tym Rednim Games. ROSE Companion jest nieoficjalnym narzędziem fanowskim, bez afiliacji z wydawcą.

Fakty katalogowe (nazwy, klasyfikacje, wybrane parametry liczbowe i powiązania dropów) pochodzą z publicznej migawki [DrezByte/RoseLite](https://github.com/DrezByte/RoseLite/tree/613d91e2d37a3c445877e28219c60652cf9774db), commit `613d91e2d37a3c445877e28219c60652cf9774db`, pobranej 23.10.2026:

- `RoseData/list_items.json`
- `RoseData/drops.json`
- `RoseData/list_npc.json`
- `overlay/kings.json` (wyłącznie identyfikacja i mapy wybranych Kingów, bez niepotwierdzonych timerów).

RoseLite wskazuje RoseUtils jako źródło danych dropów. Zgodnie z upstream `NOTICE` licencja MIT kodu RoseLite nie obejmuje danych i materiałów gry w `RoseData`. Nie przypisujemy tym danym licencji MIT. Nie kopiujemy kodu UI ani tekstów poradników ze źródłowego projektu. W wersji 3 używamy rzeczywistych ikon i portretów gry wskazanych poniżej. Zawarte tutaj zestawienie faktów ma wskazane pochodzenie i nie stanowi oficjalnej, kompletnej bazy serwera.

Oficjalne korekty i krótkie parafrazy pochodzą z forum [ROSE Online Global](https://forum.roseonlinegame.com/). Dokładne URL-e, daty i zakres wykorzystania są w `dist/content.js`, a oznaczenie źródła każdej korekty w `scripts/catalog-overrides.json` i wynikowym katalogu. Nie kopiujemy pełnych artykułów.

## Fonty

Manrope: Copyright 2018 The Manrope Project Authors (https://github.com/sharanda/manrope).

Cinzel: Copyright 2012 The Cinzel Project Authors (https://github.com/NDISCOVER/Cinzel).

Lokalne pliki WOFF2 są objęte SIL Open Font License 1.1. Pełną licencję i informacje o autorach zachowano w `dist/assets/fonts/OFL-1.1.txt` oraz `FONT-NOTICES.txt`.

## Grafika i ikony

`dist/assets/junon-dawn.png` to nowa ilustracja wygenerowana na potrzeby aplikacji. Jest dekoracyjną interpretacją klimatu ROSE, nie zrzutem ekranu ani mapą lokacji. W wersji 3 nie jest używana w interfejsie ani jako mapa.

Założenia promptu: panoramiczna scena 3:1 inspirowana radosnym MMORPG z początku lat 2000; dolina z rzeką, miasto o koralowych dachach i jasnej wieży, lewitująca wyspa z kryształami, pastelowe turkusy i brzoskwiniowy świt; po prawej mały podróżnik i niebieski stworek, po lewej spokojna przestrzeń na tekst; bez tekstów, logotypów i interfejsu. Wygenerowano 23.10.2026.

Ikony i znak aplikacji są prostymi wektorami zapisanymi w `dist/ui.js` i `dist/icon.svg`.


## Oryginalne grafiki w wersji 3

- `dist/assets/game/items-*.webp`: oryginalne ikony 40×40 z `RoseData/game-icons` powyższego przypiętego commita RoseLite. Bez zmiany zawartości ułożono je w arkusze z przezroczystym marginesem 2 px. Mapowanie jest w `dist/data/visuals.json`, importer w `scripts/import-visuals.py`.
- Portrety ośmiu klas: `overlay/assets/classes/{Knight,Champion,Cleric,Mage,Raider,Scout,Bourgeois,Artisan}.png` z tej samej rewizji.
- 59 wizerunków potworów: rzeczywiste ikony przypisanych Imbued Effigy, nie nowe modele ani pełne rendery bossów. Mapowanie do nazw przedmiotów i ID znajduje się w `dist/data/world.json`.
- Katalog 476 wpisów umiejętności: faktyczne nazwy, klasy i kategorie z [ROSE Online Toolbox](https://roseonlinetoolbox.com/builds). Ikony przypisano luckystriike w [credits](https://roseonlinetoolbox.com/credits). Nie przenosimy kodu UI, formuł SP ani treści tooltipów. Oryginalne źródło ikony każdego wpisu jest zapisane w `world.json`. 56 dostępnych ikon spakowano lokalnie w `skills-00.webp` (82 wpisy katalogu); pozostałe ładuje standardowy obraz z adresu wydawcy katalogu. Brak dostępności obrazu daje podpisany fallback; nazwa i wybór skilla nadal działają. Nie wszystkie ikony skilli są dostępne offline.
- Trzy rzeczywiste zrzuty map Global: marronglace_presso, kwiecień 2025. [Adventurer’s Plains](https://marronglace-presso.hatenablog.com/entry/2025/04/18/141821), [Valley of Luxem Tower](https://marronglace-presso.hatenablog.com/entry/2025/04/20/133657), [Canyon City of Zant](https://marronglace-presso.hatenablog.com/entry/2025/04/27/211136). Dokładne daty, autor i źródło są w `world.json` i rozwijanym panelu pod mapą. Zrzuty zachowano bez wymyślonych pinezek. Czerwone oznaczenie na pierwszym obrazie pochodzi od autora.

Materiały gry, ikony i portrety pozostają własnością odpowiednich właścicieli, w tym Rednim Games i artystów. Publiczna dostępność nie oznacza licencji MIT. Repozytorium nie nadaje tym materiałom nowej licencji i nie reprezentuje wydawcy. Układ strony, polskie objaśnienia i kod aplikacji zostały przygotowane osobno.

## Archiwalne mapy dodane w wersji 3.1

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

## Teren z oficjalnego instalatora

Dziewięć plików `dist/assets/maps/*-client-2024.webp` zawiera oryginalne minimapy z pełnego instalatora wskazanego na [oficjalnej stronie pobierania](https://www.roseonlinegame.com/download). Źródło: [RoseOnlineSetup.exe](https://f002.backblazeb2.com/file/rose-public/RoseOnlineSetup.exe), pobrane 23.10.2026; SHA-256 `e3214a0970355a4df93dad4300fecdd53f2a0b3b47afb7d54bf513d0b20f7477`.

Zachowany `data.idx` ma datę 22.11.2024. Nie ustalono numeru klienta ani zgodności z późniejszymi aktualizacjami. Wydanie Inno Setup nie jest numerem wersji ROSE. Dostępna lokalnie ekstrakcja VFS jest niepełna; każdy wykorzystany fragment DDS sprawdzono oddzielnie. Repozytorium zawiera wyłącznie wybrane mapy i manifest, bez instalatora oraz archiwum klienta.

Strefy: Xita Refuge, Forest of Wandering, Anima Lake, Forest of Wisdom, Breezy Hills, El Verloon Desert, Arumic Valley, Crystal Snowfields i Mana Snowfields. Ich nazwy potwierdzono przez porównanie całego obrazu terenu z nazwanymi źródłami; napisy wyjść na mapie nie były traktowane jako jej własna nazwa. Źródła identyfikacji, offsety, wymiary i SHA-256 fragmentów oraz obrazów są w `scripts/client-maps-manifest.json`. Konwersja DDS → bezstratny WEBP zachowuje treść terenu. `scripts/extract-client-maps.py` odtwarza obrazy po sprawdzeniu hasha każdego fragmentu (wymaga Pillow).

Osiem map ma dodatkowy, oryginalny widok z archiwalnymi oznaczeniami wiki opisanymi powyżej; nie przenosimy tych kół na czysty teren jako aktualnych spawnów. Materiały graficzne pozostają własnością artystów gry, Rednim Games i Gravity Interactive. Źródłowe strony wiki deklarują [CC BY-SA](https://www.fandom.com/licensing); prawa do bazowych grafik gry pozostają odrębne. Aplikacja zachowuje autorstwo, odnośniki i informacje o pochodzeniu.
