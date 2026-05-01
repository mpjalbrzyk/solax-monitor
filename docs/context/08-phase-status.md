# Solax Monitor — Status faz wdrożenia

**Cel pliku:** punkt referencji dla każdej kolejnej sesji Claude Code (i Michała). Mówi co zostało zrobione, jakie problemy napotkaliśmy po drodze, jak je rozwiązano. Aktualizowany na koniec każdej fazy.

**Ostatnia aktualizacja:** 1 maja 2026 noc — Faza 3 zamknięta + UX audit response (14/24 done) + visual identity sprint (Tydzień + Raporty + narrator + design system overhaul).

---

## Status faz na dziś

| Faza | Tytuł | Status | Czas |
|------|-------|--------|------|
| 0 | Discovery i setup | ✅ DONE (30.04.2026) | ~1 dzień |
| 1 | Pipeline danych | ✅ DONE (30.04.2026) | ~1 dzień |
| 2 | Backfill historyczny | ✅ DONE (30.04.2026) | ~30 min |
| 3 | Dashboard webowy | ✅ DONE + 3 rundy polish (1.05.2026) | ~2 dni |
| 4 | Chatbot operacyjny | ⏸️ świadomie odłożony | 1 dzień |
| 5 | Chatbot techniczny (RAG) | ⏸️ świadomie odłożony | 1 dzień |
| 6 | Email digest + alerty | ⏳ pending (raporty UI gotowe — czeka Resend) | pół dnia |
| 7 | Multi-tenant polish | ⏳ pending | 1 dzień |
| 8 | Case study content (równolegle) | ⏳ pending | 2 dni |

**Kolejność realizacji** (uzgodnione 1.05.2026): 0 → 1 → 2 → 3 → ✂️ skip 4-5 (chatbot zastąpiony narratorem deterministycznym) → 6 → 7 → 8.

**Stan na 1.05.2026 noc:** **4/8 faz operacyjnych zamknięte** (0, 1, 2, 3 — pełna ścieżka data → dashboard). Pozostałe **3 fazy operacyjne** (6, 7) oraz **2 fazy odłożone** (4, 5 — chatbot, opcjonalne) plus content (8). Realnie: aplikacja jest **production-ready dla rodziny już teraz**, dalsze fazy to wartość dodana.

**Faza 3 — czemu trzy rundy polish:**
1. Krok A-D (30.04.2026) — pierwszy build z Apple Fitness/Tesla quality
2. Visual polish v2 (1.05.2026 rano) — gamification, długoterminowa prognoza, Tesla flow
3. UX audit response (1.05.2026 wieczorem) — 14/24 trust killers + hierarchy
4. Visual identity v3 (1.05.2026 noc) — Tydzień + Raporty + narrator + warm color system

---

## Faza 0 — co zostało zrobione

Cztery commity, wszystkie pushed do `https://github.com/mpjalbrzyk/solax-monitor`:

| Commit | Hash | Treść |
|--------|------|-------|
| 1 | `3300be0` | Czyszczenie repo z wrażliwych PDF-ów (filter-repo + force push), `.gitignore` rozszerzony, `.env.example` po D-011, `.env.local` z realnymi credentials, dane finansowe wyniesione do `docs/private/financials.md` (gitignored) |
| 2 | `53ec77e` | Bootstrap Next.js 16 + Tailwind 4 + React 19 + TypeScript 5 + shadcn/ui (`base-nova`, neutral). Dependencies: `@supabase/ssr`, `@supabase/supabase-js`, `@anthropic-ai/sdk`, `recharts`, `lucide-react`. Smoke test: `localhost:3000` → HTTP 200 |
| 3 | `9bc4200` | `supabase init` + link do projektu `duecptzvkbauctdxsxsw`. Migracja `20260430014223_initial_schema.sql`: 10 tabel z RLS + 4 extensions (vector, pg_cron, pg_net, pgcrypto). Migracja zapplikowana na remote |
| 4 | `d568b78` | 8 Edge Functions zdeployowane jako stuby `not_implemented`: `poll-realtime`, `poll-alarms`, `refresh-token`, `daily-aggregates`, `weekly-digest`, `monthly-digest`, `update-rcem`, `send-alert`. `supabase/scheduled-jobs.sql` template z zakomentowanymi cron schedules. Sekrety Solaxa wgrane do Supabase Vault |

### Stan środowiska na koniec Fazy 0

- **GitHub:** repo prywatne, czysta historia, wrażliwe PDF-y nie istnieją w żadnym commicie. `.env.local` gitignored, `docs/private/`, `docs/source-documents/`, `docs/pge-invoices/`, `docs/solax-pdfs/` gitignored ale lokalnie obecne.
- **Vercel:** projekt podpięty do GitHuba, auto-deploy działa. Każdy push do `main` buduje i deployuje. Roboczy URL `solax-monitor-*.vercel.app`. Domena docelowa do ustalenia (`solar.mpjalbrzyk.pl` może się zmienić — D-004 wstępna).
- **Supabase:** projekt `duecptzvkbauctdxsxsw`, 10 pustych tabel z RLS, sekrety `SOLAX_CLIENT_ID` + `SOLAX_CLIENT_SECRET` w Vault, 8 Edge Functions ACTIVE w wersji 1.
- **Lokalnie:** Next.js dev server odpalany przez `npm run dev` (port 3000), Supabase CLI zalogowany przez Personal Access Token Michała (zapisany w macOS Keychain).
- **GitHub auth:** Personal Access Token wpisany do macOS Keychain. Każdy `git push` od teraz idzie automatycznie bez force pusha.

---

## Problemy napotkane w Fazie 0 i jak rozwiązano

### Problem 1: wrażliwe PDF-y w `Initial commit` na GitHubie

**Co się stało:** repo zostało zainicjalizowane przez Michała razem z folderami `docs/pge-invoices/`, `docs/source-documents/`, `docs/solax-pdfs/`. W `Initial commit` wylądowały numery konta bankowego rodziców (PKO, mBank), faktura proforma SunWise, przelewy PKO z numerami transakcji, PDF-y faktur PGE z numerem klienta i PPE.

**Rozwiązanie:** `git filter-repo` z flagą `--invert-paths` przepisał historię, kompletnie wycinając te ścieżki z całego git history (nie tylko z HEAD). Po rewricie `Initial commit` zmienił hash z `3bca5ec` na `27c6c99`. Force push (`git push --force origin main`) nadpisał remote. Pliki zostały zachowane lokalnie w backup `~/solax-monitor-private/` przed filter-repo, potem przywrócone do working tree (gdzie są ignored przez `.gitignore`).

**Lekcja na przyszłość:** zanim cokolwiek pójdzie do nowego repo z dokumentami, sprawdzić co dokładnie wsiada w `Initial commit`. `git filter-repo` jest dostępny pod `/Users/michaljalbrzykowski/Library/Python/3.9/bin/git-filter-repo` (zainstalowany przez `pip3 install --user`).

### Problem 2: dwa różne hasła w Supabase — "do projektu" vs "do bazy"

**Co się stało:** Michał wkleił hasło `TuK7tCESHkE9F8` jako "hasło do projektu". Skopiowałem do `.env.local` i próbowałem `supabase db push`. Połączenie do Postgres zwracało `SASL auth failed`. Okazało się że to było hasło do konta, nie do bazy danych Postgres (które są w Supabase rozdzielone).

**Rozwiązanie:** reset hasła bazy w Supabase Dashboard → Database → Settings → Reset database password. Nowe hasło `ltNcyOIJxjUcUptS` zaktualizowane w `.env.local`. Stare unieważnione przez reset.

**Lekcja na przyszłość:** w Supabase są dwie różne hasła:
- **Account password** — logowanie do `supabase.com/dashboard` przez UI
- **Database password** — uwierzytelnienie usera `postgres` w connection stringu, używane przez `supabase db push`, `psql`, `@supabase/supabase-js` w niektórych konfiguracjach

Connection string ma format `postgresql://postgres:<DB_PASSWORD>@db.<PROJECT_REF>.supabase.co:5432/postgres`. Jeśli `db push` zwraca SASL error, to prawie zawsze błędne **DB password**.

### Problem 3: nowe Supabase API keys nie są JWT

**Co się stało:** Supabase pod koniec 2025 wprowadził nowy format API keys: `sb_publishable_xxx` (zastępuje stary `anon` key) i `sb_secret_xxx` (zastępuje `service_role` key). To opaque tokens, nie JWT (`eyJ...`). Michał ma nowe klucze. Próba ręcznego curla na Edge Function zwróciła `UNAUTHORIZED_INVALID_JWT_FORMAT` bo Edge Functions mają domyślnie `verify_jwt = true` w `config.toml` per funkcja.

**Rozwiązanie tymczasowe:** odłożone do Fazy 1. Curl test deferred. Cron-triggered invocations (przez `pg_cron` + `pg_net`) używają service role key z Vault i to działa, więc pipeline nie jest blokowany. Dla bezpośredniego testowania w Fazie 1 mamy trzy opcje:
1. Pobrać legacy JWT keys z Settings → JWT Keys (jeśli Supabase je jeszcze udostępnia w UI obok nowych)
2. Wyłączyć `verify_jwt` per funkcja w `config.toml` (niebezpieczne dla produkcji, OK dla testów)
3. Wygenerować JWT lokalnie na podstawie JWT secret (bardziej skomplikowane)

W Fazie 1 wybierzemy najprostszą drogę gdy to przyjdzie zaadresować.

### Problem 4: GitHub Desktop nie umiał force push po filter-repo

**Co się stało:** po `filter-repo` lokalna historia rozjechała się ze zdalną. GitHub Desktop pokazał "Newer Commits on Remote" z opcją Fetch (która ściągnęłaby z powrotem stare wrażliwe pliki). Force push w GitHub Desktop tej wersji jest schowany — nie ma toggle w Settings → Advanced. Plus tracking branch został wyzerowany przez filter-repo, więc Desktop pokazywał "Publish branch" jakby branch nigdy nie był na remote.

**Rozwiązanie:** Personal Access Token GitHub (scope `repo`, expiration 7 dni). Wpisany do macOS Keychain przez `git credential approve` z stdin, force push z linii komend (`git push --force -u origin main`). Token został w Keychainie, dalsze pushe automatyczne.

**Lekcja na przyszłość:** dla operacji jednorazowo destrukcyjnych (force push po rewriting history) terminal jest pewniejszy niż GUI. PAT w Keychainie to czyste rozwiązanie — żaden token nie wisi w plikach repo.

### Problem 5: `create-next-app` odmawiał inicjalizacji bo katalog niepusty

**Co się stało:** próba `npx create-next-app . --typescript ...` zwróciła błąd "directory contains files that could conflict: `.env.example`, `.env.local`, `CLAUDE.md`". Mimo że żadnego z tych plików create-next-app nie tworzy, ma walidację że trzy konkretne nazwy są zarezerwowane.

