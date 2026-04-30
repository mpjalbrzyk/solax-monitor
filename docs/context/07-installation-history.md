# Solax Monitor — Historia instalacji PV

**Cel pliku:** historia powstania instalacji fotowoltaicznej u Krzysztofa i Izabeli Jałbrzykowskich. Dokumentuje proces od oferty z 2021, przez przelewy 2022, po finalną instalację Solax w lutym 2023. Używana przez chatbota technicznego w trybie "kontekstowym" gdy pyta np. "kiedy moja instalacja powstała" albo "ile kosztowała".

---

## 1. Oferta inicjalna — SunWise Energy 2021

**Wykonawca:** SunWise Energy Sp. z o.o.  
**Telefon kontaktowy:** 502 919 391  
**Lokalizacja na dokumencie:** Bonifraterska 17, Warszawa (siedziba Sunwise)

**Pierwsza koncepcja systemu (2021/wczesna 2022):**
- Moc instalacji: **7,20 kWp** (18 paneli × 400 W)
- Panele: **Hyundai HiE-S400VG** (Hyundai Heavy Industries)
- Falownik: **SolarEdge SE7K** (string inverter, NIE hybrydowy)
- Optymalizatory: **18× SolarEdge P404** (per panel)
- Konstrukcja: K2 dachówka ceramiczna
- Skrzynka elektryczna: PHOENIX Contact
- Kable: solarne 6mm², uziom 16mm², zasilające 10mm²
- Powierzchnia dachu: 35 m²

**Wycena z koncepcji (przed zmianą planu):**
- Suma netto: 33 897,00 PLN
- VAT 8% (stawka dla mikroinstalacji do 50 kW): 2 711,76 PLN
- **Suma brutto: 36 608,76 PLN**

**Koordynaty GPS lokalizacji dachu:** 52,291401 N, 21,119825 E

**Założenia ROI z koncepcji (ważne dla chatbota historycznie):**
- Stary rachunek (przed PV): 3 960 PLN/rok = 330 PLN/m-c
- Cena energii (2021): 0,68 PLN/kWh
- Estymowane roczne zużycie: 5 824 kWh
- Estymowana produkcja roczna: 7 218 kWh
- Estymowane oszczędności po 20 latach: 285 327 PLN
- Estymowany break-even: rok 7 (zwrot z 36 608 PLN inwestycji)
- Estymowany wzrost cen energii rocznie: 12% (założenie)

**Założenia okazały się BARDZO trafne odnośnie wzrostu cen:** w 2021 cena była 0,68 PLN/kWh, w 2026 jest **1,22 PLN/kWh brutto** (z faktury PGE). To wzrost o 79% w 5 lat, czyli średniorocznie ~12,4%. Estymata SunWise trafiła w punkt.

**Założenia okazały się NIETRAFIONE odnośnie zużycia:** estymowali 5 824 kWh/rok przed PV. Faktyczne 2022 (rok przed PV): 5 122 kWh, 2023 (rok PV): 4 073 kWh, 2025: 4 282 kWh. Czyli 12-30% mniej niż estymata.

---

## 2. Zmiana planu — przejście na Solax z baterią

W okresie między listopadem 2022 (data faktury proformy 40/2022) a lutym 2023 (instalacja) **zmieniono falownik z SolarEdge SE7K na Solax X3-Hybrid-G4 10 kW** plus **dodano baterię magazynującą**.

**Powody zmiany (rekonstrukcja):**
- SolarEdge SE7K to string inverter on-grid bez baterii. Solax X3-Hybrid-G4 to hybrydowy z możliwością podpięcia baterii.
- W 2022 ruszyła nowa edycja Mój Prąd 4.0 z dotacjami na falownik hybrydowy + baterię (5000 PLN + 5000 PLN). To prawdopodobnie kluczowy powód zmiany.
- Net-billing wszedł w życie 1 kwietnia 2022 — instalacja z baterią staje się znacznie korzystniejsza ekonomicznie niż bez baterii (autokonsumpcja > eksport po RCEm).
- Solax X3-Hybrid-G4 jest oversized vs panele (10 kW falownik na 7,2-8 kWp paneli) — to typowe dla hybrydów żeby mieć zapas mocy dla ładowania baterii z grid w nocy.

