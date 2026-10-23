# ROSE Companion

Polski niezbędnik gracza **oficjalnego ROSE Online Global (Rednim Games)**. Przebudowa wcześniejszego ROSE Build Plannera: wyszukiwarka przedmiotów i dropów, atlas Kingów, kreator buildów i osobisty plan farmienia.

[Otwórz ROSE Companion](https://rose-companion.gipgibon.chatgpt.site)

## Kingi zaznaczone na mapach — wersja 3.3

**427 miejsc dla 81 Kingów i bossów** jest zaznaczonych bezpośrednio na mapach klikalnymi koronami. Numer i kolor odpowiadają legendzie; kliknięcie pokazuje nazwę, oryginalny wygląd i odnośnik do dropów. Można wybrać konkretnego Kinga, ukryć znaczniki i powiększyć mapę. Korony skalują swoje położenie razem z terenem, a numeracja pozostaje stała przy filtrowaniu.

**Wastelands** pokazuje sześć miejsc w Obszarze 1 (3 Grand Master Devourer, 2 Desert Scavenger King, 1 Ikaness Mecha) oraz pięć w Obszarze 2 (2 / 2 / 1). Każdy punkt jest przypisany do dokładnego ID strefy i sumy SHA256 obrazu, więc nie przenosi się na inne piętro, obszar ani archiwalną mapę. Wybrany King, punkt i widoczność koron pozostają w URL podczas odświeżenia oraz powrotu z opisu bossa. Miniatury map na kartach bossów także pokazują ich korony.

Dane pochodzą z bloków MonsterSpawn/NPC bieżącego klienta Global, wydanie `ci-38925666467-1`, odczytane 23.10.2026. Przejrzano 1339 plików IFO w 44 strefach. 428 źródłowych obiektów dało 427 odrębnych miejsc na 38 widokach stref; dwa identyczne wpisy Giant Kaiman Ranger połączono w jedną koronę. Współrzędne sprawdzono niezależnie względem map społeczności i dwóch zrzutów Wastelands z widocznymi współrzędnymi gry.

Lokalizacje wyprowadzone z punktów uzupełniają widok katalogu przy uruchomieniu, z etykietą **„Punkt z klienta gry”**. Obejmuje to 35 bossów, dla których starszy katalog nie podawał żadnej mapy. Plik bazowego katalogu i źródła istniejących wpisów pozostają zachowane. Dane o lokalizacji nie zmieniają źródeł dropów.

**Korona wskazuje okolicę możliwego pojawienia się bossa, nie jego aktualną obecność na serwerze.** Dla 14 z 95 wpisów brak użytecznych dokładnych punktów w sprawdzonych plikach; aplikacja nie zgaduje ich współrzędnych. Niektóre spotkania mogą zależeć od skryptów, wydarzeń lub ustawień serwera. Zakres, pełna lista braków i odtwarzanie ekstrakcji: [raport punktów](docs/king-spawn-data.md), [pokrycie](scripts/spawn-coverage.json), [pochodzenie danych](scripts/spawn-provenance.json), [niezależna kontrola projekcji](docs/projection-qa-report.md).

## Mapy i wygląd bossów — wersja 3.2

Atlas zawiera **77 stref i 81 widoków**, obejmujących wszystkie 82 rekordy lokacji i trybów z bieżącego klienta objęte zakresem aplikacji. Pozostałe 10 rekordów tabeli to jawnie wyłączone sceny tytułowe, techniczne, test obciążeniowy lub wpisy oznaczone jako nieużywane bądź wycofane. Lista oczekujących map jest pusta. Liczby, przypisania i powody wyłączeń zapisano w [world.json](dist/data/world.json) oraz [manifeście bieżących map](scripts/current-client-map-manifest.json).

| Obszar atlasu | Strefy | Widoki |
| --- | ---: | ---: |
| Junon | 32 | 34 |
| Luna | 14 | 15 |
| Eldeon | 7 | 7 |
| Orlo | 12 | 13 |
| Karkia | 9 | 9 |
| Poczekalnie Game Arena bez przypisanej planety | 3 | 3 |
| **Łącznie** | **77** | **81** |

Warianty obejmują trzy obszary **Junon Clan Field**, dwa obszary **Wastelands** i piętra **Forgotten Temple B1/B2**. Age of Zatana i Age of Zatana (Free Tour), ID 174 i 91, współdzielą obraz terenu i są zgrupowane w jednej pozycji; ich identyfikatory pozostają zachowane. **Golden Ring, Fossil Sanctuary, Wasteland Ruins Path, Orlo Clan Field i osobny Orlo Clan Field Temple mają własne, nazwane obrazy z klienta.**

Minimapy pochodzą z oficjalnego updatera, wydanie `releases/ci-38925666467-1`, pobrane **23.10.2026**. Przypisania opierają się na aktualnym `LIST_ZONE.STB`, angielskich nazwach lokalizacyjnych i dokładnych ścieżkach DDS w indeksie klienta. Wykorzystane zakresy archiwum zweryfikowano sumami kontrolnymi. Data pobrania oznacza datę odczytu wydania, a `assetModifiedAt` datę zapisaną przy konkretnym pliku; żadna z nich nie jest automatycznie datą premiery lokacji. Źródło: [oficjalny manifest aktualizacji](https://updates.roseonlinegame.com/manifest.json).

**Halls of Oblivion i Sikuku Catacombs** mają w kliencie jedynie czarne placeholdery minimap 4 × 4. Aplikacja pokazuje dla nich opisane widoki z góry, wyrenderowane z oryginalnej geometrii, położeń obiektów, terenu i tekstur bieżącego klienta. W Catacombs pominięto wyłącznie nazwane modele sufitów, aby odsłonić pomieszczenia. Te dwa obrazy są oznaczone jako widoki poziomu z plików gry, a ich źródła i zakres przekształcenia zachowuje [manifest widoków pochodnych](scripts/derived-client-map-manifest.json).

**Obecność mapy w kliencie nie potwierdza publicznego dostępu ani aktualnych spawnów.** Szczególne oznaczenie niepotwierdzonej dostępności obejmuje 13 wpisów/trybów: ID 91 oraz 174–185. W interfejsie jest to 12 pozycji, ponieważ dwa wpisy Age of Zatana są zgrupowane. Należą do nich Age of Zatana, Goblin Cave Dungeon (Free Tour), Mammoth Ice Cave (Free Tour) i dziewięć map Karkia. Nie określamy ich definitywnie jako wydanych ani testowych i nie wyprowadzamy zasad wejścia z samej nazwy Free Tour. Oficjalna [historia świata](https://www.roseonlinegame.com/game/story) wyróżnia Karkia i Orlo jako odrębne planety; materiały potwierdzające zakres i ograniczenia opisano w [THIRD_PARTY.md](THIRD_PARTY.md).

Dla ośmiu map zachowano dodatkowy widok z oznaczeniami ROSE Online Wiki z 2023 r., a dla trzech pierwszych stref — zrzuty społecznościowe Global z kwietnia 2025 r. Są to opcjonalne archiwalne obrazy z osobnym źródłem i datą. Ich znaczniki nie są traktowane jako bieżące punkty odrodzenia.

### Portrety Kingów i bossów

Każdy z **95 wpisów Kingów, bossów, Wandering i wydarzeń** w katalogu ma podgląd oryginalnego modelu gry: 90 renderów z przypiętego oficjalnego instalatora z listopada 2024 r. oraz pięć renderów z bieżącego updatera. Są to modele, szkielety, tekstury i wyposażone części odczytane z klienta, pokazane w neutralnym świetle. Ikony przedmiotów Effigy pozostają ikonami przedmiotów i nie służą jako portrety potworów. Trzy oficjalne zrzuty — Super Hornet, Super Ulverick i Dolphin Island Balloon — są dodatkowym widokiem. Pochodzenie każdego obrazu i ograniczenia renderera zapisano w [manifeście wyglądu bossów](scripts/boss-appearances-manifest.json).

Kontrola względem bieżącego wydania potwierdziła nazwy i powiązania 92 wcześniej istniejących NPC oraz identyczne piksele RGBA wszystkich 147 istniejących tekstur ciała; kolejne 10 tekstur dotyczy nowego Balloon. Moon Sister Inguz i Pantharis King wyrenderowano ponownie z aktualnymi parametrami materiałów. Geometria, szkielety i animacje nie przeszły pełnego porównania bajtów, a broń nie była objęta pełnym porównaniem z nowym wydaniem. Dlatego 90 obrazów zachowuje datę źródła 2024. Podglądy pomijają aurę, cząsteczki, bloom i część efektów materiałów; są renderami modeli, a nie zrzutami rozgrywki. Każdy model jest kadrowany osobno, więc obrazy nie przedstawiają wzajemnej skali przeciwników.

### Nawigacja i wyposażenie

Ścieżka **item → King → mapa** działa na tej samej stronie. Przejście do Kinga lub przedmiotu i powrót zachowuje kontekst mapy oraz pozycję przewijania. Wybrana strefa, wyszukiwanie, filtry, powiększenie, wariant i warstwa mapy pozostają w adresie strony. Na telefonie mapę można wybrać z rozwijanej listy. Poradniki otwierają się wewnątrz aplikacji, a źródła zewnętrzne są opcjonalne.

Plecak pokazuje **oryginalne ikony dla 15 168 przedmiotów**. Kreator ma portrety ośmiu klas, sloty ekwipunku, okno wyboru itemów i katalog 476 skilli z wyszukiwaniem. Warianty o tej samej nazwie zachowują własne identyfikatory i ikony w zapisach i linkach. Część ikon skilli jest ładowana z Toolbox; w razie niedostępności widoczna jest nazwa i informacja o braku ikony. Pozostałe używane grafiki, mapy, dane i poradniki są lokalne. Szkic buildu utrwala się również przy ukryciu karty.

## Funkcje

- Katalog 19 474 przedmiotów i 641 potworów, odwrotne wyszukiwanie dropów po przedmiocie, potworze lub znanej mapie.
- Filtry planet, rodzaju przeciwnika, ekwipunku i oficjalnie potwierdzonych powiązań dropu.
- Lokalizacje Kingów z osobnym źródłem dla miejsca i nagrody; oficjalne korekty Orlo, Orbów, Wandering i wydarzeń.
- Kepris i osobna strefa Orlo Clan Field Temple, zgodnie z oficjalnymi patch notes; brak potwierdzonej pełnej tabeli dropów pozostaje jawny.
- Osiem klas i 16 punktów wyjścia do własnego buildu: statystyki, ekwipunek, umiejętności, rangi, notatki i rotacja.
- Zapisywanie, automatyczny szkic, duplikowanie, import i eksport JSON, udostępnianie konfiguracji linkiem.
- Lista celów farmienia, notatki, ukończone cele i własne obserwacje zabicia; przedział odrodzenia tylko przy udokumentowanym timerze.
- Responsywny interfejs, lokalne fonty, instalowalna PWA i tryb offline po pierwszym pełnym pobraniu.

## Zakres i wiarygodność

Baza jest **migawką referencyjną, nie pełną bazą serwera na żywo**. Zawiera 2151 przedmiotów powiązanych z potworami i dodatkowe źródła mapowe. Komplet 95 podglądów bossów oraz obrazy wszystkich objętych zakresem stref nie oznaczają potwierdzenia ich bieżących spawnów i dropów. Nieznane miejsca pozostają oznaczone jako wymagające potwierdzenia. Nie mieszamy danych serwerów prywatnych.

Pobranie bazy i migawki aktualnego klienta: 23.10.2026. Ostatnia uwzględniona aktualizacja oficjalna dla korekt katalogu: 16.10.2026. Snapshot społecznościowy RoseLite/RoseUtils jest przypięty do konkretnego commita; data pobrania nie potwierdza aktualności każdego wpisu w grze. `dist/content.js` zawiera odnośniki do źródeł korekt, `scripts/catalog-overrides.json` jawne zmiany, a manifesty map i wyglądu osobne dane o zasobach klienta. Kepris pochodzi z [patcha Orlo Clan Field Temple z 31.10.2024](https://forum.roseonlinegame.com/topic/6224-patch-notes-2024-10-31-orlo-clan-field-temple/); jego poziom 265 jest wartością z tabeli NPC klienta zmodyfikowanej 13.10.2026, bez deklaracji odczytu serwera na żywo.

Nie podajemy niepotwierdzonych procentów dropu, tras spawnów, puli SP ani DPS. Kreator jest edytorem planu; ręczne wpisanie skilla lub ekwipunku nie potwierdza zgodności z aktualnymi zasadami gry. Nagrody eventowe są oddzielone od bezpośrednich dropów. Stare drop gemy usunięte w patchu z maja 2026 są wykluczone.

## Dane użytkownika i zgodność

Wszystkie osobiste zapisy pozostają w `localStorage` tej przeglądarki, pod kluczem `rose-companion-v2`. Aplikacja nie wymaga konta i nie synchronizuje danych pomiędzy urządzeniami. Do przeniesienia danych służy kopia JSON.

Pierwsze uruchomienie przenosi `rose-build-planner-saves-v1` transakcyjnie, zachowując stary klucz. Statystyki ze starego planera pozostają oznaczone jako przydzielone punkty; zachowywane są stare identyfikatory umiejętności, rangi, ekwipunek i notatki. Stare linki `?build=...` nadal działają. Uszkodzony zapis zatrzymuje zapis do pamięci i udostępnia kopię ratunkową. Import dodaje wpisy bez kasowania istniejącej kolekcji, szkicu i postępu celów.

Nowy link udostępniania zawiera konfigurację i notatki w fragmencie URL; nie zawiera całej kolekcji ani lokalnego identyfikatora buildu. Odbiorca widzi treść linku, więc nie należy wpisywać do notatek prywatnych danych.

## Uruchamianie i testy

Projekt nie wymaga instalowania zależności ani kompilacji. Serwuj katalog `dist` przez HTTP, np. `python3 -m http.server 8080 --directory dist`. Otwórz `http://localhost:8080` (moduły JS i pobieranie katalogu nie działają przez `file://`). Kod działa również w podkatalogu.

Weryfikacja na Node.js 22 lub nowszym:

```sh
npm run check
npm test
```

Testy obejmują migrację, odzyskiwanie uszkodzonych zapisów, błędy pamięci, import bez nadpisywania, linki UTF-8, integralność źródeł/dropów, filtry, poprawki oficjalne, kary poziomowe, timery i działanie cache offline.

Po zmianie zasobów aplikacji uruchom `node scripts/generate-sw.mjs`. Kontrola `npm run check` odrzuci nieaktualny hash cache lub brakujące pliki. PWA pobiera komplet lokalnych zasobów wersji podczas instalacji. Zewnętrzne ikony skilli wymagają sieci; ich brak nie blokuje edycji buildu. Po aktualizacji otwartej karty odśwież stronę, aby przejść do nowej wersji.

## Aktualizacja katalogu

1. Przygotuj checkout `DrezByte/RoseLite` z commita wskazanego w `THIRD_PARTY.md`.
2. Zweryfikuj zmiany w oficjalnych patch notes; zapisz źródło i korektę w `dist/content.js` oraz `scripts/catalog-overrides.json`.
3. Uruchom `python3 scripts/import-catalog.py /ścieżka/do/RoseLite`.
4. Uruchom generator service workera i testy. Sprawdź kluczowe przepływy w przeglądarce przed publikacją.

Importer sprawdza przypięty commit i zapisuje SHA-256 plików źródłowych w metadanych. Zmiana rewizji wymaga świadomego przeglądu danych; nie ma automatycznego pobierania niezweryfikowanych aktualizacji w przeglądarce.

Mapy i wygląd mają osobne importery: `scripts/import-client-maps.py` przyjmuje manifest nazwanych map oraz opcjonalne `--derived`, a `scripts/import-boss-appearances.py` manifest renderów i oficjalnych zrzutów. Sprawdzają identyfikatory i sumy kontrolne przed zapisaniem zasobów oraz metadanych w `world.json`. Nie używaj historycznego `scripts/client-maps-manifest.json` z etapu 3.1 jako bieżącego indeksu atlasu; obowiązują `current-client-map-manifest.json` i `derived-client-map-manifest.json`. Źródła narzędzi odczytu i renderowania są zachowane w `scripts/client-tools/`; wymagają osobno przygotowanych, zgodnych zasobów klienta i nie stanowią jego dystrybucji.

## Wdrożenie

Serwowany jest katalog `dist`. `.openai/hosting.json` zachowuje tożsamość istniejącej strony. Historia poprzedniego projektu pozostaje w Git. Publikacja nowej wersji nie zmienia dostępu do strony ani nie kasuje zapisów użytkownika.

Prawa do danych, fontów i grafiki opisuje [THIRD_PARTY.md](THIRD_PARTY.md).
