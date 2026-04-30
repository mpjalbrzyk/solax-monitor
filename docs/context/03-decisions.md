# Solax Monitor — Log decyzji

**Cel pliku:** spis wszystkich decyzji technicznych i biznesowych podejmowanych w trakcie projektu, z uzasadnieniem. Punkt referencji żeby nie wracać do dyskusji "dlaczego wybraliśmy X" za pół roku.

Format: każda decyzja ma datę, kontekst, opcje rozważane, wybór, uzasadnienie.

---

## D-001: Stack techniczny

**Data:** kwiecień 2026, faza pre-development. **AKTUALIZACJA D-011 (30.04.2026): wycięcie n8n + Hetzner.**  
**Decyzja:** Supabase (DB + Auth + Storage + Edge Functions + pg_cron) + Next.js 15 + Anthropic Claude API + Resend + Vercel + GitHub

**Alternatywy rozważone:**
- n8n self-hosted na Hetzner (odrzucone w D-011, patrz niżej)
- Make.com (odrzucone: koszty per-operation)
- Firebase zamiast Supabase (odrzucone: brak natywnego pgvector, gorszy SQL, vendor lock-in)
- OpenAI zamiast Anthropic (odrzucone: gorsze tool calling, słabsze long context, cena Sonnet 4.6/4.7 vs GPT-4 wychodzi podobnie)
- Cloudflare zamiast Vercel (odrzucone: gorszy DX dla Next.js, więcej setup)

**Uzasadnienie:** stack zlockowany na 6 serwisach z czego 5 darmowych (Supabase free, Vercel Hobby, GitHub free, Resend free 3k/mc, Voyage AI mikropłatności). Tylko Anthropic API kosztuje (~10-30 PLN/mc dla rodziny). Cały kod w jednym repo Git, cron i automatyzacje też (jako Edge Functions w TypeScript). Zero osobnych serwerów do utrzymania.

---

## D-002: Multi-tenant od dnia pierwszego

**Data:** kwiecień 2026  
**Decyzja:** TAK, architektura multi-tenant od początku przez RLS w Supabase

**Alternatywy rozważone:**
- Single-user MVP, refactor na multi-tenant później (odrzucone)

**Uzasadnienie:** RLS w Postgresie to kilka godzin dodatkowej pracy na starcie, ale refactor single-user → multi-tenant to dni roboty plus ryzyko bugów security. Plus otwiera ścieżkę komercjalizacji bez przepisywania backendu. Plus mam i tak 2 dodatkowych userów (tata, brat) od dnia pierwszego.

---

## D-003: ~~Hosting n8n — Hetzner DE~~ ANULOWANE w D-011

**Data:** kwiecień 2026, anulowane 30.04.2026  
**Status:** ❌ **WYCOFANE.** Patrz D-011 niżej. Zostaje tu jako historia decyzji.

~~Decyzja: Hetzner Cloud CX22, lokalizacja Niemcy, koszt 5 EUR/m~~

Powód anulowania: Supabase Edge Functions + pg_cron w pełni zastępują n8n dla naszego use case (kilka workflow z prostym crontab). Eliminacja osobnego serwera oszczędza 5 EUR/mc plus uproszczenie operacyjne (jeden panel zamiast dwóch).

---

## D-004: Domena startowa

**Data:** 29 kwietnia 2026  
**Decyzja:** subdomena `solar.mpjalbrzyk.pl` na MVP

**Alternatywy rozważone:**
- Osobna domena marki od początku np. `okoenergii.pl`, `domowaenergia.pl` (odrzucone na ten etap, można zarejestrować później jeśli idziemy w produkt)

**Uzasadnienie:** zero kosztów (mam mpjalbrzyk.pl), szybki start, łatwo migrować później na osobną domenę. Brand przy MVP nie ma znaczenia, ważniejsze że szybko wjeżdżamy.

---

## D-005: Solax API — Developer Portal zamiast Classic API