**Konsekwencja:** przelewy poszły do SunWise pod oryginalnym nr 40/2022, ale finalna instalacja jest **innym sprzętem** niż w koncepcji. Faktura końcowa pewnie ma rozpisany nowy zestaw (do dostarczenia jeśli rodzice mają).

**Niezgodność mocy:** koncepcja 7,2 kWp (18× 400 W), panel Solax i developer portal pokazują 8,00 kWp. Różnica 0,8 kWp = 2 dodatkowe panele 400 W. Albo monter dorzucił 2 panele w trakcie zmiany planu, albo Solax raportuje moc DC paneli, podczas gdy SunWise w kosztorysie dawał moc AC. Nieblokujące dla projektu.

---

## 3. Przelewy

Trzy przelewy z konta wspólnego Krzysztofa i Izabeli (PKO BP) na konto SunWise Energy (mBank) między listopadem 2022 a lutym 2023, z tytułów "FAKTURA PROFORMA ZALICZKA NR.40/2022" oraz "FAKTURA PROFORMA ZALICZKA NR KOŃCOWA".

**Konkretne kwoty, daty, numery kont bankowych i breakdown w `docs/private/financials.md` (gitignored).**

Faktura PRO-FORMA 40/2022 z 24.11.2022 dotyczy pierwszej zaliczki — szczegóły w plikach `docs/source-documents/` (lokalne, gitignored).

**Brakująca dokumentacja:** faktura końcowa VAT (nie proforma) z 2023 lutego/marca, gdzie powinna być rozpisana finalna konfiguracja systemu Solax + bateria. Do dociągnięcia jeśli rodzice mają w archiwum.

---

## 4. Dotacja Mój Prąd — POTWIERDZONA

Otrzymano dotację z programu Mój Prąd 4.0 (zwrot na konto rodziców po pół roku od instalacji, czyli ~sierpień 2023). Pokryła znaczącą część kosztu instalacji — falownik hybrydowy, bateria, ewentualnie dodatkowe składowe (HEMS albo bonus).

**Konkretna kwota dotacji i breakdown w `docs/private/financials.md` (gitignored).**

**Dokładny breakdown:** TBD jeśli rodzice mają decyzję NFOŚiGW w archiwum (warto poszukać, ale niekrytyczne).

Realny koszt netto instalacji (po odjęciu dotacji) jest kluczową liczbą dla kalkulacji ROI break-even w sekcji finansowej dashboardu. Wszystkie kalkulacje typu "ile lat do zwrotu" bazują na tej wartości — wartość trzymana w `docs/private/financials.md`.

---

## 5. Faktyczna instalacja (luty 2023)

**Data podpięcia:** 23 lutego 2023 (z API Solax — `Online Time: 2023-02-23 12:42:48`)

**Konfiguracja docelowa:**
- Moc PV: **8,00 kWp** (z panelu Solax, prawdopodobnie 18-20 paneli × 400 W Hyundai HiE-S400VG)
- Falownik: **Solax X3-Hybrid-G4 10 kW** (3-fazowy, hybrydowy)
- Dongle WiFi: **WIFI3.0** (SN: SXTGG4YRYR)
- Bateria: model i kapacitet do potwierdzenia (sprawdzić na naklejce)
- BMS: komunikacja przez magistralę (CAN albo RS485) z falownikiem
- Net-billing automatycznie (instalacja po 1.04.2022)

**Komunikacja:**
- Solax Cloud (panel konsumencki): działa, account na krzysztof.jalbrzykowski@gmail.com
- Solax Developer Portal API: zarejestrowany, App Code b64c796a-d03d-4595-b54c-067908c615dc
- Stary Classic Token API jako fallback: tokenID `20240823170308016500959`, address `https://global.solaxcloud.com` (wygenerowany 23.08.2024)

**Bateria: znany problem.** W API Solaxa bateria nie jest zarejestrowana jako osobny device w `page_device_info`. Workaround przez `requestSnType=1` (przez SN inwertera). Detale w `04-api-spec.md` sekcja 7.1 i 9. Możliwa przyczyna: monter podczas instalacji nie przeszedł procedury rejestracji baterii w panelu Solax Cloud, choć BMS się skomunikował fizycznie.