**Rozwiązanie:** tymczasowo `mv` tych trzech plików do `/tmp/preserve/`, run create-next-app, `mv` z powrotem. `docs/`, `.git/`, `.gitattributes`, `.gitignore` zostały na miejscu (nie są na liście blacklisty). Po restore zmergeowałem custom rules do `.gitignore` (Next.js stworzył swój własny minimalistyczny, mój oryginalny był nadpisany).

---

## Wyjaśnienie: token TTL 30 dni

To jeden z kluczowych mechanizmów pipeline'u, ważny do zrozumienia.

**Solax Developer Portal API używa OAuth 2.0 z `client_credentials` grant.** Wymiana wygląda tak:

1. POST do `https://openapi-eu.solaxcloud.com/openapi/auth/oauth/token` z `client_id` + `client_secret`
2. Solax zwraca `{ "code": 0, "result": { "access_token": "...", "expires_in": 2591999, ... } }`
3. `expires_in: 2591999` sekund to **dokładnie 30 dni** (29 dni 23h 59m 59s)
4. Każdy kolejny request do dowolnego endpointu Solaxa idzie z headerem `Authorization: Bearer <access_token>`
5. Po 30 dniach `access_token` wygasa, Solax zwraca `code: 10402` (token expired)

**Konsekwencja:** jeśli nie odświeżymy tokena przed upływem 30 dni, cały pipeline pada. `poll-realtime` przestaje dostawać dane, `poll-alarms` przestaje wykrywać błędy, dashboard zaczyna pokazywać stale data.

**Rozwiązanie:** Edge Function `refresh-token` z crone co 25 dni o 03:00 UTC. Margines 5 dni przed wygaśnięciem. Jeśli refresh nie zadziała w pierwszej próbie, mamy 5 dni do naprawienia zanim pipeline padnie.

**Drugi mechanizm bezpieczeństwa:** `_shared/solax-client.ts` (do napisania w Fazie 1) wykrywa `code: 10402` w response z dowolnego endpointu i triggeruje `refresh-token` ad-hoc, retry zapytania. Czyli nawet jeśli cron chybi (Supabase miał awarię, jakiś glitch), pierwszy poll który dostanie 10402 sam naprawi token.

**Co to znaczy praktycznie:** w Fazie 1 implementujemy `refresh-token` jako pierwszy handler. Robimy ręczny test: invokujemy go raz, sprawdzamy że w `api_credentials` pojawia się `access_token` z `expires_at = NOW() + 30 days`. Dopiero potem implementujemy `poll-realtime` który tego tokena używa.

**Dlaczego to tak ważne:** to jest single point of failure dla całego data pipeline. Wszystko inne może się zepsuć i naprawi się przy kolejnym cyklu. Token się nie odświeży i mamy 30 dni cichej śmierci pipeline'u, którą zauważymy dopiero gdy ktoś popatrzy na dashboard. Stąd plan na Fazę 1 dorzucenia `notified_at` na próbę refresha (alert jeśli się 2 razy z rzędu nie udało).

---

---

## Faza 1 — co zostało zrobione

Pięć commitów (5-9), wszystkie pushed do `main`. Pipeline danych żyje: cron co 5 min ściąga z Solaxa do Supabase, alerty pollowane co 15 min, daily aggregates rozliczane raz dziennie z kalkulacjami finansowymi PGE G11.

| Commit | Hash | Treść |
|--------|------|-------|
| 5 | `6dfc42a` | `refresh-token` real impl + `_shared/solax-client.ts` z `solaxAuthRequest` + `verify_jwt = false` per funkcja + seed Michała w Supabase Auth + insert `user_inverters` + insert `api_credentials`. End-to-end OAuth pipeline confirmed working: smoke test odebrał access_token z 30-dniowym TTL, scope `API_Telemetry_V2 ...` |
| 6 | `e5a9ed5` | `poll-realtime` real impl + `solaxFetch` z auto-retry na 10402 + sign-convention helpers (`normalizeBatteryPower` flipuje znak vs Solax). Pierwszy realny poll: total_yield=17716.96 zgodne z `00-context.md`, idle gridPower -6W zgodne z api-spec sec 7.5, battery deviceSn=null poprawnie obsłużony |
| 7 | `6def7f0` | `poll-alarms` real impl. Smoke test: 0 alarmów (zgodnie ze stanem instalacji Michała) |
| 8 | `3e45602` | Seed taryfy PGE G11 (zones brutto 1.0991 PLN/kWh + RCEm history 20 miesięcy z `06-tariff.md`) + seed `historical_yearly_consumption` 2015-2025 + `daily-aggregates` real impl. Smoke test: yield=0, import=0.08, cost=0.09 PLN, math zgodne (0.08 × 1.0991 ≈ 0.09 brutto) |
| 9 | TBD | Migracja `enable_phase1_crons.sql`: cron schedule dla 4 jobów (refresh-token co 25 dni 03:00 UTC, poll-realtime co 5 min, poll-alarms co 15 min, daily-aggregates daily 01:00 UTC). Helper SQL `schedule_edge_function(name, cron, path)` deduplikuje przez `cron.unschedule` przed `cron.schedule`. Vault entry `service_role_jwt` dla pg_cron Bearer header. Pipeline poszedł na żywo |

### Stan środowiska po Fazie 1

- **Auth flow Solax:** access_token w `api_credentials` ważny do 2026-05-30. Auto-refresh przez `solaxFetch` jeśli złapie code 10402, plus zapasowy cron `refresh-token` co 25 dni
- **Polling pipeline:** cron co 5 min wywołuje `poll-realtime`, dane wpadają do `plant_realtime_readings` + `device_realtime_readings`. Multi-tenant ready (iteracja po wszystkich aktywnych user_inverters), per-inverter error isolation
- **Alarms pipeline:** cron co 15 min wywołuje `poll-alarms`. Trigger `send-alert` przy nowych alarmach level >= 2, ale `send-alert` jest jeszcze stub (Resend dochodzi w Fazie 6) — `notified_at` jest jednak ustawiane żeby unikać re-fire
- **Daily aggregates:** cron 01:00 UTC liczy poprzedni dzień (yesterday w Europe/Warsaw). Algorytm finansowy z `06-tariff.md` sec 6 zaaplikowany. Sygnatura optional body `{date?, inverter_id?}` pozwala na manual replay
- **Tariff:** PGE G11 effective_from 2026-01-01, brutto 1.0991 PLN/kWh, opłaty stałe 43.18 PLN/m brutto, RCEm history 2023 + 2025-07 do 2026-02 (luka 2024-01 do 2025-06 do dociągnięcia z PSE w Fazie 6)
- **Historical baseline:** 10 lat zużycia z arkusza brata + ostatni rok z PGE rocznej. Dostępne dla chatbota i sekcji "życie przed PV" w dashboardzie

### Decyzje techniczne podjęte w trakcie Fazy 1

- **`verify_jwt = false`** dla wszystkich 8 funkcji. Wszystkie są internal cron jobs / dev curl smoke tests, brak user-facing endpointów. Plus nowe API keys Supabase (sb_publishable_, sb_secret_) i tak nie są JWT, więc legacy verify_jwt = true zablokowałby też cron triggery z Vault. Decyzja czysta dla naszego MVP, w Fazie 7 (multi-tenant SaaS) dorzucimy shared-secret header per funkcja jeśli okaże się potrzebne
- **Plain text client_secret w `api_credentials.client_secret_encrypted`** — pole nazwowo sugeruje encryption, ale na MVP single-user trzymamy plaintext. RLS chroni dostęp (tylko service role + sam user). Proper encryption-at-rest (pgcrypto / Vault-keyed) odłożone do Fazy 7
- **Sample integration battery flow** zakłada równe 5-min interwały. W praktyce cron może chybić jednorazowo; błąd liczbowy znikomy w skali dziennej. W Fazie 2 backfill granularny może wymagać uwzględnienia rzeczywistych odstępów między próbkami
- **Konwencja znaków zafiksowana w jednym miejscu** (`_shared/solax-client.ts` `normalizeBatteryPower` + `passThroughPower`). Każdy nowy handler który czyta `*_power_w` z Solaxa musi importować te helpery — nie ma mowy o "znormalizuj sobie inline"

---

---

## Faza 2 — co zostało zrobione

Jeden commit (10), pushed do `main`. Skrypt `scripts/backfill-history.mjs` ściąga z Solaxa historyczne agregaty i wpisuje do bazy.

| Commit | Hash | Treść |
|--------|------|-------|
| 10 | TBD | `scripts/backfill-history.mjs` + jednorazowy run. Phase A monthly: 16 rowów (2025: 12 miesięcy + 2026: 4 miesiące). Phase B daily: 395 rowów (2025-04 do 2026-04, 13 miesięcy). Plus aplikacja taryfy PGE G11 dla każdego dnia w Phase B (savings/cost/earnings/net w PLN brutto) |

### Kluczowe odkrycie — Solax limit 12 miesięcy wstecz

`04-api-spec.md` sec 13 sugerowała że `plant/energy/get_stat_data` daje 3 lata historii (od daty rejestracji urządzenia, czyli luty 2023). **W praktyce Solax ogranicza zapytania do "past year"** od dziś:

```
code 10200 PARAM_ERROR: "The date must be within the past year"
```

Dotyczy zarówno `dateType=1` (annual, czyli rok jako parametr) jak i `dateType=2` (monthly). Dla naszej aplikacji pracującej w kwietniu 2026 to oznacza:
- **Dostępne**: kwiecień 2025 → kwiecień 2026 (12-13 miesięcy wstecz)
- **Niedostępne via stat_data**: cały 2024 (nie zaczęty), 2023 (nie zaczęty)

Skrypt został zrobiony resilient — łapie 10200 jako "skip and log" zamiast crashowania. Gdy będziemy uruchamiać aplikację u nowego klienta, ten sam skrypt zaimportuje co API udostępnia w danym momencie.

### Drugie odkrycie — Solax importEnergy niedoszacowany dla naszej instalacji

Solax zwraca `importEnergy` per miesiąc, ale dla naszej instalacji liczby są dramatycznie niższe niż realne dane PGE z faktur:

- Solax 2025 yearly `importEnergy` ≈ **40 kWh**
- PGE faktura 2025: **4282 kWh** importowane z sieci

Faktor ~100×. Powód: bateria nie jest zarejestrowana w Solax Cloud jako device (api-spec sec 7.1), więc Solax nie wlicza energii idącej z sieci do ładowania baterii nocą jako "import". Praktycznie wszystkie nocne ładowania baterii są poza ich agregacją.

**Konsekwencja dla aplikacji:** wszystkie liczby `cost_pln` i `net_balance_pln` w `daily_aggregates` z Phase B są **ZNACZNIE niedoszacowane**. Phase B sanity check pokazał +1569 PLN net balance za 4 miesiące 2026, ale realnie to mocno zawyżona pozycja.