**Data:** 29 kwietnia 2026  
**Decyzja:** używamy Solax Developer Portal (developer.solaxcloud.com), nie klasycznego Token API z panelu konsumenckiego

**Alternatywy rozważone:**
- Classic Token API (Token ID + SN, prosty endpoint)

**Uzasadnienie:** 
1. Solax oficjalnie rekomenduje Developer Portal jako preferowany sposób integracji
2. Limity są o rząd wielkości wyższe (100/min vs 10/min, 1M/day vs 10k/day)
3. Token TTL 30 dni vs Classic gdzie token wygasa po 3 miesiącach z koniecznością ręcznego "extend"
4. OAuth 2.0 to standard branżowy, łatwiej rozbudować w przyszłości (np. user authorization flow gdyby kiedyś robić "Connect your Solax account" feature)
5. W panelu konsumenckim Krzysztofa nie ma menu API anyway (różne wersje regionalne)

**Konsekwencje:**
- Trzeba zaimplementować refresh token job w n8n (raz na ~25 dni)
- Auth w n8n używa Bearer token w Authorization header, nie tokenId w query string
- Setup minimalnie więcej skomplikowany ale standardowy

---

## D-006: OAuth grant type — client_credentials

**Data:** 29 kwietnia 2026  
**Decyzja:** machine-to-machine flow z `grant_type=client_credentials`, bez callback URL

**Alternatywy rozważone:**
- `authorization_code` (user-facing OAuth flow z redirect)

**Uzasadnienie:** my serwer-do-serwera ciągniemy dane Twoim własnym kontem właściciela instalacji, nie robimy "Login with Solax" dla zewnętrznych userów. Client credentials to właściwy pattern dla server-to-server integration. Callback URL i redirect URL zostawiamy puste w aplikacji Solax.

---

## D-007: Service API scope — pełny do prototypu

**Data:** 29 kwietnia 2026  
**Decyzja:** wszystkie checkboxy zaznaczone (import/export_control, Information Access, Data Monitoring, Inverter Overall Control, Inverter Workmode Control, A1-HYB-G2 Workmode Control, Inverter Remote Control Mode, EV Charger Control)

**Uzasadnienie do produkcji:** scope do zminimalizowania przed go-live w SaaS. Realnie potrzebujemy tylko Information Access Service, Data Monitoring Service, import/export_control. Reszta to remote control których nie używamy.

**TODO przed komercjalizacją:** security review, ograniczenie scope, audit logs.

---

## D-008: Rozdzielenie kont — Solax na Krzysztofie, aplikacja na Michale

**Data:** 29 kwietnia 2026  
**Decyzja:** konto Solax Cloud i Developer Portal pozostaje na krzysztof.jalbrzykowski@gmail.com (właściciel instalacji). Aplikacja Solax Monitor (Supabase, Vercel, GitHub) pod Michał (mpjalbrzyk).

**Alternatywy rozważone:**
- Wszystko na jednym koncie Krzysztofa (odrzucone: Michał jest developerem, lepsze rozdzielenie ról)
- Przepięcie konta Solax na Michała (odrzucone: skomplikowane, wymaga interakcji z support Solax)

**Uzasadnienie:** czyste rozdzielenie data layer (Krzysztof → Solax → API) od admin layer (Michał → Supabase → aplikacja). Pozwala na niezależny rozwój projektu. Tata nie traci dostępu do swojej instalacji w panelu Solaxa. Magic linki dla taty i brata pójdą na ich emaile osobno.

---

## D-009: Repozytorium kodu — GitHub prywatny + lokalnie

**Data:** 29 kwietnia 2026  
**Decyzja:** prywatne repo na GitHub od dnia pierwszego, integracja z Vercel dla auto-deployment

**Uzasadnienie:** Vercel deployuje przez GitHub (push to main = deploy), wersjonowanie kodu krytyczne, opcja open source później przez fork z usuniętymi sekretami. **Workflow trzymane jako TypeScript w `supabase/functions/`** (po D-011) — versioned w Git, code review przez PR, łatwa edycja przez Claude Code.

