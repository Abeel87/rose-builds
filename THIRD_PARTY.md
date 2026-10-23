# Źródła i prawa

## Dane gry

ROSE Online i związane z nim nazwy należą do odpowiednich właścicieli, w tym Rednim Games. ROSE Companion jest nieoficjalnym narzędziem fanowskim, bez afiliacji z wydawcą.

Fakty katalogowe (nazwy, klasyfikacje, wybrane parametry liczbowe i powiązania dropów) pochodzą z publicznej migawki [DrezByte/RoseLite](https://github.com/DrezByte/RoseLite/tree/613d91e2d37a3c445877e28219c60652cf9774db), commit `613d91e2d37a3c445877e28219c60652cf9774db`, pobranej 23.10.2026:

- `RoseData/list_items.json`
- `RoseData/drops.json`
- `RoseData/list_npc.json`
- `overlay/kings.json` (wyłącznie identyfikacja i mapy wybranych Kingów, bez niepotwierdzonych timerów).

RoseLite wskazuje RoseUtils jako źródło danych dropów. Zgodnie z upstream `NOTICE` licencja MIT kodu RoseLite nie obejmuje danych i materiałów gry w `RoseData`. Nie przypisujemy tym danym licencji MIT. Nie kopiujemy kodu UI, tekstów poradników ani grafik gry ze źródłowego projektu. Zawarte tutaj zestawienie faktów ma wskazane pochodzenie i nie stanowi oficjalnej, kompletnej bazy serwera.

Oficjalne korekty i krótkie parafrazy pochodzą z forum [ROSE Online Global](https://forum.roseonlinegame.com/). Dokładne URL-e, daty i zakres wykorzystania są w `dist/content.js`, a oznaczenie źródła każdej korekty w `scripts/catalog-overrides.json` i wynikowym katalogu. Nie kopiujemy pełnych artykułów.

## Fonty

Manrope: Copyright 2018 The Manrope Project Authors (https://github.com/sharanda/manrope).

Cinzel: Copyright 2012 The Cinzel Project Authors (https://github.com/NDISCOVER/Cinzel).

Lokalne pliki WOFF2 są objęte SIL Open Font License 1.1. Pełną licencję i informacje o autorach zachowano w `dist/assets/fonts/OFL-1.1.txt` oraz `FONT-NOTICES.txt`.

## Grafika i ikony

`dist/assets/junon-dawn.png` to nowa ilustracja wygenerowana na potrzeby aplikacji. Jest dekoracyjną interpretacją klimatu ROSE, nie zrzutem ekranu ani mapą lokacji. Oznaczenie jest widoczne na obrazie w interfejsie.

Założenia promptu: panoramiczna scena 3:1 inspirowana radosnym MMORPG z początku lat 2000; dolina z rzeką, miasto o koralowych dachach i jasnej wieży, lewitująca wyspa z kryształami, pastelowe turkusy i brzoskwiniowy świt; po prawej mały podróżnik i niebieski stworek, po lewej spokojna przestrzeń na tekst; bez tekstów, logotypów i interfejsu. Wygenerowano 23.10.2026.

Ikony i znak aplikacji są prostymi wektorami zapisanymi w `dist/ui.js` i `dist/icon.svg`.
