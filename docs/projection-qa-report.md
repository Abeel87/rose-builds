# Niezależna kontrola punktów Kingów na mapach

Wynik: **PASS** dla przeliczenia IFO → pełny obraz minimapy, osi Y, ramki 64 px oraz rozróżnienia Wasteland 78/79. Kontrola nie potwierdza bieżących ustawień serwera ani czasu respawnu.

## Dowód niezależny: współrzędne gry na screenshotach Wastelandów

Autor HoneyBuns, konto Game Master, [oficjalne forum](https://forum.roseonlinegame.com/topic/3604-dr-ega-in-need-of-repairs/). Post ma datę 2023-01-15, natomiast obecne adresy plików zawierają katalog 2024_12. Data wykonania samych screenshotów jest nieznana. Są to punkty zadania Dr. Ega, użyte wyłącznie do kalibracji.

| Strefa | Współrzędne w grze | Piksele pełnego DDS | Błąd po dopasowaniu tekstury |
|---|---|---|---|
| 78 | 5512, 5141 | 284.80, 183.60 | 0.68 px mapy / 0.30 px screenshotu |
| 79 | 5601, 5045 | 320.40, 222.00 | 0.90 px mapy / 0.84 px screenshotu |

Teksturę dopasowano do każdego screenshotu niezależnie od wyświetlonych współrzędnych gracza. Następnie współrzędne przeliczono wzorem klienta i porównano z centrum strzałki. Ręczny odczyt środka strzałki ma dokładność około 2 px screenshotu.

## Junon: archiwalne obszary Kingów

Pomic King 1300 w Breezy Hills trafia do jedynego czerwonego koła. Dwa Grunter King 209 w Anima Lake trafiają do dwóch zachodnich kół. Trzy Guardian Tree 208 i dwa Wise Clown 1343 w Forest of Wisdom trafiają do odpowiednich pięciu oznaczonych obszarów; wiki nie opisuje każdego koła oddzielną nazwą, więc nazwę dostarcza IFO. Archiwalne koła są ogólne i nie wyczerpują dzisiejszych rekordów klienta.

Jelly King 203: screenshot bloga z 2025-04-18 pasuje do aktualnego terenu w skali 1:1 z przesunięciem (133,47). Punkty IFO leżą przy dolno-zachodniej części szerokiego ręcznego zaznaczenia. Nie użyto tego obrazu jako dokładnej kontroli punktu.

## Wzór

`B = 16 * gridPerPatch * gridSize` (cm). `globalXY = rawIFOxy + 32.5 * B`. `px = 64 + (globalX - startX * B)/(B/64)`. `py = 64 + ((65-startY)*B - globalY)/(B/64)`. Normalizacja przez pełną szerokość i wysokość obrazu, wraz z ramką.

Źródła: otwarta implementacja [rose-offline-client](https://github.com/exjam/rose-offline-client/blob/9802251b1f99921cc67408273e0c1e0133153a55/src/ui/ui_minimap_system.rs) i [rose-offline zone_database](https://github.com/exjam/rose-offline/blob/4a648ba720278f69bb8ee6257564175c271e081c/rose-data-irose/src/zone_database.rs). To implementacja referencyjna; zbieżność z rzeczywistą grą sprawdzono niezależnymi screenshotami.

Pełne wejścia, SHA256, daty, pomiary oraz źródła obrazów: `projection-qa-report.json`. Oryginały danych i aplikacja pozostały bez zmian.
