# Solax Monitor — Kontekst projektu

**Cel pliku:** szybkie wprowadzenie do projektu w nowym czacie. Każdy kto przeczyta ten plik (włącznie z Claude'em i Claude Code) ma w 2 minuty komplet kontekstu.

---

## Kim jestem

Michał Jałbrzykowski (mpjalbrzyk), 28 lat, polski solopreneur z Ząbek pod Warszawą. Prowadzę kilka biznesów (ISABELL — marka odzieżowa, Szwalnia ISABELL — szwalnia kontraktowa, MonoRose Studio — agencja AI fashion photo), plus aktywną praktykę freelance w marketing automation, e-commerce i integracjach.

Pozycjonuję się jako praktyk: testuję AI i automatyzację u siebie zanim polecę klientom. Stack na co dzień: PrestaShop, n8n, Make.com, BaseLinker, Shoper, Ecomail, Meta Ads, Next.js, Supabase, Claude Code.

---

## Co mam — moja instalacja fotowoltaiczna

**Falownik: Solax X3-Hybrid-10.0-M** (linia G4, sufiks "M" = Master, cluster-capable, działa też standalone), zainstalowany 23 lutego 2023. Numer modelu wewnętrzny `9318.00083.01`. Moc instalacji PV: **8 kWp** (18-20 paneli Hyundai HiE-S400VG 400W). Komunikacja przez WiFi dongle WIFI3.0, dane synchronizowane z Solax Cloud co 5 minut.

API Solax mapuje ten falownik jako `deviceModel=14` (linia G4 dla businessType=1 Residential), więc cała dokumentacja Solax G4 jest aplikowalna. Fizyczne oznaczenie produktu z naklejki jest jednak inne niż dotąd opisywaliśmy — to **X3-Hybrid-10.0-M**, nie "X3-Hybrid-G4 10 kW".

**Specyfikacja z naklejki falownika (zdjęcie 30.04.2026):**
- Max DC Voltage: 1000V, MPP Range: 180-950V
- Max DC Current Input A/B: 26A / 14A
- Battery Voltage Range: 180-650V (HV battery)
- Max Charge/Discharge: 30A / 30A
- AC Output: 10000W (16.1A), Apparent: 11000VA
- Off-grid: 10000VA, 400/230V
- IP65, temp -35°C do +60°C

**Bateria — status do potwierdzenia (30.04.2026).** Display falownika pokazuje "Bateria 0.0V" na porcie baterii. Trzy możliwe scenariusze (do rozstrzygnięcia z Krzysztofem):
- **A** (najbardziej prawdopodobny): bateria nigdy nie została zainstalowana. SunWise dał tylko falownik hybrydowy bez baterii. Mój Prąd 4.0 mógł dać 5000 PLN za sam hybrydowy falownik
- **B**: bateria fizycznie istnieje, ale jest odłączona / wyłączona
- **C**: bateria była, jest uszkodzona, falownik jej nie widzi

Patrz O-003 w `03-decisions.md`. Schemat bazy (`device_realtime_readings.device_type=2`, pola w `daily_aggregates`) zostaje future-proof na wypadek scenariusza B/C lub przyszłego zakupu baterii.

**Wykonawca instalacji:** SunWise Energy Sp. z o.o. (Warszawa, Bonifraterska 17, tel. 502 919 391). Pierwsza koncepcja z 2021 zakładała SolarEdge SE7K bez baterii, w trakcie zmieniono falownik na Solax X3-Hybrid-10.0-M (hybrydowy, gotowy pod baterię). Czy bateria została faktycznie zainstalowana — TBD (patrz wyżej). Detale w `07-installation-history.md`.

**Identyfikatory urządzeń (z API i panelu Solax):**
- Device SN (falownik): `H34B10H7319017`
- Registration No. (dongle WiFi): `SXTGG4YRYR`
- Plant ID (Solax Cloud): `1613529907775754244`
- Plant name w Solax Cloud: `Legionow17 Site 1`
- deviceModel: 14 (linia G4 dla businessType=1 Residential, fizycznie X3-Hybrid-10.0-M)
- Model number (z naklejki): `9318.00083.01`

**Identyfikatory umowy i licznika (z faktury PGE):**
- Adres: Legionów 17, 05-091 Ząbki
- Współrzędne GPS: 52,291401 N, 21,119825 E
- Nabywca: Krzysztof Jałbrzykowski + Izabela Jałbrzykowska (rodzice Michała)
- Sprzedawca: PGE Obrót S.A.
- Numer klienta PGE: `10663516`
- Numer PPE: `590543570401506181`
- Numer licznika: `13931416`
- Taryfa: G11 (jednostrefowa, całodobowa)

**Koszt instalacji:**
- Brutto z przelewów: **40 000 PLN** (3 przelewy do SunWise listopad 2022 do luty 2023)
- Dotacja Mój Prąd 4.0: **16 000 PLN** (potwierdzona)
- Realny koszt netto po dotacji: **24 000 PLN** (potwierdzony 30.04.2026)
- Detale w `07-installation-history.md`

**Statystyki na 29 kwietnia 2026 (z API Solax):**
- Lifetime production (plant.totalYield): 17 716,96 kWh
- Lifetime production (device.totalYield): 18 144,60 kWh
- Lifetime AC output (device.totalACOutput): 18 320,60 kWh
- Daily yield 29.04.2026: 17,40 kWh
- Daily self-use rate: 100%, monthly: 99,85%

**Zużycie z sieci (z faktury PGE 2025):**
- Łącznie 2025: 4282 kWh
- Wprowadzono do sieci 2025-07 do 2026-02: 1461 kWh za 484 PLN brutto

Gwarancja aktywna do 2033.

---

## Konta i własność

**Solax Cloud + Solax Developer Portal:** krzysztof.jalbrzykowski@gmail.com (tata, formalny właściciel instalacji). Tu generujemy token API, tu są dane historyczne.

**Umowa PGE:** Krzysztof + Izabela Jałbrzykowscy (oboje na umowie kompleksowej).

**Aplikacja Solax Monitor (ten projekt):** Michał (mpjalbrzyk) jako główny admin i developer. W Supabase będę głównym userem z pełnymi uprawnieniami. Tata, mama i brat zostaną dodani jako userzy z ograniczonym dostępem później (po MVP).

**Maile dla testów MVP:**
- Główny admin (active role): **mpjalbrzyk@gmail.com**
- Test passive role (do testowania flow taty): **mpjecommerce@gmail.com**

To rozdzielenie data layer (konto Solaxa i PGE na rodziców) od admin layer (aplikacja na Michała) jest świadome — pozwala mi rozwijać projekt bez konieczności przenoszenia własności kont.

---

## Z czym przychodzę — problem

Panel Solax Cloud jest niewygodny i mało intuicyjny. Zaprojektowany dla instalatora, nie dla mojej rodziny. Trzy konkretne warstwy bolączek:

**Codzienne zarządzanie:** brak proaktywnych powiadomień, dane w silosie (rodzice i brat nie używają), dane w kWh zamiast PLN, brak prostych porównań rok do roku.

**Finansowy ślepy zaułek:** nie wiem ile dziś zaoszczędziłem, ile zapłaciłem za pobór z sieci, jaki mam ROI. Ręczne liczenie w Excelu (brat już taki zrobił, jest w Project knowledge jako "Rachunki Legionów").

**Brak supportu po sprzedaży:** to luka rynkowa polskiej fotowoltaiki w ogóle. Firmy montażowe znikają, komponenty chińskie, dokumentacja po angielsku, error codes nikt nie wytłumaczy.

---

## Co chcę zbudować

Web aplikację z dashboardem i AI chatbotem, plus mailowe raporty cykliczne. Zastępca Solax Cloud zbudowany pod siebie i potencjalnie pod klientów (multi-tenant od dnia pierwszego).

**Trzy filary:**

1. **Dashboard webowy** pod własnym URL (`solar.mpjalbrzyk.pl`) z magic link auth (rodzice i brat dostają uproszczony widok). Live view, dzień, tydzień, miesiąc, rok do roku, sekcja finansowa z ROI.

2. **Email digest** tygodniowy (poniedziałek rano) i miesięczny (1. dnia), plus alerty natychmiastowe na awarie i anomalie.

3. **AI Chatbot w dwóch trybach (PRYWATNY, tylko dla zalogowanych):** operacyjny (rozmawia o moich danych, zna current state) i techniczny (RAG na dokumentacji falownika, pomaga przy error codes, daje konkretne instrukcje serwisowe).

---

## Stack docelowy (po D-011, 30.04.2026)

- **Supabase free tier** — Postgres + Auth (magic link) + pgvector + Storage + **Edge Functions** + **pg_cron** (zastępuje n8n)
- **Next.js 15 + Vercel free tier** — dashboard + chatbot
- **Anthropic Claude API** (Sonnet 4.6/4.7 + Haiku 4.5) — chatbot z tool calling
- **Resend free tier** — wysyłka emaili (3000/mc darmo)
- **Voyage AI** — embeddings dla RAG (voyage-3 model, 1024 dim)
- **Claude Code** — narzędzie kodowania w terminalu
- **GitHub** — repozytorium prywatne `solax-monitor`, integracja z Vercel dla auto-deployment

**Sześć kont, pięć darmowych.** Tylko Anthropic API kosztuje (~10-30 PLN/mc).

**Wycięte z planu (D-011):** ~~n8n self-hosted~~, ~~Hetzner Cloud VPS~~, ~~Healthchecks.io~~ (zastąpione Supabase Logs).

Run rate całości: **~10-30 PLN/m** (był 30-60 PLN/m). Czas wdrożenia: 6-7 dni roboczych.

---

## Klucz: backfill historyczny działa

Solax Developer Portal API udostępnia 3 lata danych historycznych od daty rejestracji (luty 2023). Jednorazowy import na start = MVP od razu wygląda jak dojrzały produkt z porównaniami rok do roku i ROI od początku instalacji.

Plus mamy arkusz Excel od brata z danymi 2015-2023 (zużycie z sieci, koszty PGE) — idzie do tabeli `historical_yearly_consumption` jako punkt odniesienia dla "życia przed PV".

---

## Status integracji API (kwiecień 2026)

**Solax Developer Portal (PRIMARY):** zarejestrowany. Aplikacja "Solax Monitor" utworzona z App Code `b64c796a-d03d-4595-b54c-067908c615dc`. Service API scope na razie wszystkie checkboxy (do ograniczenia przy security review). Base URL: `https://openapi-eu.solaxcloud.com`. OAuth 2.0 client_credentials flow.

**Limity API (free default):** 100 hits/min, 1 000 000 hits/day, total cap 1 000 000 000 hits. Dla naszego setupu to praktycznie nielimitowane.

**Token TTL:** 30 dni. Wymaga refresh joba w **Supabase Edge Function** (cron co ~25 dni).

**Smoke test API end-to-end PRZESZEDŁ** 29 kwietnia 2026 wieczorem. Wszystkie kluczowe endpointy zwracają poprawne dane. Schemat Supabase zaprojektowany 1:1 pod realne payloady.

**Solax Classic Token API (FALLBACK):** tokenID `20240823170308016500959` (wygenerowany 23.08.2024), Base URL: `https://global.solaxcloud.com`. To inny mechanizm niż Developer Portal — prostszy, mniej endpointów, ale działa równolegle. Trzymamy jako disaster recovery jeśli Developer Portal padnie.

**Quirk: bateria niezarejestrowana w API** jako osobny device. Workaround: polling przez `requestSnType=1` (przez SN inwertera). Detale w `04-api-spec.md` sekcja 7.1 i 9.

Detale techniczne API w `04-api-spec.md`.

---

## Status taryfy (kwiecień 2026)

**Sprzedawca:** PGE Obrót S.A.
**Taryfa:** G11
**Status:** VERIFIED na bazie realnej faktury PGE marzec 2026
**Średnia cena brutto:** 1,22 PLN/kWh (z faktury)
**Opłaty stałe:** ~43 PLN/m-c brutto = ~518 PLN/rok

Detale i SQL insert w `06-tariff.md`.

---

## Ścieżka komercjalizacji (otwarta, nie wymuszona)

Architektura multi-tenant od dnia pierwszego pozwala bez refaktora przejść z "tool dla mojej rodziny" do SaaS. Domowy plan 49 PLN/m, firmowy 199 PLN/m. Run rate przy 100 klientach: ~700 PLN/m, przychód: 4900-19900 PLN/m. Marża zdrowa.

Drugi tryb chatbota (techniczny support) to potencjalnie najsilniejsza karta marketingowa, bo dosłownie nie istnieje na polskim rynku.

---

## Decyzje status (kwiecień 2026)

1. ~~Multi-tenant od dnia pierwszego~~ — **TAK** (D-002)
2. ~~Chatbot publiczny vs tylko zalogowany~~ — **PRYWATNY tylko dla zalogowanych** (D-010)
3. Email digest dla taty: uproszczony czy jeden format — rekomendacja: dwa formaty, decyzja odłożona do Fazy 6 (O-002)
4. ~~Hosting n8n: Hetzner DE czy polski VPS~~ — **WYCIĘTE, używamy Supabase Edge Functions** (D-011)
5. ~~Domena~~ — **solar.mpjalbrzyk.pl** (D-004)
6. ~~Stack automatyzacji: n8n czy Supabase Edge Functions~~ — **Supabase Edge Functions + pg_cron** (D-011, 30.04.2026)

Pełny log decyzji w `03-decisions.md`.

---

## Czego potrzebuję zanim ruszamy

**Zebrane:**
- ✅ Pełny model falownika (X3-Hybrid-G4 10 kW potwierdzony)
- ✅ Device SN i Registration No. dongle (zebrane)
- ✅ Data instalacji (23.02.2023)
- ✅ Solax Developer Portal account + Application + Client ID/Secret + smoke test API
- ✅ Solax Classic API token (fallback)
- ✅ plantId z API (1613529907775754244)
- ✅ Realne ceny taryfy 2026 z faktury PGE
- ✅ Realne RCEm 2025-07 do 2026-02 z faktury PGE
- ✅ Numer klienta PGE, PPE, numer licznika
- ✅ Arkusz Excel od brata (Rachunki Legionów) z historią 2015-2023
- ✅ Koszt instalacji brutto (40 000 PLN) i historia przelewów do SunWise
- ✅ Koncepcja systemu z 2021 (SunWise) jako referencyjna
- ✅ Maile testowe (mpjalbrzyk + mpjecommerce)
- ✅ Współrzędne GPS dachu

**Do zebrania:**
- ⏳ Decyzja O-002 (format maila weekly dla taty)
- ⏳ Kapacitet i model baterii (sprawdzenie na fizycznej baterii)
- ⏳ Potwierdzenie dotacji Mój Prąd 4.0 (czy była, ile, na co)
- ⏳ Faktura końcowa VAT od SunWise (nie proforma) — opcjonalnie
- ⏳ Email mamy, brata, taty (poza testowymi) — później
- ⏳ PDF-y dokumentacji X3-Hybrid-G4 (User Manual, Error Code List, Datasheet) do RAG
- ⏳ RCEm 2024-01 do 2025-06 (18 miesięcy luki) — dociągnięcie z PSE

**Założenia kont serwisów (po D-011):**
- ⏳ Supabase project (region EU, Frankfurt)
- ⏳ Vercel project (Hobby plan, link do GitHub)
- ~~Hetzner Cloud CX22 z postawionym n8n self-hosted~~ ❌ WYCIĘTE w D-011
- ⏳ Resend project z weryfikacją domeny mpjalbrzyk.pl
- ⏳ Voyage AI account
- ⏳ GitHub repo `solax-monitor` (prywatne)
- ⏳ Anthropic API key z włączonym billingiem

---

## Powiązane dokumenty w Projekcie

- `00-context.md` — TEN PLIK, szybkie wprowadzenie
- `01-strategia.md` — pełna strategia, mapa 10 problemów, architektura, plan fazowy, koszty
- `02-case-study.md` — narracyjna wersja do content/marketingu, dialogi z chatbotem, plan dystrybucji
- `03-decisions.md` — log decyzji technicznych i biznesowych podejmowanych w trakcie projektu
- `04-api-spec.md` — specyfikacja Solax Developer Portal API, OAuth flow, endpointy, realne payloady, schemat Supabase
- `05-implementation-plan.md` — przewodnik dla Claude Code, struktura repo, kolejność faz
- `06-tariff.md` — konfiguracja taryfy PGE G11, RCEm history, algorytm kalkulacji finansowej
- `07-installation-history.md` — historia powstania instalacji (SunWise, koncepcja, przelewy, zmiana planu)
- `Rachunki_Legiono_w.xlsx` — arkusz brata z analizą rachunków 2015-2023
- `Proj_WM7KSSe.pdf` — koncepcja systemu PV od SunWise z 2021
- `faktura-PRO-FORMA_40_Jabrzykowski_Krzysztof_Izabela.pdf` — faktura proforma 28k PLN
- `pko_trans_details_*.pdf` — 3 potwierdzenia przelewów (28k + 6k + 6k = 40k PLN)
- `project-instructions.md` — instrukcje dla Claude'a w tym projekcie
- `.env.example` — template zmiennych środowiskowych dla repo

---

*Ostatnia aktualizacja: 30 kwietnia 2026, status: pre-development, dokumentacja kompletna z dotacją TBD i baterią TBD.*