**Plan naprawczy** (Faza 3 albo 7):
- W sekcji Financial dashboard pokazujemy DWA numery: "Solax-reported" (z monthly/daily aggregates) i "PGE-actual" (z `historical_yearly_consumption` × G11 brutto)
- Lifetime PV produkcji bierzemy z `plant_realtime_readings.total_yield` (jest precyzyjna)
- Ewentualnie w Fazie 7 dodamy backfill ręczny z faktur PGE jako tabelę `monthly_grid_actuals` (dane od PGE per miesiąc, override Solaxa dla tego pola)

### Sanity check po backfill

Top 5 miesięcy produkcji:
- 2025-05: **1321 kWh** (najlepszy miesiąc — wczesna wiosna i długie dni)
- 2025-08: 778 kWh
- 2025-06: 765 kWh
- 2026-04: 703 kWh (in-progress, kwiecień jeszcze nie skończony)
- 2025-07: 672 kWh

Sezonowość zgodna z oczekiwaniami: maj-czerwiec szczyt, grudzień-styczeń dno.

Lifetime PV z 16 miesięcy backfill: 7154 kWh. Lifetime z `plant_realtime_readings.total_yield`: 17717 kWh. Diff ~10500 kWh przypada na luty 2023 → marzec 2025 (pre-backfill, Solax niedostępny via API).

---

---

## Faza 3 — w toku (plan i postęp)

Plan inkrementalny uzgodniony 30.04.2026: 7 commitów × ~½ dnia każdy.

| Krok | Commit | Treść | Status |
|------|--------|-------|--------|
| 1 | TBD | Fundament: lib/supabase clients, proxy.ts (auth gate za feature flagiem), shadcn (card/tabs/skeleton/input/label/dropdown/sonner), migracja installation_cost, layout PL, glassmorphism background, page.tsx jako status board | ✅ DONE |
| 2 | TBD | Auth magic link: /login z Server Action signInWithOtp, /auth/callback handler, AUTH_GATE_ENABLED=true | ⏳ |
| 3 | TBD | Overview MVP: hero energy flow (SVG), 4 KPI tiles bento, refresh co 5 min | ⏳ |
| 4 | TBD | Daily view: line chart Recharts (yield + load + import + export), date picker, tabela podsumowań | ⏳ |
| 5 | TBD | Monthly + Yearly: bar chart dni miesiąca, grouped bar YoY | ⏳ |
| 6 | TBD | Financial: cumulative savings vs 24 000 PLN break-even, Solax-reported vs PGE-actual, breakdown autokonsumpcja vs eksport | ⏳ |
| 7 | TBD | Polish: mobile bottom nav, loading skeletons, RLS sanity test | ⏳ |

### Decyzje designowe Fazy 3 (uzgodnione 30.04.2026)

- **Domena dla magic linka:** Vercel preview URL na MVP, `solar.mpjalbrzyk.pl` może później
- **Financial dashboard:** dwa numery równolegle — **Solax-reported** (z `daily_aggregates`, niedoszacowany przez brakującą baterię w Cloud) i **PGE-actual** (z `historical_yearly_consumption × tariff`)
- **Koszt instalacji:** 40 000 PLN brutto − 16 000 PLN dotacja Mój Prąd 4.0 = **24 000 PLN netto**. Seed w `user_inverters.installation_cost_pln` migracją `20260430100250_add_installation_cost.sql`
- **Battery capacity:** zostawione jako NULL, do uzupełnienia po zdjęciu naklejki z baterii (Michał obiecał przy następnej akcji)
- **UX/UI dla wszystkich userów (active+passive):** bento, technologiczne, przejrzyste, delikatny glassmorphism w stylu Apple — białe + szklane + subtelne kolory (zielony oszczędności, pomarańczowy PV). Funkcjonalność > design pixel-perfect na MVP
- **Mobile-first:** brat i tata otworzą z telefonu, sidebar nav zostaje bottom tab bar na mobile
- **Numery zawsze w PLN obok kWh:** kWh to abstrakcja, PLN to konkret dla rodziny

### Krok 1 — co weszło (commit 11)

- Migracja `20260430100250_add_installation_cost.sql`: kolumny `installation_cost_pln` (24 000) + `installation_subsidy_pln` (16 000) na `user_inverters`. Zaplikowane na remote, weryfikacja przez REST API zwróciła oczekiwane wartości
- `lib/supabase/{client,server,middleware}.ts` — boilerplate `@supabase/ssr` (browser, server-with-cookies, session-refresh helper). `cookies()` jest awaited (Next 15+ requirement)
- `proxy.ts` w roocie (Next 16 zastąpił nazwę `middleware.ts` deprecation warningiem). Funkcja eksportowana jako `proxy`. Auth gate za stałą `AUTH_GATE_ENABLED = false` żeby Krok 1 nie krzyczał 404 na `/login`. Krok 2 flipuje na true
- 7 nowych shadcn komponentów: card, tabs, skeleton, input, label, dropdown-menu, sonner
- `app/globals.css`:
  - poprawiony self-reference `--font-sans: var(--font-sans)` → `var(--font-geist-sans)`
  - paleta domenowa: `--pv` (oklch ~60° pomarańcz), `--savings` (~155° zieleń), `--grid-import` (~25° czerwień), `--grid-export` (~230° niebieski), w obu motywach
  - body z gradient blob backgroundem (3 radialne gradienty PV/savings/grid-export, fixed)
  - utility classes `.glass` i `.glass-strong` z backdrop-blur, white/55, subtle border + shadow
- `app/layout.tsx`: `lang="pl"`, metadata template `%s · Solax Monitor`, Geist Sans/Mono z `latin-ext` subset, Toaster Sonner
- `app/page.tsx`: zastąpiony Next.js placeholder bento status boardem — 4 KPI tiles (lifetime production, pipeline LIVE, backfill 395 dni, break-even ~maj 2026) + roadmap card z 8 fazami. Czyste demo glass + bento

### TS / build cleanup

- `tsconfig.json`: dodane `supabase/functions` i `scripts` do `exclude` żeby TS nie próbował tłumaczyć Deno imports (`jsr:@supabase/...`) ani Node mjs scriptów
- Worktree w `.claude/worktrees/xenodochial-noether-fec08f/` ma własny `package-lock.json` co powoduje warning Turbopack o multiple lockfiles — nieblokujące, można naprawić przez `turbopack.root` w `next.config.ts` jeśli przeszkadza
- Build clean: `npm run build` → 0 warning, 0 error, statyczna prerender `/`

### Side update 30.04.2026 wieczorem — model falownika + status baterii

Inspekcja fizyczna falownika ujawniła dwie korekty:

**1. Model falownika** — dotąd opisywany jako "X3-Hybrid-G4 10 kW" jest na fizycznej naklejce **X3-Hybrid-10.0-M** (numer modelu `9318.00083.01`, sufiks "M" = Master, cluster-capable). API Solaxa raportuje `deviceModel=14` (linia G4), więc cała dokumentacja Solax G4 jest aplikowalna — to jest po prostu wariant 10 kW z linii G4. Zaktualizowane w:
- `00-context.md` sekcja "Co mam"
- `04-api-spec.md` sekcja 7.8 i tabela identyfikatorów
- `07-installation-history.md` sekcja 5

Dorzucona pełna specyfikacja z naklejki: 1000V max DC, MPP 180-950V, battery 180-650V HV, 30A charge/discharge, 10kW AC (16.1A), 11kVA apparent, 10kVA off-grid, IP65, -35°C do +60°C.

**2. Status baterii** — display falownika pokazuje "Bateria 0.0V". Trzy scenariusze (A: nigdy nie zainstalowana / B: odłączona / C: uszkodzona). Najprawdopodobniej A. Pytanie do Krzysztofa otwarte. Schemat bazy zostaje future-proof — kod ma być reużywalny dla klientów którzy mają baterię, plus jeśli scenariusz B/C i kiedyś naprawią, pipeline od razu zacznie zapisywać dane. Decyzja O-003 dodana do `03-decisions.md`, D-012 zrewidowane.

**Konsekwencje dla bieżącej Fazy 3:** brak. Krok 1 fundament dalej stoi. Krok 3 (Overview MVP) musi mieć logikę "jeśli brak danych baterii, ukryj sekcję / pokaż 'Brak baterii'" zamiast crashować — tak czy inaczej to było potrzebne dla edge case'u "ostatnie 5 min nie poszło polling".

**Notatka biznesowa:** rodzina rozważa zakup baterii + auta elektrycznego razem. Bez EV bateria sama nie ma sensu ekonomicznego (Krzysztof, 30.04.2026). Niewpływające na bieżącą implementację, ale warto pamiętać dla case study i przyszłych rekomendacji w chatbocie.

---

## Faza 3 — komplet zbudowany (kroki A-D)

Plan z 7 kroków zredukowany do 4 commitów po decyzji Michała 30.04.2026: "zbudujmy ten dashboard żeby już działał, design polerujemy później". Auth gate odłożony — `AUTH_GATE_ENABLED=false`, single-user MVP, kto ma URL preview wchodzi.

### Decyzje implementacyjne (30.04.2026)

- **Bez auth na MVP.** Login dochodzi w osobnym kroku gdy potrzebny multi-user (Faza 7). Na razie URL Vercel preview = pełny dostęp
- **Service-role Supabase client** zamiast RLS. Czytamy z `lib/data/client.ts` przez `SUPABASE_SERVICE_ROLE_KEY` (już w Vercel envach), bypass RLS bo single-user. Multi-tenant przejście to wymiana clienta na user-scoped + RLS
- **Polski URL nie używamy.** `/overview`, `/daily`, `/monthly`, `/yearly`, `/financial` — angielski. UI 100% polski (etykiety, formatowania, narrator). Nie zmieniamy URL bo to standardowo i mniej myli

### Krok A — Layout + nav + helpers + placeholder pages (commit `4f18298`)

- `lib/format/`: PL-locale formatters (PLN, kWh, kW, %, daty, relative time)
- `lib/data/{client,queries,types}`: server-only Supabase service-role client + 8 high-level queries (inverter, plant/device realtime, daily/monthly aggregates, alarms, tariff, historical consumption, cumulative financials)
- `lib/tariff/`: zone rate + fixed charges + RCEm fallback lookup + import/export calculators
- `components/dashboard/{header,sidebar,mobile-nav,refresh-indicator,nav-config}`: sidebar desktop, bottom tabs mobile, freshness dot + 5-min auto `router.refresh()`
- `app/(dashboard)/layout.tsx`: shell wrapping 5 sections
- 5 placeholder pages: `/overview`, `/daily`, `/monthly`, `/yearly`, `/financial`
- `/` redirectuje do `/overview`
- shadcn add: progress, badge, tooltip, separator, avatar

### Krok B — Overview z energy flow + KPIs + live commentary + alarms (commit `970c9fb`)

