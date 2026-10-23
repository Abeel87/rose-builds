# ROSE Companion

Polski niezbędnik gracza **oficjalnego ROSE Online Global (Rednim Games)**. Przebudowa wcześniejszego ROSE Build Plannera: wyszukiwarka przedmiotów i dropów, atlas Kingów, kreator buildów i osobisty plan farmienia.

[Otwórz ROSE Companion](https://rose-global-build-planner.gipgibon.chatgpt.site)

## Mapy i nawigacja 3.1

Plecak z oryginalnymi ikonami ponad 15 tysięcy itemów; bestiariusz z 59 ikonami Effigy; obrazy 12 stref i indeks pozostałych opisanych lokalizacji. Właściwa ścieżka to item → King → mapa, na tej samej stronie. Poradniki otwierają się wewnątrz aplikacji, a zewnętrzne materiały są opcjonalnymi źródłami.

Kreator ma portrety ośmiu klas, sloty ekwipunku i okno wyboru itemów oraz katalog 476 skilli z wyszukiwaniem. Warianty o tej samej nazwie zachowują własne identyfikatory i ikony w zapisach i linkach. Część ikon skilli jest ładowana z Toolbox; w razie niedostępności widoczna jest nazwa i informacja o braku ikony. Pozostałe grafiki, mapy, dane i poradniki są lokalne.

Zakres map jest jawny: 12 stref ma lokalny obraz, dostępny bez opuszczania aplikacji:

| Planeta | Mapy z obrazem |
| --- | --- |
| Junon | Adventurer’s Plains, Valley of Luxem Tower, Canyon City of Zant, Anima Lake, Forest of Wisdom, Breezy Hills, El Verloon Desert |
| Luna | Arumic Valley, Crystal Snowfields, Mana Snowfields |
| Eldeon | Xita Refuge, Forest of Wandering |

Dziewięć map terenu wyodrębniono z oficjalnego pełnego instalatora gry. Pobrano go 23.10.2026, ale zachowany indeks ma datę 22.11.2024; numer wersji i aktualność po patchach nie są potwierdzone. Nazwy rozpoznano przez porównanie pełnych obrazów z nazwanymi źródłami. Dla ośmiu map przycisk **Oznaczenia z wiki** przełącza na oryginalną warstwę społecznościową z 2023 r. Jej czerwone znaczniki są archiwalne. Przełącznik **Teren z gry** przywraca czystą mapę z instalatora. Trzy pozostałe mapy to zrzuty Global z kwietnia 2025. Źródła i daty są pod każdym obrazem. Orlo nie ma jeszcze pewnie przypisanych obrazów map; zachowuje listy celów i dropów.

Wersja 3.1 zachowuje wybraną strefę, wyszukiwanie, filtry, powiększenie i warstwę mapy w adresie strony. Przejście do Kinga lub przedmiotu i powrót zachowuje kontekst mapy oraz pozycję przewijania. Na telefonie można wybrać mapę z rozwijanej listy. Szkic buildu jest utrwalany także przy ukryciu karty.

## Funkcje

- Katalog 19 474 przedmiotów i 640 potworów, odwrotne wyszukiwanie dropów po przedmiocie, potworze lub znanej mapie.
- Filtry planet, rodzaju przeciwnika, ekwipunku i oficjalnie potwierdzonych powiązań dropu.
- Lokalizacje Kingów z osobnym źródłem dla miejsca i nagrody; oficjalne korekty Orlo, Orbów, Wandering i wydarzeń.
- Osiem klas i 16 punktów wyjścia do własnego buildu: statystyki, ekwipunek, umiejętności, rangi, notatki i rotacja.
- Zapisywanie, automatyczny szkic, duplikowanie, import i eksport JSON, udostępnianie konfiguracji linkiem.
- Lista celów farmienia, notatki, ukończone cele i własne obserwacje zabicia; przedział odrodzenia tylko przy udokumentowanym timerze.
- Responsywny interfejs, lokalne fonty, instalowalna PWA i tryb offline po pierwszym pełnym pobraniu.

## Zakres i wiarygodność

Baza jest **migawką referencyjną, nie pełną bazą serwera na żywo**. Zawiera 2151 przedmiotów powiązanych z potworami i dodatkowe źródła mapowe. Lista 71 Kingów / Wandering / wydarzeń nie oznacza 71 potwierdzonych lokalizacji. Nieznane miejsca pozostają oznaczone jako wymagające potwierdzenia. Nie mieszamy danych serwerów prywatnych.

Pobranie bazy: 23.10.2026. Ostatnia uwzględniona aktualizacja oficjalna: 16.10.2026. Snapshot społecznościowy RoseLite/RoseUtils jest przypięty do konkretnego commita; data pobrania nie potwierdza aktualności każdego wpisu w grze. `dist/content.js` zawiera odnośniki do wszystkich źródeł, a `scripts/catalog-overrides.json` jawne korekty.

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

## Wdrożenie

Serwowany jest katalog `dist`. `.openai/hosting.json` zachowuje tożsamość istniejącej strony. Historia poprzedniego projektu pozostaje w Git. Publikacja nowej wersji nie zmienia dostępu do strony ani nie kasuje zapisów użytkownika.

Prawa do danych, fontów i grafiki opisuje [THIRD_PARTY.md](THIRD_PARTY.md).
