// Original Polish explanations. Sources are optional references, not navigation targets.
export const ARTICLES = {
  'patch-inspector': {
    title:'Jak sprawdzić drop i znaleźć Kinga',
    intro:'Wyszukaj nazwę itemu, otwórz jego kartę i wybierz potwora z listy. Karta Kinga pokazuje jego mapy oraz wszystkie dropy zapisane w katalogu.',
    steps:['W Plecaku wpisz np. Plutorune lub Rift Boomer. Możesz też wpisać nazwę mapy.', 'Na karcie przedmiotu przejdź do „Skąd zdobyć”. Wybierz Kinga; obok jego nazwy zobaczysz poziom i miejsce.', 'W karcie Kinga otwórz mapę. Jeśli mamy zrzut mapy, obejrzysz go tutaj i powiększysz przyciskami.', 'Dodaj cel do farmienia. Po zabiciu Kinga zapisz własną obserwację; dziennik zachowa czas i notatki.'],
    facts:['Patch z 1 lipca 2026 dodaje spawny Crowned Asper King i Poisontail Scorpio King w Golden Ring.', 'Grand Master Devourer i Desert Scavenger mają nowe spawny w Wastelands.', 'Monster Inspector w kliencie gry pozwala sprawdzić aktualny wariant potwora, listę dropów i wpływ różnicy poziomów.'],
    links:[['drops','Otwórz plecak'],['atlas?planet=Orlo','Kingi na Orlo'],['journal','Mój plan farmienia']]
  },
  'patch-effigies': {
    title:'Effigy i Orby — co robić z tym dropem',
    intro:'Effigy służy do przywoływania Kingów. Surowy przedmiot i wersja Imbued to różne etapy przygotowania.',
    steps:['Znajdź odpowiednie Effigy w katalogu i sprawdź przypisane źródła dropu.', 'Artisan przygotowuje wersję Imbued. Przed craftingiem sprawdź wymagania receptury w grze.', 'Użyj Imbued Effigy na dozwolonej mapie. Garden of Aru przyjmuje Effigy z różnych planet, z wyjątkiem bossów Clan Field.', 'Przywołany King nie jest zarezerwowany dla przywołującego. Zaplanuj walkę z drużyną.'],
    facts:['Poisontail Scorpio King: Red Orb (L). Crowned Asper King i Wandering Asper: White Orb (L).', 'Golden Scarab King, Wandering Scarab i Wandering Snapper: Golden Orb (L).', 'Wandering Devourer: Black Orb (L), Wandering Terrasaurus: Green Orb (L), Wandering Mastyx: Blue Orb (L).', 'Na Golden Ring potwierdzono mapowy drop chemikaliów; lista mapowa nie jest przypisaniem do dowolnego pojedynczego moba.'],
    links:[['drops?q=Effigy&all=1','Obejrzyj Effigy'],['drops?q=Orb','Znajdź Orby'],['map?zone=Golden%20Ring','Golden Ring']]
  },
  'patch-october': {
    title:'Kingi Orlo, Wandering i Super Ulverick',
    intro:'Zmiany z 16 października 2026 są uwzględnione w kartach potworów.',
    facts:['Kingi otwartego świata Orlo mają poziom 250; osobne warianty Clan Field mają własne dane.', 'Wandering mają przedział odrodzenia 5–90 minut. Zapis zabicia uruchamia lokalne odliczanie okna, nie śledzenie serwera.', 'Super Ulverick jest powiązany z wydarzeniem w Desert of the Dead. Nie jest tym samym wpisem co Ulverick w instancji Cave of Ulverick.', 'Nagrody wydarzenia, w tym mount i banner, są pokazane oddzielnie od bezpośredniego dropu.'],
    links:[['atlas?planet=Orlo','Obejrzyj Kingów Orlo'],['atlas?q=Ulverick&kind=all','Warianty Ulvericka'],['journal','Zapisane zabicia']]
  },
  'patch-may': {
    title:'Co farmić po zmianach dropu',
    intro:'Zmiany z 31 maja 2026 zastąpiły część porad ze starszych poradników.',
    facts:['Kingi Orlo: Plutorune i Prismatic Dust.', 'Wandering: dodatkowo Separation Drill i Prismatic Fiber.', 'Drop gemy usunięto. Dawnego zestawu z drop gemami nie należy traktować jako aktualnego rozwiązania.', 'Klanowe skille dropu są stałe i mają pięć poziomów. Drop Quantity jest osobnym bonusem.'],
    links:[['item/17523','Plutorune'],['item/17713','Prismatic Dust'],['item/17714','Prismatic Fiber'],['item/11594','Separation Drill']]
  },
  'patch-uniques': {
    title:'Jak szukać broni Unique',
    intro:'Od zmiany z 26 czerwca 2025 broń Unique wypada z Kingów. Równocześnie zmieniono przypisania poszczególnych broni.',
    steps:['Znajdź broń po nazwie w Plecaku.', 'Otwórz listę Kingów na karcie przedmiotu. Sprawdź przy przypisaniu, czy pochodzi z patcha czy tabeli społeczności.', 'Potwierdź konkretną broń w Monster Inspector przed dłuższym farmieniem. Starsze przypisania mogą być nieaktualne.'],
    facts:['Unique Weapon Fragment to oddzielny przedmiot; nie jest automatycznie potwierdzeniem dropu konkretnej broni.', 'Brak procentowej szansy w katalogu oznacza brak potwierdzonych danych.'],
    links:[['item/8178','Rift Boomer'],['drops?q=Unique','Przedmioty Unique'],['atlas','Wybierz Kinga']]
  },
  'drop-guide': {
    title:'Poziom postaci a kara do dropu',
    intro:'Poniższe progi dotyczą standardowych zasad otwartego świata. Kara zmniejsza szansę dropu, nie jest szansą na konkretny przedmiot.',
    table:{headers:['Przewaga twojego poziomu','Kara'],rows:[['0–3 poziomy','0%'],['4–8 poziomów','10%'],['9–14 poziomów','25%'],['15–21 poziomów','50%'],['22 i więcej','75%']]},
    facts:['Dungeony, Clan Fields i specjalne potwory mogą mieć inne zasady.', 'W karcie potwora sprawdzaj jego dokładny wariant. Potwory o podobnej nazwie mogą mieć różne poziomy.', 'Aktualną karę sprawdzisz w Monster Inspector w grze.'],
    links:[['guide','Kalkulator kary'],['atlas','Znajdź potwora']]
  },
  'daily-dungeons': {
    title:'Cave of Ulverick — rozróżnij bossów',
    intro:'W katalogu osobno znajdziesz Ulvericka, Aracnę oraz Super Ulvericka z otwartego świata. Zawsze sprawdzaj mapę i wariant, a nie sam fragment nazwy.',
    steps:['Otwórz listę wariantów Ulvericka.', 'Wybierz kartę z lokalizacją Cave of Ulverick, jeżeli planujesz instancję.', 'Otwórz listę dostępnych dropów. Jeśli tabela nie jest kompletna, nie traktuj jej jako pełnej listy nagród dungeonu.', 'W buildzie zapisz sprzęt, skille i własną rotację. Dodaj instancję lub bossa do planu farmienia.'],
    facts:['Super Ulverick w Desert of the Dead jest osobnym wydarzeniem.', 'Starszy przewodnik daily quests nie potwierdza wymagań poziomowych każdego aktualnego wariantu instancji.'],
    links:[['atlas?q=Ulverick&kind=all','Warianty Ulvericka'],['atlas?q=Cave%20of%20Ulverick&kind=all','Bossy Cave of Ulverick'],['build','Przygotuj build']]
  },
  'community-skills': {
    title:'Wybieranie umiejętności do buildu',
    intro:'Wybierz klasę, otwórz Umiejętności i klikaj prawdziwe ikony skilli. Wybrany skill trafi do twojej listy.',
    steps:['Wybierz jedną z ośmiu klas po portrecie.', 'Przejdź do Umiejętności. Kategorie i wyszukiwarka zawężają katalog dla wybranej klasy.', 'Kliknij skill, podaj planowaną rangę i dopisz priorytet lub zastosowanie.', 'Zapisz build. Możesz zrobić kopię, wyeksportować JSON albo udostępnić konfigurację linkiem.'],
    facts:['Katalog pokazuje nazwy i ikony. Nie wylicza niepotwierdzonych kosztów SP ani zależności drzewka.', 'Możesz dodać własny skill, jeżeli nie ma go w migawce katalogu.'],
    links:[['build','Otwórz postać'],['saved','Moje zapisane buildy']]
  }
};