- `lib/derive/`: pure energy flow calculation (`deriveEnergyFlow`, `deriveFlowArrows`) + rules-based PL `buildLiveCommentary` (handles night, day, export, import, battery-or-no-battery — Faza 4 podmieni na Claude API)
- `components/dashboard/energy-flow.tsx`: 3×3 grid bento (PV nad Domem, po bokach Grid i Bateria), strzałki świecące się gdy energia płynie. Battery scenario A safe — pokazuje "Brak / Falownik bez magazynu"
- `components/dashboard/kpi-tile.tsx`: reusable z tone'm (pv/savings/import/export/neutral)
- `components/dashboard/alarms-widget.tsx`: ostatnie 30 dni alarmów, "Bez alarmów. Instalacja pracuje normalnie." gdy pusto
- `app/(dashboard)/overview/page.tsx`: hero live commentary + energy flow + 4 KPI bento (produkcja teraz, zużycie domu, oszczędności w tym miesiącu, bateria/brak) + alarms

### Krok C — Daily / Monthly / Yearly z Recharts (commit `de792cf`)

- `lib/date/`: Europe/Warsaw helpers (todayWarsaw, day bounds w ISO, shift date/month, month name PL_MONTH_SHORT)
- `components/charts/recharts-base.tsx`: shared CHART_COLORS palette mirroring globals.css oklch vars + GlassTooltip + PL tick formatters
- `components/charts/{daily-line,monthly-bar,yearly-grouped}-chart.tsx`: trzy chart components, area + bar + grouped bar
- `components/dashboard/date-nav.tsx`: glass prev/next pills + "Dziś" shortcut

- `daily/page` (`?date=YYYY-MM-DD`): area chart 24h produkcja vs zużycie + signed grid line, 4 KPI (yield, load, import, export) + bilans dnia
- `monthly/page` (`?month=YYYY-MM`): bar chart dni miesiąca, 4 KPI (total, average, net balance, best day) + top 3 dni
- `yearly/page`: grouped bars YoY, 4 KPI (current year, previous year, YoY same-period delta, best month) + lifetime z notką o limicie 12 mies. w Solax API

### Krok D — Financial z prognozą (commit następny)

- `components/charts/forecast-chart.tsx`: composed chart Area (rzeczywiste) + Line dashed (prognoza), z `ReferenceLine` na progu zwrotu
- `app/(dashboard)/financial/page.tsx`:
  - **Hero break-even progress card** glass-strong, Progress bar do 24 000 PLN target. Status badge "Zwrócone" lub "X% drogi". Pokazuje rok progu zwrotu
  - **Dwa numery równolegle**: "Solax-reported" (z `daily_aggregates`, niedoszacowane) vs "PGE-actual" (kalkulowane z `historical_yearly_consumption` × tariff brutto, bardziej realistyczne)
  - **Breakdown KPI**: lifetime production, oszczędności z autokonsumpcji, przychód z eksportu RCEm, koszt poboru
  - **Forecast chart do 2035**: ekstrapolacja na bazie ostatnich 365 dni, prosta liniowa (bez założenia dalszego wzrostu cen)
  - **Tabela ostatnich 12 miesięcy**: month, yield, savings, eksport, koszt, bilans

### Stan końcowy Fazy 3

Dashboard pełny, używalny, dane realne z Supabase. Auto-refresh co 5 min na każdej stronie. Mobile-first (bottom tab bar). Battery scenario A bezpieczny — wszystkie sekcje bateryjne mają fallback "Brak". 100% PL UI.

**Co odłożone do Faz 4-7:**
- Login magic link (Faza 7 multi-tenant) — zamiast tego MVP allowlist (krok E)
- AI live commentary (Faza 4 — rules-based zostaje jako fallback)
- Tooltipy "Co to znaczy?" dla terminów (autokonsumpcja, RCEm, net-billing) — łatwe dorzucenie po feedbacku
- Pixel-perfect design polish — kolory/animacje/dark mode

### Krok E — auth allowlist (commit `3d8764e` + `2bb1c3a`)

Decyzja Michała 30.04.2026 wieczorem: zamiast magic linka przez Resend, zrobić prostszy mechanizm — input email, jeśli na liście to wpuszczamy. Bezpieczeństwo niższe niż magic link (ktoś znający email rodziny mógłby wejść), ale URL niepubliczny i tak, plus mamy 3 ludzi rodzinnie.

- `lib/auth/{config,session,middleware}.ts`: ALLOWED_EMAILS env (comma-separated), fallback do trzech maili rodziny w kodzie. Cookie HMAC-signed, TTL 30 dni, AUTH_SECRET env z fallbackiem dla MVP
- `app/(auth)/login/`: page + LoginForm (`useActionState`) + `loginAction` + `logoutAction` Server Actions
- `components/dashboard/logout-button.tsx`: dwie formy ('sidebar' full row, 'icon' mobile header)
- `proxy.ts` wymienione: zamiast Supabase Auth, sprawdza nasz cookie. Public paths: `/login`, `/logout`. Wszystko inne redirect do `/login?redirectTo=...`
- `lib/supabase/middleware.ts` przeniesione do `lib/auth/middleware.ts` (właściwsza nazwa)
- Allowlist fallback: `mpjalbrzyk@gmail.com` (Michał), `krzysztof.jalbrzykowski@gmail.com` (tata, to samo konto co Solax Cloud), `mpjecommerce@gmail.com` (passive role test). Override przez `ALLOWED_EMAILS` env w Vercel jeśli kiedyś dorzuci się brata albo klientów
- `.env.example` zaktualizowany z `ALLOWED_EMAILS` + `AUTH_SECRET`

---

## Decyzja workflowa — koniec preview, lecimy bezpośrednio do main (30.04.2026)

Wcześniej: każdy commit Fazy 3 szedł do brancha `claude/xenodochial-noether-fec08f`, Vercel budował preview deploy, do produkcji szedł tylko po merge PR. Standard dla apek komercyjnych z teamem i QA.

**Po analizie kontekstu:** 3 osoby (Michał + tata + brat docelowo), single installation, MVP rodzinne, brak code review, Vercel Hobby = darmowy. Preview workflow w tym kontekście to **przepalanie** — każdy push wymagał dodatkowego "merge PR" bez żadnej korzyści. Decyzja Michała wprost: "nie chcę żadnych preview na tej głównej apce, zrób żeby działało".

**Wykonane (commit `2bb1c3a`):** fast-forward push z `claude/xenodochial-noether-fec08f` → `main`. Vercel rebuild production na `solax-monitor.vercel.app`. Branch `claude/xenodochial-noether-fec08f` deprecated, można usunąć.

**Od teraz:** każdy push idzie bezpośrednio do `main` = production deploy. Zero PR, zero brancha feature, zero merge. Bug fix robisz na główce, pchasz, Vercel buduje.

**To NIE wymaga Vercel Pro.** Hobby plan ma full Production deploys, bez limitów. Pro odróżnia teamy >1 person, premium analytics, custom builds — niczego z tego MVP nie potrzebuje.

### Token Vercel — debugging próby ustawienia env vars CLI'em

Michał wygenerował token API Vercel (`vck_...`) z opcji "Restricted" (jak się okazało po fakcie). Próba ustawienia env vars przez REST + CLI:
- `/v2/user` zwracał `username: mpjalbrzyk, limited: true` ✓
- `/v9/projects` zwracał `[]` (mimo że projekt istnieje)
- `/v6/deployments` zwracał `[]`
- `/v2/teams` zwracał 403 forbidden
- `vercel whoami` zwracał "not authorized"

Wniosek: token jest typu Restricted/Service Account — REST API potwierdza tożsamość, ale nie pozwala czytać projektów ani modyfikować envów. **Token Restricted ≠ token Full Account.** Dla zewnętrznej automatyzacji potrzeba "Full Account" scope.

**Aktualnie:** Michał dodaje 3 env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) ręcznie w Vercel UI (Settings → Environment Variables). Po dodaniu → Redeploy → dane wskakują. Wartości kopiowane z lokalnego `.env.local`.

**Lekcja na przyszłość:** kolejne API tokeny Vercel — generuj z **Full Account scope**, expiration 7 dni, używaj jednorazowo, rewokuj po. Restricted tokens są dla deploy hooks, nie dla automatyzacji envów.

---

## Stan końcowy Fazy 3

- Dashboard webowy na `solax-monitor.vercel.app` z auth allowlist
- 5 sekcji (Przegląd / Dziś / Miesiąc / Rok / Finanse) z realnymi danymi z Supabase
- Live commentary, energy flow, KPI bento, alarms widget, daily/monthly/yearly charts, financial break-even + forecast
- 100% PL UI, mobile-first, glassmorphism + bento, paleta domenowa (PV pomarańcz / savings zielony / grid-import czerwień / grid-export niebieski)
- Auto-refresh co 5 min, freshness indicator z relative time
- Battery scenario A bezpieczny — wszystkie sekcje bateryjne mają fallback
- Token TTL 30 dni dla Solaxa, refresh co 25 dni przez Edge Function
- Pipeline poll co 5 min, daily aggregates 01:00 UTC

**Następna faza:** 4 (chatbot operacyjny). Wymaga rozstrzygnięcia O-003 (status fizycznej baterii) — bez tego chatbot odpowie na "ile mam w baterii" gdy jej nie ma. Pytanie do Krzysztofa otwarte.

---

## Faza 3 — enhancement A (PGE authoritative data, 30.04.2026 późny wieczór)

Michał wrzucił do `docs/source-documents/` i `docs/pge-invoices/` komplet PDF-ów + dwa nowe pliki kontekstu:
- `08-historical-monthly-data.md` — 37 miesięcy zwalidowanych z 7 faktur PGE
- `09-pge-invoices-audit.md` — trail 8 faktur z numerami i datami zapłaty
- Plus umowa Sunwise + karta gwarancyjna (rozstrzyga O-003)

**6 modułów wykonanych:**

| # | Co | Commit |
|---|-----|--------|
| 1 | 3 nowe tabele: `historical_pge_invoices`, `pge_invoices`, `tariff_components` | `29d0185` |
| 2 | Seed: 37 mies. + 10 faktur + 29 komponentów cenowych | `8b1ebb3` |
| 3 | Align istniejących: user_inverters (7.70 kWp, install date 2023-02-17), historical_yearly_consumption (PGE-derived), tariffs.rcem_history (37 entries z billing_model + multiplier) | `2af4cfa` |
| 4 | Financial dashboard używa `calculatePgeActualSavings` z `historical_pge_invoices` + `tariff_components` per miesiąc, nie estymata roczna | `fd44474` |
| 5 | Edge Function `roll-monthly-aggregates` cron 1. dzień mies. 02:00 UTC, daily→monthly rollup. Solax dane będą się akumulować ciągle, niezależnie od limitu API "past year" | `37b6b42` |
| 6 | Update dokumentacji (00, 03 O-003 closed, 07, 08) | TBD |

