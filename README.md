# ROSE Online Global Build Planner

PWA do przeglądania archetypów i zapisywania własnych konfiguracji postaci dla ROSE Online Global / Rednim Games.

## Uruchomienie

```bash
python -m http.server 8000 --directory dist
```

Otwórz `http://localhost:8000`. Wersja opublikowana: https://rose-global-build-planner.gipgibon.chatgpt.site

PWA i offline działają przez service worker po pierwszym otwarciu na HTTPS lub localhost. Zapis jest lokalny w przeglądarce, bez konta.

## Stan danych

- 8 klas końcowych i 16 archetypów.
- Stan archetypów: `PARTIALLY VERIFIED`. To nie są pełne rozpiski punktów.
- Szczegółowe pule SP/statów, koszty i wymagania skilli oraz item progression wymagają weryfikacji. Kalkulator skilli blokuje niezweryfikowany przydział.
- Własne staty, sprzęt i notatki można zapisać; nie są traktowane jako zweryfikowane rekomendacje.

Źródła i daty weryfikacji są w `dist/data/game.js` i widoku `SOURCES`. Dane gry są oddzielone od UI (`dist/app.js`), a walidator w `dist/data/validation.js`.

## Test podstawowy

```bash
node --check dist/app.js
node --check dist/data/game.js
node --check dist/data/validation.js
node --check dist/sw.js
```

Wersja bez zależności npm: statyczne moduły JavaScript, CSS i manifest PWA.