---

## D-010: Chatbot prywatny (tylko zalogowani)

**Data:** 30 kwietnia 2026  
**Decyzja:** Chatbot dostępny TYLKO dla zalogowanych użytkowników (rodzina + ewentualni przyszli klienci SaaS). Brak trybu publicznego.

**Alternatywy rozważone:**
- Tryb techniczny publiczny (RAG na dokumentacji Solax) z rate limit po IP, jako lead magnet (odrzucone)

**Uzasadnienie:** to aplikacja rodzinna z opcją komercjalizacji, nie publiczne narzędzie demo. Konsekwencje:
- Magic link auth wymagany dla DOWOLNEGO użycia chatbota (operacyjny + techniczny)
- Brak rate limit po IP (wystarczy auth check)
- Mniejsze koszty Anthropic API (tylko rodzina pyta)
- Mniej kodu (rezygnacja z public mode + captcha + IP throttling)
- Tracimy kartę "publiczny RAG" jako lead magnet, ale case study będzie pokazany przez screencast/video. Jakość konwertuje, nie publiczne demo.

---

## D-011: Wycięcie n8n + Hetzner — przejście na Supabase Edge Functions

**Data:** 30 kwietnia 2026  
**Decyzja:** Wszystkie automatyzacje (cron polling, daily aggregates, alerty, weekly digest, RCEm update, token refresh) realizowane przez **Supabase Edge Functions** + **pg_cron** wewnątrz Supabase. **n8n i Hetzner Cloud całkowicie wycięte z planu.**

**Alternatywy rozważone:**
- n8n self-hosted na Hetzner CX22 (5 EUR/mc) — pierwotny plan w D-001 i D-003
- n8n.cloud Starter (~24 USD/mc) — odrzucone, 5x drożej za to samo
- AWS Lambda + EventBridge — odrzucone, więcej AWS setup, koszty trudne do przewidzenia
- Vercel Cron Jobs — odrzucone, gorszy fit (function executions limited na Hobby plan)

**Uzasadnienie:**
1. **Mniej części ruchomych.** Supabase ma natywnie cron (`pg_cron`) i serverless functions. Jedna platforma zamiast dwóch.
2. **Cały stack w Git.** Workflow są w `supabase/functions/poll-realtime/index.ts`, edytowalne przez Claude Code, code review przez PR. Nie ma ukrytego stanu w UI n8n.
3. **Zero kosztów.** Free tier Supabase obejmuje 500K invocations Edge Functions/mc i unlimited pg_cron jobs. Dla naszego użycia (1 user, polling co 5 min = 8640 invocations/mc) wykorzystamy 1.7% limitu.
4. **Mniej kont serwisów.** Z 7 do 6 (wycina się Hetzner Cloud).
5. **Tańszy run rate.** 30-60 PLN/mc → 10-30 PLN/mc (tylko Anthropic API).
6. **Jeden punkt awarii zamiast dwóch.** Jeśli Supabase padnie, padnie wszystko. To OK, akceptowalne ryzyko dla domowej apki.

**Co tracimy:** wizualny n8n editor. Dla domowej aplikacji to overkill. Cron + 5-6 plików TypeScript ogarnia wszystko.

**Konsekwencje dla schematu Supabase:** bez zmian. Wszystkie tabele z `04-api-spec.md` sekcja 12 zostają bez zmian. Tylko warstwa logiki przenosi się z n8n do Edge Functions.

**Konsekwencje dla `05-implementation-plan.md`:** sekcje 4.4 (setup VPS Hetzner), 5 (workflow n8n), 14 (lista TODO) zaktualizowane. Nowy podział pracy w Fazie 0 i 1.

---

## D-012: Bateria niezarejestrowana — workaround przez requestSnType=1