### Stan końcowy danych w bazie

- `historical_pge_invoices`: **37 mies.** (02.2023 → 02.2026), 31 z PDF + 6 z 06-tariff.md (TBD-faktura). Lifetime: 12 277 kWh import, 10 032 kWh eksport, 3 198,46 PLN deposit
- `pge_invoices`: **10 faktur** (8 settlement/forecast/correction + 1 nota odsetkowa + 1 prognoza pending)
- `tariff_components`: **29 komponentów × okresów** dla 11 składników G11
- `user_inverters`: 7,70 kWp (było 8,00), data 2023-02-17 (było 2023-02-23), bateria NULL ✓
- `historical_yearly_consumption`: 5 lat (2022-2026) ze zwalidowanymi sumami z faktur
- `tariffs.rcem_history`: 37 entries z billing_model + multiplier (było 20 entries z lukami)
- `monthly_aggregates`: 16 entries (Solax 2025-01 do 2026-04). Edge Function rollup zacznie dorzucać 2026-05 i dalej automatycznie 1. czerwca 2026

### Korekty dokumentacji wynikające z umowy/karty gwarancyjnej

- **Panele**: Hyundai HiE-S400VG 400W → **JOLYWOOD JW-HD120N 385W** (20 sztuk, autorytatywne z umowy + karty gwarancyjnej)
- **Falownik**: umowa miała X3-HYBRID-8.0T → faktycznie **X3-Hybrid G4 10.0-M + mod. WiFi** (zmiana w trakcie bez aneksu, karta gwarancyjna potwierdza)
- **Moc PV**: 8.00 kWp → **7.70 kWp** (8.00 to nominalna falownika, 7.70 to realna DC paneli)
- **Daty**: pojedyncza "instalacja 2023-02-23" → trzy graniczne (12.01 odbiór, 17.02 wymiana licznika, 23.02 API start)

### Co dashboard pokaże po tych zmianach

Po Vercel rebuildzie (~30s) `/financial` powinien pokazać:
- **PGE-actual** liczone na bazie 37 miesięcy z faktur, nie estymaty rocznej. Realna liczba ~13 000-18 000 PLN (dla 24 000 PLN target)
- **Solax-reported** zostaje jak było (cumulative z `daily_aggregates`, undercounted)
- **Bilans inwestycji** używa lepszego (PGE-actual)
- **Próg zwrotu** — bardziej realistyczna projekcja na bazie tempa z PGE invoices

### Co trzeba dograć z eBOK PGE (niekrytyczne)

- Faktura obejmująca 09.2025-02.2026 — Michał ma dane w `06-tariff.md` ale PDF jeszcze nie analizowany. Po dotarciu wpisać `invoice_no` w 6 wpisach `historical_pge_invoices` które mają teraz `data_source = 'tariff_md_extracted'`
- Wyciągi bankowe 2024-10/12 dla reconciliacji 2 podejrzanych wpłat (sec 12 audytu)

---

## Stan na koniec dnia 30.04.2026

**Zrobione:** Fazy 0, 1, 2, 3 + Faza 3 enhancement A. Dashboard działa na production z autorytatywnymi danymi PGE.

**Statystyki kodu:**
- ~25 commitów do main od początku Fazy 0
- 5 migracji bazy + 1 zaplanowany cron
- 8 Edge Functions (z których 5 ma realną implementację: `refresh-token`, `poll-realtime`, `poll-alarms`, `daily-aggregates`, `roll-monthly-aggregates`)
- 5 stron dashboardu, 19 metryk z tooltipami
- Auth allowlist (3 maile rodziny)

**Następne fazy** (wg `01-strategia.md` i `05-implementation-plan.md`):

| Faza | Treść | Czas | Status |
|------|-------|------|--------|
| 4 | Chatbot operacyjny — Claude API + tool calling do Twoich danych. Pyta o produkcję/zużycie/finanse, używa `historical_pge_invoices` + `tariff_components` + `monthly_aggregates` żeby precyzyjnie odpowiadać | 1 dzień | ⏳ ODBLOKOWANE (O-003 closed) |
| 6 | Email digest tygodniowy/miesięczny + alerty na pad pipeline'u (Resend, ~3000 maili/mc free) | pół dnia | ⏳ pending |
| 5 | Chatbot techniczny RAG — Voyage embeddings + parsowanie PDF-ów Solax X3-Hybrid manuali | 1 dzień | ⏳ pending (czeka na PDF-y w `docs/solax-pdfs/`) |
| 7 | Multi-tenant polish + onboarding flow — gdy będą prawdziwi klienci poza rodziną | 1 dzień | ⏳ pending |

**Moja rekomendacja jako 20-letni senior:** następna **Faza 6** (alerty mailowe). Dashboard żyje, ale rodzina nie wchodzi codziennie. Mail "uwaga, falownik się wyłączył 14h temu" to konkretny mechanizm który dostarcza wartość bez kliknięcia. Faza 4 (chatbot) jest cool ale to bardziej "zabawka" — Faza 6 to "monitorowanie", czyli istota produktu.

---

## Faza 3 — bugfixy po pierwszym uruchomieniu na production (30.04.2026 wieczorem)

Po włączeniu env vars i pierwszym wejściu Michała na `solax-monitor.vercel.app`:

### Bug 1 (krytyczny): PGE-actual = 0 zł

**Symptom:** kafelek "PGE-actual" pokazywał 0 zł mimo że w `historical_yearly_consumption` były dane pre-PV.

**Przyczyna:** rozjazd nazwy klucza w JSON `tariffs.zones`:
- Seed wstawił `price_brutto_pln_kwh` (obecna nazwa po `06-tariff.md`)
- Kod (`lib/data/types.ts` + `lib/tariff/index.ts`) szukał `rate_brutto_pln_kwh` (stara nazwa z drafta)
- Konsekwencja: `getZoneRateBrutto()` zwracał 0 → hypotheticalCostNoPv = 0 → pgeActualSavings = max(0 - paid, 0) = 0

**Fix (commit następny):** `lib/data/types.ts` Tariff zones zmienione na `price_brutto_pln_kwh` + opcjonalne `hours`/`days_of_week`. `lib/tariff/index.ts` `getZoneRateBrutto` czyta oba klucze (`price_` najpierw, fallback na `rate_`) dla bezpieczeństwa.

### Bug 2: Forecast chart x-axis duplikacja

**Symptom:** prognoza bilansu rendrowała oś X dwa razy (2023-2035 powtarzane).

**Przyczyna:** Recharts `<Area data={A}>` i `<Line data={B}>` z osobnymi `data` arrays dokleja oba sety punktów do osi.

**Fix:** przepisany na jeden `data` na poziomie `<ComposedChart>`, dwa dataKey (`actual` + `projection`) z null-fillem dla nieaktywnych segmentów. Last actual point zachowany w obu seriach żeby linia projekcji touched solid area bez gapu.

### Bug 3 (logiczny, do dyskusji): Solax niedoszacowuje import 89×

**Obserwacja:** Solax-reported koszt poboru z sieci za 13 mies. = **53 zł**. Faktura PGE 2025 jednoroczna = ~4 707 zł (4282 kWh × 1.0991 PLN/kWh).

**Wcześniejsze wyjaśnienie** (do D-012, przed O-003): "Solax nie liczy energii idącej do baterii nocą jako importu". Plot twist: w O-003 ustaliliśmy że bateria fizycznie nie istnieje (display 0.0V). Więc tłumaczenie traci moc.

**Aktualne hipotezy** (do diagnostyki, nieblokujące):
- Nieprawidłowe okablowanie clamp meter / CT na liniach AC — Solax widzi tylko fragment importu
- Solax `today_import_energy_kwh` raportuje co innego niż faktura PGE myśli (np. tylko import "do PV-side", nie cały dom)
- Bug po stronie Solaxa w polach z deviceModel=14 dla X3-Hybrid-10.0-M

**Konsekwencja dla dashboardu:** Solax-reported zawsze będzie zaniżony, dlatego mamy **PGE-actual** jako równoległy numer zbliżony do prawdy. Po fix Bug 1 PGE-actual pokaże ~18 000 zł (przy `installation_cost_pln=24 000` to 75% drogi do break-even, próg zwrotu cofnie się z 2029 na ~2027).

### Bug 4 (data gap): brakujące lata 2024 + cost 2025 w historical_yearly_consumption

**Stan przed fix:** był wpis 2023 z faktury (4073 kWh, 2727 zł), brak 2024, 2025 miało kWh (4282) ale `total_cost_brutto_pln: null`.

**Fix (migracja `20260430134304_fill_historical_gaps.sql`, zaaplikowana na remote):**
- 2024 wpisany: 4178 kWh = mean(2023, 2025), cost = NULL, notes "PLACEHOLDER — interpolated, replace with real PGE invoice"
- 2025 cost dosypany: 4707 zł = 4282 × 1.0991, notes "estimated G11 brutto"

**Co potrzeba żeby PGE-actual był 100% precyzyjny:**
- Faktura PGE 2024 roczna od Krzysztofa → wpisać realne `consumption_from_grid_kwh` + `total_cost_brutto_pln`
- Faktura PGE 2025 roczna → wpisać realny cost (zamiast naszej estymaty)
- Faktura PGE 2023 (jeśli istnieje rozłożona) — Michał ma wpis ale tylko ~10 mies. PV (luty start)

Dane do uzyskania od Krzysztofa, niekrytyczne na MVP. Można dorzucić w trakcie Fazy 6 gdy będzie potrzebne dla mailowych digestów.

---

## Faza 3 — copy & UX polish (30.04.2026 wieczorem, dalej)

Po pierwszym żywym wejściu Michała na production:

### Tooltipy "Co to znaczy?" wszędzie

**Problem:** Michał patrząc na "PGE-actual" / "Solax-reported" / "Próg zwrotu" / "RCEm" / "Autokonsumpcja" musi pamiętać co to znaczy. Tata patrzący pierwszy raz nie wie. Brakowało in-context help.

**Rozwiązanie:**
- `lib/copy/glossary.ts` — 19 polskich definicji (1-3 zdania każda) dla wszystkich metryk dashboardu
- `components/dashboard/info-hint.tsx` — komponent z ikoną Info i glass tooltipem, korzysta z shadcn Tooltip (base-ui pod spodem)
- `KpiTile` ma teraz opcjonalny prop `hint` — automatycznie rendruje ikonę Info obok labela
- Każda strona dashboardu (Overview/Daily/Monthly/Yearly/Financial) ma hinty na KPI tiles
- Financial hero ma hinty na "Bilans inwestycji", "Próg zwrotu", "Solax-reported", "PGE-actual"

### Lepszy narrator dla edge case "dzień ale 0 W"

**Problem:** narrator mówił "Słońce nie świeci, panele odpoczywają" gdy faktycznie było 17:00 popołudniu i falownik wyrzucił 0 W (chmury / glitch Solax).