---

## 6. Założenia ROI (do dashboardu sekcja "Financial")

**Punkty referencji:**
- Koszt instalacji netto (po dotacji): wartość w `docs/private/financials.md` (gitignored)
- Data instalacji: 23 lutego 2023
- Estymowana produkcja roczna z koncepcji SunWise: 7 218 kWh
- Faktyczna produkcja po 3 latach: średnio ~5 900-6 800 kWh/rok (z lifetime 18,3 MWh w 38 miesięcy)
- Faktyczna autokonsumpcja: ~99% (eksport tylko w okresach wysokiej produkcji bez zużycia)

**Estymata rocznych korzyści finansowych (2026):**
- Oszczędność z autokonsumpcji: produkcja netto × cena zakupu ≈ 6 000 kWh × 1,22 PLN = ~7 320 PLN
- Zarobki z eksportu (RCEm): drobne, ~200-500 PLN/rok
- Łącznie: **~7 500-8 000 PLN/rok** korzyści finansowych

**Estymowany break-even:** ~3,1 roku od instalacji = ~maj 2026, czyli **już teraz**! Konkretne liczby w `docs/private/financials.md`.

To jest świetna karta marketingowa dla case study. Realny zwrot z inwestycji w 3 lata zamiast 7 lat estymowanych pierwotnie. Powody:
- Wzrost cen energii znacznie szybszy niż w estymacie (+79% w 5 lat zamiast +12% rocznie liniowo)
- Dotacja 40% (16 000 z 40 000)
- Bateria zwiększa autokonsumpcję drastycznie

**Decyzja dla dashboardu:** w sekcji Financial pokazujemy "Twoja instalacja zwróciła się w X% / Y% / już się zwróciła". Algorytm w n8n daily aggregate: cumulative_savings = SUM(savings_pln + earnings_pln - cost_pln) od daty instalacji. Break-even gdy cumulative_savings >= 24 000 PLN.

---

## 7. Lekcje z procesu (dla chatbota technicznego i case study)

**Co poszło dobrze:**
- Decyzja o przejściu na hybrydowy z baterią okazała się słuszna (po net-billingu autokonsumpcja > eksport)
- Solax X3-Hybrid-G4 ma dobre API i wsparcie społeczności
- Mój Prąd 4.0 zwrócił znaczącą część kosztu inwestycji (szczegóły w `docs/private/financials.md`)
- Net-billing zadziałał — w 2025 zarobki z eksportu 484 PLN, plus oszczędności z autokonsumpcji
- Break-even w 3 lata zamiast 7 lat z estymaty

**Co poszło średnio:**
- Konfiguracja baterii w panelu Solax niedopilnowana (problem z zarejestrowaniem jako device)
- Falownik 10 kW na 8 kWp paneli oversized — mała efektywność wykorzystania mocy znamionowej falownika

**Co zostawia pole do optymalizacji w przyszłości:**
- Zmiana taryfy na G12w (weekendowa) dla prosumera z baterią — dodatkowe 10-20% oszczędności na imporcie
- Dodanie EV chargera (Solax X3-EVC) jeśli rodzina kupi auto elektryczne
- Rejestracja baterii poprawnie w Solax Cloud (skontaktować się z support)

---

## 8. Pliki referencyjne

W Project knowledge i archiwum:
- `Proj_WM7KSSe.pdf` — koncepcja SunWise z 2021 (8 stron, kompletna oferta)
- `faktura-PRO-FORMA_40_Jabrzykowski_Krzysztof_Izabela.pdf` — faktura proforma 28 000 PLN
- `pko_trans_details_20230222_174016.pdf` — przelew 28 000 PLN (2022-11-28)
- `pko_trans_details_20230222_174148.pdf` — przelew 6 000 PLN (2023-01-31)
- `pko_trans_details_20230222_174320.pdf` — przelew 6 000 PLN (2023-02-22)
- `Rachunki_Legiono_w.xlsx` — arkusz brata z analizą rachunków 2015-2023

---

*Ostatnia aktualizacja: 30 kwietnia 2026, status: zebrane dokumenty, dotacja 16 000 PLN potwierdzona, koszt netto 24 000 PLN, break-even ~maj 2026.*