**Data:** 30 kwietnia 2026 (zrewidowane 30.04.2026 wieczorem — patrz O-003)  
**Decyzja:** Polling baterii zawsze przez SN inwertera z parametrem `requestSnType=1`. Pierwotnie zakładaliśmy że w panelu Solax Cloud bateria nie jest zarejestrowana jako osobny device (sądzony "znany problem z instalacji 2023"), ale dane telemetryczne dostępne są przez API.

**⚠️ Rewizja założenia (O-003):** inspekcja fizyczna falownika 30.04.2026 wieczorem ujawniła że display pokazuje "Bateria 0.0V". Możliwe że bateria nigdy nie została zainstalowana (a nie tylko niezarejestrowana). Patrz O-003 niżej. Decyzja D-012 (workaround przez `requestSnType=1`) zostaje w mocy bo i tak jest poprawnym pattern dla scenariusza w którym bateria istnieje, ale jej brak rezultatu z API trzeba traktować jako prawidłowy stan, nie błąd.

**Uzasadnienie:** szczegóły w `04-api-spec.md` sekcja 7.1 i 9. Identyfikacja zapisu w Supabase przez `(inverter_id, device_type=2)`, nie przez `deviceSn`. Battery model i capacity wpisane ręcznie w `user_inverters` PO potwierdzeniu że bateria fizycznie istnieje (O-003).

**Status modelu i pojemności baterii:** zablokowane przez O-003.

---

## Decyzje otwarte (do rozstrzygnięcia)

### O-002: Format maila weekly dla taty

**Status:** rekomendacja istnieje, decyzja odłożona do Fazy 6

**Rekomendacja:** dwa formaty. Wersja "dla aktywnego" (Michał, brat) z liczbami i wykresem słupkowym. Wersja "dla pasywnego" (tata, ewentualnie przyszli niskotechniczni klienci) — 3-4 zdania prozy plus jedna kluczowa liczba.

**Uzasadnienie:** projekt wziął się z tego że tata nie używa panelu Solax. Jeśli wyślemy mu gęsty raport z liczbami, znowu nie będzie używał. 30 minut dodatkowej pracy żeby projekt spełnił własny cel.

---

### O-003: Czy bateria istnieje fizycznie ✅ ROZSTRZYGNIĘTE 30.04.2026 — Scenariusz A potwierdzony

**Status:** **CLOSED — bateria nie została zainstalowana.** Decyzja na bazie analizy umowy + karty gwarancyjnej SunWise (Michał wrzucił PDF-y 30.04.2026 wieczorem do `docs/source-documents/`).

**Trzy zgodne źródła:**
1. **Umowa SunWise 47.W/M/2022 z 24.11.2022, Załącznik 2 (Opis techniczny)** — specyfikacja sprzętu zawiera tylko: 20× JOLYWOOD JW-HD120N 385W, falownik X3-HYBRID-8.0T (potem zmieniony bez aneksu na X3-Hybrid G4 10.0-M), konstrukcja K2/SOLTEC, skrzynka ACDC DEHN/PHOENIX. **Bateria nieobecna.**
2. **Karta gwarancyjna z 12.01.2023** — sekcja "Gwarancja obejmuje urządzenia" wymienia: moduły PV (15 lat / 30 lat moc), falownik (10 lat), konstrukcja montażowa (12 lat), kable (wg producenta), skrzynka ACDC (wg producenta), Montaż (5 lat). **W sekcji urządzeń brak baterii.** Sekcja Montaż wymienia "łącze bater." — czyli SunWise przygotował kabel/konfigurację pod baterię, ale samej baterii nie zainstalował.
3. **Display falownika 30.04.2026** — 0,0 V na porcie baterii.

**Konsekwencja architekturalna:** Mój Prąd 4.0 wypłacił 16 000 PLN za sam hybrydowy falownik (program przyznawał dotacje na falownik hybrydowy ALBO falownik + bateria — w 2022/2023 sam hybrydowy też się kwalifikował). Realny koszt netto 24 000 PLN ✓ zgadza się.