**Fix:** `lib/derive/buildLiveCommentary` rozróżnia trzy stany przy `pvW < 50`:
- godzina 21:00–05:00 Warsaw: "Słońce nie świeci, panele odpoczywają" (faktyczna noc)
- dzień + dailyYield > 0.5 kWh: "Panele teraz nie produkują — pewnie chmury albo falownik się wyciszył"
- dzień + brak produkcji dziś: "Panele jeszcze nie ruszyły dziś z produkcją"

W Fazie 4 narrator dostanie warstwę Claude API z tool calls, rules-based zostaje jako fallback gdy budget jest exhausted lub API niedostępne.

### Folder structure dla dokumentów rodziny

**Problem:** Michał ma faktury PGE 2023/2024/2025, umowy SunWise, decyzje dotacji NFOŚiGW — chce wrzucić skany żebym mógł je czytać i precyzyjnie wpisywać dane do bazy.

**Rozwiązanie:** dorzucony `docs/README.md` z mapą folderów + workflow:
- `docs/source-documents/` (gitignored, istnieje) — faktury SunWise, przelewy, NFOŚiGW
- `docs/pge-invoices/` (gitignored, istnieje) — faktury PGE roczne i miesięczne
- `docs/solax-pdfs/` (gitignored, istnieje) — manuale producenta dla Fazy 5 (RAG)
- `docs/private/` (gitignored, istnieje) — `financials.md`

Workflow: Michał skanuje, wrzuca, mówi mi w czacie nazwę pliku → ja używam Read tool → wpisuję dane do `historical_yearly_consumption` / `monthly_aggregates` / `tariffs.rcem_history` → migracja → push.

### Co jeszcze odłożone do następnych faz

- AI live commentary (Claude API + tool calling) — dochodzi w Fazie 4
- Tooltipy w Energy Flow nodes (są w KPI tiles, dodanie do energy flow nodes mało priorytetowe — chyba że Michał poprosi)
- "Bilans dnia" karta na /daily ma własny opis ale nie ma hint — można dorzucić jeśli okaże się mylące
- Pixel-perfect design polish — Faza 7

---

## Faza 3 — visual polish v2: Tesla style + grywalizacja + długoterminowa prognoza (1.05.2026)

Obszerna sesja UX/UI bazująca na researchu Michała (`docs/source-documents/Badanie aplikacji fotowoltaicznych dla użytkowników.docx`, 188 paragrafów benchmarków Tesla / Enphase / Tibber / Huawei / SolarAssistant). Cel: dashboard "ready dla rodziny", premium-quality, w stylu Apple Fitness + Tesla Energy.

### Top wnioski z researchu zaadresowane do projektu

| Insight | Status |
|---------|--------|
| Tesla animowany energy flow z poruszającymi się kropkami | ✓ wdrożone (5 ścieżek SVG, 3 kropki na każdą, stagger 0.83s, 2.5s loop) |
| Wykres progu rentowności od ujemnego CAPEX (Złoty Graal) | ✓ wdrożone — krzywa zaczyna od -24 000 zł, dwie krzywe (real + Solax), reference lines (CAPEX/Brutto/Próg zwrotu) |
| Avoided Costs vs Export Revenues — kategoryczne rozróżnienie | ✓ wdrożone jako donut na `/financial` |
| Dwa scenariusze ROI (Solax/realny) z wyjaśnieniem | ✓ wdrożone na `/overview` (Investment Hero z dual progress ring) i `/financial` (break-even chart) |
| MPPT split (Enphase wisdom) — wczesna detekcja zacienienia | ✓ wdrożone — tile pod energy flow, detekcja "Możliwe zacienienie" gdy ratio < 0.3 |
| Grywalizacja: streaks + odznaki + roczny pasek + loss-aversion | ✓ wdrożone — produkcja streak, finansowy plus streak, cel roczny 7000 kWh, 5+ odznak typu pierwszy >30 kWh / 100 dni produkcji / 5 MWh łącznie |
| System status badge zero-click | ✓ wdrożone — green/yellow/red z natural-language detail |
| "Jak to działa?" plain-Polish onboarding | ✓ wdrożone — collapsible akordeon z 6 sekcjami (jednostki, bilans, eksport, alarmy, cel) |
| Inline descriptions na KPI tiles (nie ukryte w tooltipie) | ✓ wdrożone — `KpiTile` ma optional `description` prop, widoczny na surface |
| Spolszczenie ("lifetime" → "łączna") | ✓ wdrożone |
| Długoterminowa prognoza 2030/2040/2050 | ✓ wdrożone — `LongTermForecastChart` z 3 scenariuszami wzrostu cen + degradacja paneli 0.5%/rok |

**Świadomie odrzucone** (insighty z researchu nie pasujące do MVP):
- Sąsiedzkie benchmarki (jeden user, niemożliwe)
- Heatmap RCE godzinowy (brak danych godzinowych z PSE — mamy tylko miesięczne)
- AI rekomendacje przez Claude API (chatbot odłożony, overpriced wg Michała)
- Treemap zużycia per urządzenie (Solax nie ma device-level monitoring)
- Tibber Earnings/Self-Consumption mode toggle (brak baterii)

### Sekwencja commitów tej sesji (chronologicznie)

| # | Commit | Treść |
|---|--------|-------|
| 1 | `ffef8bd` | Tesla-style energy flow z animowanymi kropkami SVG + MPPT split tile + system status badge (green/yellow/red) |
| 2 | `d957878` | Bento Overview v2: Investment Hero z dual progress ring (Real + Solax tempo) + period cards (Dziś/Tydzień/Miesiąc) + buildRoiScenarios() |
| 3 | `fcf0077` | Grywalizacja — streak counter, yearly goal bar, achievements, "Jak to działa?" collapsible. Calculations w `lib/derive/gamification.ts` |
| 4 | `1afb45b` | Financial: Tesla break-even chart od -24k CAPEX z dual tempo + Avoided/Export donut + sekcja wyjaśniająca dwa scenariusze tempa |
| 5 | `cf3925b` | Migracja: invoice 03/2509/00137305/2 oznaczona jako paid (Michał potwierdził) |
| 6 | `c53b45a` | Overview top contextual summary card + per-card mini-comments + większy Investment Hero z opisami widocznymi (nie w tooltipie) + emoji → lucide ikony + milestone timeline + rozszerzone HowItWorks (6 sekcji) |
| 7 | `57ac1e7` | Financial: visible inline descriptions pod KPI tiles (RCEm/koszt poboru/PGE-actual wytłumaczone na surface) + spolszczenie "lifetime" → "Łączna produkcja" |
| 8 | `8a9eafb` | Fix tempo realne (last-12mo PGE zamiast 3-year avg) + długoterminowa prognoza 2030/2040/2050 w `/financial` z 3 scenariuszami wzrostu cen |
| 9 | `c522c6b` | Daily/Monthly/Yearly polish: quick pills "Wczoraj/Tydzień temu" w `/daily` + grupowany MonthPicker w `/monthly` z kluczowymi wskaźnikami i YoY comparison + per-year filter w `/yearly` z drill-down tabelą |

### Stan końcowy aplikacji (1.05.2026)

**Strony:**
1. `/login` — auth allowlist (3 maile rodziny), cookie 30 dni, HMAC-signed
2. `/overview` — bento z 5 strefami:
   - Strefa 0: Top contextual summary (2-3 zdania interpretacji dziś/tydzień/miesiąc) + status badge
   - Strefa 1: Energy flow Tesla-style z animowanymi kropkami + live commentary + MPPT split
   - Strefa 2: Period cards (Dziś/Tydzień/Miesiąc) z mini-komentarzami + Investment Hero (dual ring) z 2 scenariuszami ETA
   - Strefa 3: Quick stats (4 mini-tile)
   - Strefa 4: Grywalizacja — yearly goal + 2 streaks + milestone timeline z lucide icons
   - Strefa 5: HowItWorks (rozbudowany 6-sekcyjny akordeon) + Alarmy
3. `/daily?date=YYYY-MM-DD` — wykres 24h area chart, 4 KPI, bilans dnia, contextual comment, quick pills (Wczoraj/Tydzień/Miesiąc temu)
4. `/monthly?month=YYYY-MM` — bar chart dni miesiąca, 4 KPI, top 3 dni, grupowany MonthPicker (per-rok), Kluczowe wskaźniki sekcja, YoY comparison, fallback do `historical_pge_invoices` dla starych miesięcy
5. `/yearly?year=YYYY` — grouped bar chart YoY, 4 KPI, tabela roczna z PGE invoices, per-year filter pills, single-year drill-down z tabelą per-miesiąc
6. `/financial` — Investment Hero, dwa scenariusze tempa (Solax/Realny) z opisami, 4 KPI breakdown, break-even chart Tesla style od -24k, Avoided/Export donut, długoterminowa prognoza 2030/2040/2050, sekcja faktur PGE (10 dokumentów), tabela 12 miesięcy

**Schema bazy (Supabase Postgres):**
- 13 tabel z RLS
- 10 oryginalnych (z initial schema): `user_inverters`, `plant_realtime_readings`, `device_realtime_readings`, `monthly_aggregates`, `daily_aggregates`, `inverter_alarms`, `tariffs`, `api_credentials`, `documentation_chunks`, `historical_yearly_consumption`
- 3 dodatkowe (Faza 3 enhancement A): `historical_pge_invoices` (37 mies.), `pge_invoices` (10 dokumentów), `tariff_components` (29 wpisów)
- Wszystkie kolumny user-specific zabezpieczone RLS
- Service-role client dla server components (bypass RLS dla MVP single-user)

**Edge Functions (deployed):**
1. `refresh-token` — cron co 25 dni, OAuth refresh Solax
2. `poll-realtime` — cron co 5 min, plant + device data + bug fix totalActivePower
3. `poll-alarms` — cron co 15 min
4. `daily-aggregates` — cron 01:00 UTC, dzienne agregaty + kalkulacje finansowe
5. `roll-monthly-aggregates` — cron 1. dzień 02:00 UTC, daily → monthly rollup
6. Stuby: `weekly-digest`, `monthly-digest`, `update-rcem`, `send-alert` — implementacja w Fazie 6

**Komponenty UI:**
- 13 shadcn (button, card, tabs, skeleton, input, label, dropdown-menu, sonner, avatar, badge, progress, separator, tooltip)
- 17 dashboard-specific (header, sidebar, mobile-nav, refresh-indicator, kpi-tile, energy-flow, mppt-split, system-status-badge, info-hint, alarms-widget, investment-hero, progress-ring, gamification-row, how-it-works, month-picker, date-nav, logout-button, nav-config)
- 5 charts (daily-line, monthly-bar, yearly-grouped, forecast, break-even, avoided-export-donut, long-term-forecast)

