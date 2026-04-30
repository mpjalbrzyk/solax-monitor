// Plain-Polish explanations for every metric on the dashboard. One short
// paragraph per term — designed for the passive user (tata) who clicks
// the "?" icon and wants to understand what he's looking at.

export const GLOSSARY = {
  bilansInwestycji:
    "Łączne oszczędności + przychody z eksportu − koszty z sieci, od dnia montażu instalacji. Pokazujemy lepsze z dwóch źródeł: Solax-reported (z bieżących pomiarów inwertera) lub PGE-actual (z faktur). To liczba która ma się zrównać z kosztem instalacji 24 000 zł żeby instalacja się zwróciła.",

  solaxReported:
    "Suma oszczędności z bieżących pomiarów inwertera Solax. Niedoszacowana — Solax nie liczy całej energii pobranej z sieci, którą widzi licznik PGE. Realne oszczędności są wyższe, dlatego porównujemy też z PGE-actual.",

  pgeActual:
    "Hipotetyczny koszt energii bez instalacji PV (na bazie zużycia rodziny w latach 2015-2022) minus to co realnie zapłaciliście PGE po montażu. Ta liczba jest zwykle bliższa prawdy niż Solax-reported, bo bazuje na fakturach.",

  progZwrotu:
    "Rok kiedy łączny bilans inwestycji zrówna się z kosztem instalacji (24 000 zł netto po dotacji Mój Prąd). Liczony liniowo na bazie tempa z ostatnich 12 miesięcy — bez zakładania dalszego wzrostu cen energii. Realnie może wyjść wcześniej.",

  produkcjaTeraz:
    "Aktualna moc oddawana przez panele PV. Zero w nocy, przy całkowitym zachmurzeniu albo gdy falownik jest wyłączony. W słoneczne południe sięga 6-7 kW (max instalacji 8 kWp).",

  domZuzywa:
    "Bieżący pobór mocy przez dom. Liczone jako: produkcja PV + bateria − bilans z siecią. Lodówka, oświetlenie, sprzęt w czuwaniu = ~200-400 W. Pralka, zmywarka, piekarnik podnoszą do 2-3 kW.",

  oszczednosciMiesiaca:
    "Suma oszczędności z autokonsumpcji + przychód z eksportu (RCEm) − koszt poboru z sieci, za dni rozliczone w bieżącym miesiącu. Liczba dodatnia = instalacja zarabia, ujemna = teoretycznie więcej zapłaciliśmy niż zaoszczędziliśmy.",

  bateria:
    "Stan naładowania baterii w procentach pojemności. Brak = falownik nie ma podpiętej baterii (status fizycznej baterii do potwierdzenia z Krzysztofem — patrz O-003).",

  autokonsumpcja:
    "Procent produkcji PV zużyty bezpośrednio w domu, nieskierowany do sieci. 100% = wszystko co wyprodukowano poszło na zasilenie domu. Im wyżej, tym lepiej finansowo (eksport płaci po RCEm, a sieć kosztuje pełną stawkę G11).",

  rcem:
    "Rynkowa Cena Energii miesięczna — cena po której PGE odkupuje nadwyżki w net-billingu (od kwietnia 2022). Zwykle 200-500 zł/MWh, czyli 0,2-0,5 zł/kWh — kilka razy mniej niż cena zakupu (1,10 zł/kWh G11 brutto).",

  eksport:
    "Energia oddana do sieci, gdy produkcja PV przekraczała zużycie domu. W net-billingu rozliczana po RCEm. Średnio 200-500 zł/rok przychodu — drobne w porównaniu z autokonsumpcją.",

  importPobor:
    "Energia pobrana z sieci, gdy produkcja PV nie wystarcza. Zwykle wieczorem, nocą, w ciemne dni. Liczona po pełnej taryfie G11 (1,10 zł/kWh brutto).",

  produkcjaLifetime:
    "Suma energii wyprodukowanej przez panele PV od montażu instalacji. Pełny lifetime z licznika falownika to ~17 700 kWh (luty 2023 → dziś). Niżej widać tylko ostatnie ~13 miesięcy bo Solax API ma taki limit.",

  yoyPorownanie:
    "Year-over-Year — procentowa różnica produkcji w tym samym okresie tego roku vs poprzedniego. Plus = lepiej, minus = gorzej. Zwykle waha się ±10-20% w zależności od pogody i nasłonecznienia.",

  sredniaDzienna:
    "Średnia produkcja na dzień w wybranym miesiącu, liczona tylko z dni które mają dane. W szczycie sezonu (maj-lipiec) ~25-35 kWh/dzień, zimą (gru-sty) ~3-8 kWh/dzień.",

  najlepszyDzien:
    "Dzień miesiąca w którym instalacja wyprodukowała najwięcej energii. Maksimum tej instalacji (8 kWp w Ząbkach) to ~45 kWh w słoneczny czerwiec.",

  najlepszyMiesiac:
    "Miesiąc z najwyższą produkcją od początku zbierania danych. Zwykle maj lub czerwiec — najdłuższy dzień + jeszcze nie ma 30+°C upałów, które obniżają sprawność paneli.",

  bilansFinansowyDnia:
    "Oszczędności z autokonsumpcji + przychód z eksportu − koszt poboru. Wartość dodatnia = dzień na plus. Ujemna = pochmurno i zużyło się więcej niż wyprodukowano.",

  bilansFinansowyMiesiaca:
    "Suma dziennych bilansów w miesiącu. Wartość dodatnia = miesiąc zarabia. W maju może to być +800 zł, w grudniu blisko zera lub na minus.",
} as const;

export type GlossaryKey = keyof typeof GLOSSARY;