**Schemat bazy zostaje future-proof:**
- `device_realtime_readings.device_type=2` — wciąż zdefiniowane na wypadek przyszłego zakupu baterii
- `user_inverters.battery_capacity_kwh = NULL`, `battery_model = NULL` — flagi które dashboard interpretuje jako "Brak baterii"
- Wszystkie sekcje bateryjne UI mają fallback "Brak / Falownik bez magazynu"

**Konsekwencja dla Fazy 4 (chatbot):** odblokowane. Chatbot będzie wiedział że bateria nie istnieje, więc nie zaimprowizuje fałszywej odpowiedzi na "ile mam w baterii". Zamiast tego wyjaśni: "Twoja instalacja nie ma baterii — falownik jest gotowy, ale magazynu nigdy nie zainstalowano. Rodzina rozważa zakup baterii w pakiecie z autem elektrycznym."

---

### ~~O-003: Czy bateria istnieje fizycznie~~ (zachowane do historii)

~~**Status:** do rozstrzygnięcia. Blokuje implementację Fazy 4 (chatbot operacyjny), NIE blokuje Faz 0-3.~~

**Data wykrycia:** 30 kwietnia 2026 wieczorem (inspekcja fizyczna falownika).

**Sygnały:**
- Display falownika pokazuje "Bateria 0.0V" na porcie baterii
- W API Solaxa bateria nie pojawia się w `page_device_info` (znany od początku, przez D-012 traktowane jako "niezarejestrowana")
- Na zdjęciu falownika z zewnątrz nie widać kabli BAT+/BAT- ani fizycznej baterii w kadrze

**Trzy scenariusze:**

| | Opis | Prawdopodobieństwo |
|---|------|---------------------|
| A | Bateria nigdy nie została zainstalowana | wysokie |
| B | Bateria istnieje, jest odłączona / wyłączona | średnie |
| C | Bateria była, jest uszkodzona, falownik jej nie widzi | niskie |

**Plan rozstrzygnięcia:**
1. Pytanie do Krzysztofa: czy w lutym 2023 SunWise instalował fizyczną baterię? (zdjęcia, faktura, pamięć)
2. Jeśli tak — sprawdzenie fizyczne (oględziny w bramie sąsiedniej, gdzie typowo Solax montuje baterię) i status połączeń
3. Jeśli nie — formalnie scenariusz A, plan komercyjny: kupić baterię + EV jednocześnie (Michał, 30.04.2026: "tata mówi że bateria sama bez EV nie ma sensu finansowo")

**Konsekwencje dla architektury (niezależnie od rozstrzygnięcia):**
- Schemat bazy zostaje bez zmian — tabele bateryjne (`device_realtime_readings.device_type=2`, pola w `daily_aggregates`, `monthly_aggregates`) future-proof
- W Fazie 3 dashboard ma logikę "jeśli brak danych baterii, ukryj sekcję / pokaż 'Brak baterii'", nie crash
- W Fazie 4 chatbot musi wiedzieć czy bateria fizycznie istnieje — bez tego nie da się odpowiadać na pytania typu "ile mam w baterii"
- Argument finansowy "ROI za 3 lata" w `07-installation-history.md` może wymagać korekty jeśli scenariusz A — bez baterii self-use rate i tak ~99% bo zużycie pokrywa się z dziennym oknem produkcji, ale nadwyżka nie jest magazynowana, idzie do grid za RCEm

**Notatka biznesowa (30.04.2026):** rodzina rozważa zakup baterii pod warunkiem zakupu auta elektrycznego — bez EV bateria sama nie ma sensu ekonomicznego. To otwiera ścieżkę "Solax Monitor + EV charger" dla case study, ale nie wpływa na bieżącą implementację.

---

*Ostatnia aktualizacja: 30 kwietnia 2026 wieczorem (O-003 dodane, D-012 zrewidowane).*