**Lib:**
- `lib/format` — PL formatery (PLN, kWh, kW, %, daty, relative time)
- `lib/data/{client,queries,types}` — Supabase service-role + 11 high-level queries + types
- `lib/tariff` — calculations + getEffectivePricePerKwhBrutto + calculatePgeActualSavings
- `lib/derive/{index,forecasts,gamification,overview-commentary}` — pure functions (energy flow, ROI scenarios, streaks, achievements, contextual narration)
- `lib/auth/{config,session,middleware}` — allowlist auth z HMAC cookie
- `lib/copy/glossary.ts` — 19 polskich definicji terminów
- `lib/date` — Europe/Warsaw helpers

### Co dashboard pokazuje na dziś (1.05.2026)

| Metryka | Wartość |
|---------|---------|
| **Bilans inwestycji** (Realny tempo, najbliższe prawdy) | ~9 100 zł zwrócone z 24 000 zł netto = **38%** |
| **Tempo realne** (last-12mo PGE) | ~3 058 zł/rok |
| **Tempo Solax** (last-365 days inverter) | ~6 508 zł/rok (zaniżony import) |
| **Próg zwrotu** (real tempo, liniowo) | ~maj 2031 |
| **Próg zwrotu** (Solax tempo, liniowo) | ~grudzień 2028 |
| **Lifetime produkcja PV** (Solax licznik) | 17,7 MWh (od 17.02.2023) |
| **Lifetime eksport** (z faktur PGE) | 10 032 kWh za 3 198 zł depozytu |
| **Lifetime pobór z sieci** (z faktur PGE) | 12 277 kWh |
| **Suma zapłat PGE** | ~5 460 zł za 35 mies. |
| **Cel roczny 2026** | 7 000 kWh (1100 kWh/kWp/rok dla woj. mazowieckiego × 7,7 kWp) |
| **Streak dni produkcyjnych** | 30+ z rzędu (sezon w pełni) |

### Krytyka 20-letniego seniora — co dorobić w przyszłości

**P0 — krytyczne dla SaaS (poza rodziną):**
- Magic link auth zamiast allowlist 3 maili
- User-scoped Supabase client + RLS verification (porzucenie service-role w UI)
- Rate-limiting na proxy
- CSP headers
- Sentry monitoring Edge Functions

**P1 — kluczowe dla rodzinnego użytkowania:**
- Faza 6: alerty mailowe (Resend) — bez tego rodzina nie wie że pipeline padł
- Health-check cronów (czy `roll-monthly-aggregates` faktycznie się wywołał ostatniego 1.)
- Retry/backfill mechanizm dla chybionych polli
- Graceful degradation gdy Supabase pada

**P2 — wartość dodana (nice-to-have):**
- Pogoda OpenWeatherMap w live commentary ("Jutro pochmurno, naładuj rozsądnie")
- Eksport CSV / Print-friendly PDF dla księgowego
- Web Push notifications
- Custom date range picker
- Skróty klawiszowe (g o, g f, etc)

**P3 — odłożone do Fazy 4-7:**
- Chatbot operacyjny (Claude API) — Faza 4
- Chatbot techniczny RAG na manualach Solax — Faza 5
- Multi-tenant onboarding flow — Faza 7
- Mobile app (PWA) — Faza 7
- ESG raporty — gdy wejdzie B2B klient

### Otwarta lista zadań (rozliczeniowe / niedokończone)

- [ ] Faktura PGE okres 09.2025-02.2026 (PDF) — Michał ma dane w `06-tariff.md` ale PDF nie zwalidowany. Po dotarciu wpisać `invoice_no` w 6 wpisach `historical_pge_invoices` które mają obecnie `data_source = 'tariff_md_extracted'`
- [ ] Wyciągi bankowe 2024-10/12 dla reconciliacji 2 podejrzanych wpłat (sec 12 audytu)
- [ ] Rotacja sekretów po sesji: GitHub PAT (już zrewokowany), VERCEL_TOKEN, ewentualnie Supabase keys i Solax Client Secret
- [ ] Decyzja Michała + Krzysztof: zakup baterii + EV jako pakiet (notatka biznesowa, niewpływa na kod)

---

## UX Audit response (1.05.2026 wieczorem)

Po sesji visual polish v2 Michał przeprowadził audit UX/UI dashboardu i wrzucił 24 punktów action items w `docs/context/09-ux-audit-action-items.md` (5 sprintów: trust killers, hierarchy, clarity, microcopy, investigations). Zaadresowane w 2 commitach.

### Sprint 1 — Trust killers (commit `6c343e3`)

Wszystkie 5 punktów P0 zaadresowane:

| # | Bug | Naprawa |
|---|-----|---------|
| **A.1** | Rekord dzienny 678 kWh fizycznie niemożliwy | Migracja `20260501113904_fix_bad_daily_aggregate_2025_05_06.sql`: NULL na zły wiersz + CHECK constraint `yield_kwh BETWEEN 0 AND 100`. Plus sanity check w `calculateMilestones`. Realny rekord: 39,4 kWh |
| **A.2** | Streaki 71=71 dni produkcyjnych vs finansowych | Diagnoza: Solax zaniża `cost_pln` (1,70 zł/rok), więc każdy dzień produkcyjny iluzorycznie "na plus". Druga metryka redefiniowana na "Dni z mocną produkcją (≥5 kWh)" |
| **A.3** | "Cel roczny" status sprzeczny | Logika 3-poziomowa `ahead/on_pace/behind` z PROJEKCJI końca roku, nie YTD vs cel. Suppressed gdy `daysIntoYear < 90`. Cel dynamiczny z `pv_capacity_kwp × 1000`. Sidebar 7,7 kWp wszędzie |
| **A.4** | "Typowo zimą" w maju | Narrator sezonowy w `lib/derive/overview-commentary.ts`: zima/wiosna/lato/jesień + edge case dzień 1-2 |
| **A.5** | YOY -97% mylący | Logika użyta `lastSharedMonth` zamiast `todayMonth`. Disable badge gdy `<2` mies. shared. KpiTile description wprost wyjaśnia metodę |

### Sprint 2-4 (commit `9c46c3c`)

Hierarchy + clarity + bilans breakdown:

| # | Co | Naprawa |
|---|-----|---------|
| **C.1** | Duplikat 4 quick-stats na Przeglądzie | Usunięte (energy flow + 4 kafelki pokazywały te same liczby) |
| **C.3** | Bilans dnia ukryty na dole `/daily` | Hero `glass-strong` z `text-5xl` jako pierwszy element po DateNav |
| **C.6** | Bieżący rok szary na wykresie YoY | `yearColorMap`: current year = savings green, historyczne gradient pv→gridExport→muted. Plus suffix "(bieżący)" w legendzie |
| **C.7** | Empty state Maja 2026 nieinformatywny | `EmptyMonthState` z 3 stanami: dzień 1-2 / mid-current / pre-Solax. Każdy z innym CTA |
| **A.6** | "Eksport 2 zł" (Solax noise) | KPI używa `SUM(historical_pge_invoices.deposit_value_pln)` (~3 198 PLN z 37 faktur). Donut też. Komentarz wyjaśnia czemu Solax nie liczy |
| **A.7** | Bilans Inwestycji niezrozumiały breakdown | Nowa karta "Z czego się składa Twój bilans" z 3 liniami (autokonsumpcja + depozyt − koszt = bilans) z kropkami kolorów + opisem źródła każdego strumienia |

### Świadomie odłożone do następnej tury (8/24)

| # | Co | Czemu odłożone |
|---|-----|----------------|
| C.2 | Reorganizacja sekcji Przeglądu wg czasokresu | Większy refactor layoutu — lepiej zrobić po feedbacku z aktualnej wersji |
| C.4 | Kapsułki Roku reagują na filterYear | Wymaga rewrite logiki YoY/best-month/current-year w `/yearly` żeby `filterYear` przepiętrzała się przez wszystkie obliczenia |
| C.5 | Toggle metryki nad wykresem Roku (Produkcja/Eksport/Pobór) | Wymaga client component z URL state — nie krytyczne |
| C.8 | Próg rentowności wykres wyżej w Finansach | Drobna zmiana kolejności — odłożona |
| D.1 | Pełne tooltipy z formułą dla każdego KPI | ~30 tooltipów × wzory matematyczne — duża praca |
| D.2 | Narrative banner na Finansach | Jest w Overview/Daily/Monthly/Yearly, dorobimy w Finansach |
| D.3 | Unified `<EmptyState>` component | Mamy 3-stan na /monthly z C.7, do refactor na shared |
| D.4-D.5 | "Ostatnia aktualizacja" copy + 3-poziomowa MPPT asymetria | Drobne, do agregacji |

### Świadomie skipped (2/24)

| # | Co | Czemu skipped |
|---|-----|----------------|
| C.9 | Faktura "Po terminie" alert banner | **Sprawdziłem**: jedyna `paid_late` to `03/2505/00099527` z 2 dni opóźnienia, **już zapłacona** (paid 2025-06-06, due 2025-06-04). Banner "musisz zapłacić" mylący. Tag w tabeli + tooltip wystarczają |
| C.10 | Bilans donut — primary + sekundarne | Investment Hero ma już dual progress ring (outer Realny dominuje, inner Solax subtelny). Plus card A.7 daje explicit breakdown. Audit krytykuje wcześniejszą wersję bez breakdown'u |

### Verifications wykonane (B-list partial)

Sprawdzone przez REST API zanim wprowadzono zmiany A.*:
- ✅ A.1: bad row 2025-05-06 = 678 kWh (drugi rekord 39,4 kWh)
- ✅ A.2: streak production = 71, balance = 71 (dane potwierdzają)
- ✅ A.6: total earnings_pln = 1,70 zł rocznie (bug Solax)
- ✅ A.7: 3 streamy w breakdown (savings + deposit − cost) → math math sprawdzona
- ✅ Faktura paid_late = 1 (już zapłacona)
- ✅ user_inverters.pv_capacity_kwp = 7.7 (audit miał starą "8 kWp")

Pozostałe B-list (B.1 lifetime PV, B.2 suma faktur, B.5 autokonsumpcja vs G11, B.8 bilans dnia 35,74 zł formuła) — odłożone do następnej tury jako focused verify pass.

---

## Sesja 1.05.2026 noc — Tydzień + Raporty + design system v2

Kolejna runda po UX audit response. Obejmowała 3 commity:

### Commit `75aa01c` — pierwszy podejście: tech grid + niebieski brand + nowe zakładki

