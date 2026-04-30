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

**Data:** 30 kwietnia 2026  
**Decyzja:** Polling baterii zawsze przez SN inwertera z parametrem `requestSnType=1`. W panelu Solax Cloud bateria nie jest zarejestrowana jako osobny device (znany problem z instalacji 2023), ale dane telemetryczne dostępne są przez API.

**Uzasadnienie:** szczegóły w `04-api-spec.md` sekcja 7.1 i 9. Identyfikacja zapisu w Supabase przez `(inverter_id, device_type=2)`, nie przez `deviceSn`. Battery model i capacity wpisane ręcznie w `user_inverters` po sprawdzeniu fizycznej naklejki.

**Status modelu i pojemności baterii:** TBD (Michał sprawdza naklejkę, plan B przez panel falownika fizyczny Settings → Battery, plan C przez dokumenty instalacyjne SunWise).

---

## Decyzje otwarte (do rozstrzygnięcia)

### O-002: Format maila weekly dla taty

**Status:** rekomendacja istnieje, decyzja odłożona do Fazy 6

**Rekomendacja:** dwa formaty. Wersja "dla aktywnego" (Michał, brat) z liczbami i wykresem słupkowym. Wersja "dla pasywnego" (tata, ewentualnie przyszli niskotechniczni klienci) — 3-4 zdania prozy plus jedna kluczowa liczba.

**Uzasadnienie:** projekt wziął się z tego że tata nie używa panelu Solax. Jeśli wyślemy mu gęsty raport z liczbami, znowu nie będzie używał. 30 minut dodatkowej pracy żeby projekt spełnił własny cel.

---

*Ostatnia aktualizacja: 30 kwietnia 2026 (D-011 i D-012 dodane).*