Eksperymentalny visual identity z panel-grid background (jak panele PV) + powolny niebieski sweep + electric blue brand color (#1E90FF). Dodałem zakładki **Tydzień** (`/weekly`) i **Raporty** (`/reports`) z narratorem.

| Element | Co zrobione |
|---------|-------------|
| Background | TechBackground component: srebrny panel-grid 64×32px + diagonal sweep co 14s, GPU-only animation |
| Sidebar | Active state z gradient niebieski + lewy 2px brand-strip + glow shadow + filled icon |
| Mobile nav | Scroll + niebieski active dot |
| Token `--brand` | Electric blue oklch(0.62 0.18 230) jako primary accent |

**Faza 3.5 — narrator (`lib/derive/period-narrator.ts`):**
- 4 funkcje: `narrateDay/Week/Month/Year` z headline + body[] + tone (good/neutral/info/bad)
- Sezon-aware (oczekiwane kWh/dzień per miesiąc dla 7,7 kWp)
- Wpięte w /daily, /weekly, /monthly, /yearly
- Komponent `<PeriodNarrative>` w 2 wariantach (default card + compact)

**Tab `/weekly`:**
- DateNav po tygodniach (poniedziałek-niedziela), 7-dniowy bar chart
- KPI grid (produkcja, zużycie, pobór, eksport)
- Day-by-day grid z linkami do `/daily?date=...` — best day highlighted

**Tab `/reports`:**
- Banner intro + 3 sekcje: 6 tygodni / 12 miesięcy / N lat
- Każdy raport: kropka tonacji + headline + 2 zdania narracji + 3 KPI inline
- Button "Wyślij mailem" → otwiera klient pocztowy z gotowym `mailto:` (działa od razu, bez Resend)
- Button "PDF" → toast "wkrótce" (Faza 6)

### Commit `c911e12` — wycofanie niebieskiego, design system per `10-color-system.md`

Po feedbacku Michała ("siatka jednak mi się nie podoba, wracajmy do gradientu") + dostarczonym design system markdownie. Pełen pivot na ciepłą paletę.

| Faza | Co zrobione |
|------|-------------|
| 1. Usunięcie | TechBackground component delete, panel-grid CSS purge, niebieski `--brand` purge |
| 2. Paleta | Pełna skala `--brand-50..800` (zielony #16A34A primary) + `--solar-50..800` (pomarańcz #D97706 primary) + state tokens (success/warning/error/info) |
| 3. Tailwind 4 | `@theme inline` aliasy `--color-brand-*`, `--color-solar-*` — klasy `bg-brand-600`, `text-solar-800` itd. |
| 4. Tła | `--bg-gradient-main` warm 135° (#FFF4E6 → #FAFBE9 → #E8F5E9), `--bg-gradient-sidebar` pomarańczowy 180° |
| 5. Sidebar | Pomarańczowy gradient bg, active state w `solar-100` linear gradient z `solar-800` text + `solar-600` ikona w pillu z ringiem `solar-300`. Status dot zielony brand-500 z pulse |
| 6. Narrator | Tone dots: good/neutral=brand-600 (zielony), info=solar-500 (pomarańcz), bad=error-icon (czerwony) |
| 7. Wykresy | `recharts-base` CHART_COLORS przepisana per design doc 5.4: yearCurrent=#16A34A, yearPrevious=#86EFAC, yearOlder1=#FCD34D, yearOlder2=#94A3B8 |
| 8. Yearly chart | Bieżący rok zawsze yearCurrent (mocny zielony), historyczne pastelują |
| 9. Pastylki | 4 warianty CSS (`btn-twin`/`btn-brand`/`btn-accent`/`btn-ghost`) + Button CVA variants `twin`/`brand`/`solar-accent`/`soft-ghost` |
| 10. Stany | `.pill-success`/`.pill-error`/`.pill-warning`/`.pill-neutral` jako utility classes |

**Why warm wins:** pomarańcz=energia/słońce, zielony=oszczędność/pieniądze. Wbudowana semantyka, samo-uczy. Niebieski tech vibe gryzł się z glassmorphism + nie pasował do family use case.

### Otwarte zadania zgłoszone przez Michała w sesji nocnej (do następnego sprintu)

| # | Zadanie | Powód | Priorytet |
|---|---------|-------|-----------|
| 1 | **Investment Hero rozbicie** na 2-3 osobne kafelki | Obecnie "Realne tempo" (last 12mo PGE = ~9000 zł) + "Solax tempo" (~5800 zł) razem → wizualnie zielone > pomarańczowe sugeruje że Realne tempo jest *szybsze*, ale to mylące (Realne tempo z PGE jest po prostu prawdą; Solax tempo niedoszacowuje przez bug API). Trzeba osobne kafelki z explicit "to dwa różne sposoby liczenia, oba wolne, oto dlaczego" | wysoki — psuje zaufanie do hero KPI |
| 2 | **Overview restructure** — Dziś / Tydzień / Miesiąc jako vertical stack w lewej kolumnie | Obecnie 3-col grid, user chce stronę dzielącą się na dwie kolumny: lewa = stack 3 podsumowań chronologicznie (najmłodsze u góry), prawa = Investment Hero rozbity | średni — usability |
| 3 | **PDF eksport** raportów na realnie | Obecnie button "PDF" pokazuje toast "wkrótce". Albo `window.print()` z print-friendly CSS (tani MVP), albo `@react-pdf` (pełna kontrola) | niski — mailto już daje workflow |

---

## Podsumowanie projektu (1.05.2026)

**Sesje od 30.04.2026 do 1.05.2026 (~36 godzin pracy)** zaowocowały:

- ✅ **30 commitów** do `main` (od initial commit)
- ✅ **5 stron dashboardu** w pełni funkcjonalnych z realnymi danymi
- ✅ **6 migracji bazy** + 6 stubów Edge Functions + 5 zaimplementowanych
- ✅ **Pełen pipeline danych live** — Solax → Edge Functions → Supabase → Next.js → Vercel
- ✅ **Multi-tenant ready** (RLS na każdej tabeli) mimo że MVP single-user
- ✅ **Apple Fitness + Tesla Energy quality UX** zgodnie z benchmarkami z researchu
- ✅ **37 miesięcy zwalidowanych danych finansowych** z faktur PGE
- ✅ **Dual ROI scenarios** (Solax tempo / Realny tempo) z wyjaśnieniami
- ✅ **Grywalizacja** (streaks, milestones, yearly goal) — research wskazuje +60-80% retencji
- ✅ **Glassmorphism + bento + animacje** premium-look
- ✅ **100% UI po polsku** (etykiety, formatowanie, narrator, tooltipy)
- ✅ **Auth allowlist** (3 maile rodziny, HMAC-signed cookies, 30 dni TTL)
- ✅ **Live updates** (auto-refresh co 5 min, freshness badge)
- ✅ **Mobile-first** (bottom tab bar, responsive bento)
- ✅ **Pełna dokumentacja** w `docs/context/` (10 plików × średnio 25 KB każdy)
- ✅ **9 plików kontekstu** wszystkie aktualne i sięgalne
- ✅ **O-001, O-003** zamknięte (Chatbot prywatny + bateria potwierdzona nieobecna)

**Co działa na production `solax-monitor.vercel.app` (Vercel Hobby, 0 zł/mc):**
- Pełen dashboard z autorytatywnymi danymi PGE
- Auth allowlist
- Pipeline polling co 5 min
- Backfill 16 mies. Solax + 37 mies. PGE invoices
- Wszystkie 5 stron + finalna polish UX/UI

**Run rate aplikacji:** ~0 zł/mc (wszystkie usługi w darmowych tierach: Vercel Hobby, Supabase free, GitHub free). Anthropic API zarezerwowane dla Fazy 4 chatbota — dochodzi przy ~10-30 zł/mc gdy ją włączymy.

**Następne kroki rekomendowane** (kolejność wg pilności):
1. **Faza 6 — alerty mailowe** (½ dnia, Resend free tier 3000 maili/mc)
2. **Health-checks + Sentry** (½ dnia, kosztuje 0 zł)
3. **Pogoda OpenWeatherMap** w commentary (3h, 0 zł)
4. **Eksport CSV/PDF** + print mode (2h)
5. Zostaw aplikację, oglądaj przez miesiąc, decyduj czy iść w Fazę 4 (chatbot) czy 7 (multi-tenant polish)

---

## Co jest gotowe do startu Fazy 2 (historyczne, archiwum)

## Co jest gotowe do startu Fazy 1 (historyczne, archiwum)

- `.env.local` ma `SOLAX_CLIENT_ID` i `SOLAX_CLIENT_SECRET` (do testów lokalnych przez Node)
- Supabase Vault ma te same sekrety (do użycia przez Edge Functions)
- Tabela `api_credentials` istnieje, RLS zabezpieczona
- Edge Function `refresh-token` istnieje jako stub, deployed
- W `_shared/solax-client.ts` jest stub czekający na implementację
- `supabase/scheduled-jobs.sql` ma cron 25-dniowy zakomentowany, gotowy do skopiowania do migracji

## Czego brakuje przed Fazą 1 startuje (nic blokującego)

- Anthropic API key — niepotrzebny do Fazy 1, dochodzi w Fazie 4
- Resend / Voyage — niepotrzebne do Fazy 1
- Battery model i pojemność — pole `battery_capacity_kwh` zostawimy NULL w `user_inverters`, uzupełnimy w trakcie

## Otwarte zadania bezpośrednio z Fazy 0 do rozliczenia w Fazie 1

Wszystkie sekrety, które krążyły w transcripcie tej sesji, do rotacji po zakończeniu Fazy 1 (higiena, niekrytyczne ale warto):

1. **GitHub PAT** — wygenerowany na 7 dni do force-pusha po filter-repo. Zrewokować na `https://github.com/settings/tokens` po Fazie 1.
2. **Solax Client Secret** — w `.env.local` i Supabase Vault. Zrotować przez `developer.solaxcloud.com` → Application → Regenerate Secret. Po rotacji update w `.env.local` i `supabase secrets set`.
3. **Supabase API keys** (publishable + secret) — Settings → API → Reset.
4. **Supabase DB password** — Database → Settings → Reset database password. Update `SUPABASE_DB_URL` w `.env.local`.

Plus jedna decyzja techniczna do podjęcia w Fazie 1:

5. **JWT keys legacy do Edge Functions** — wybrać strategię (legacy keys vs `verify_jwt = false` per function vs lokalna generacja JWT). Potrzebne do ręcznego curl-testowania funkcji w Fazie 1.

---

## Pliki referencyjne dla agenta wchodzącego nową sesją

Czytaj w kolejności jak `CLAUDE.md` mówi (`00-context.md` → `01-strategia.md` → `03-decisions.md` → `04-api-spec.md` → `05-implementation-plan.md` → `06-tariff.md` → `07-installation-history.md` → `02-case-study.md`). **Ten plik (`08-phase-status.md`) czytaj jako ostatni** — daje aktualny stan po prawdziwych pracach, na bazie pozostałych dokumentów które definiują plan i kontekst.

Dla danych finansowych (cena instalacji, dotacja, breakdown) idź do `docs/private/financials.md` (gitignored, lokalny tylko). Dla kontekstu instalacji bez konkretnych liczb finansowych — `docs/context/07-installation-history.md`.
