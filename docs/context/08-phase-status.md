# Solax Monitor — Status faz wdrożenia

**Cel pliku:** punkt referencji dla każdej kolejnej sesji Claude Code (i Michała). Mówi co zostało zrobione, jakie problemy napotkaliśmy po drodze, jak je rozwiązano. Aktualizowany na koniec każdej fazy.

**Ostatnia aktualizacja:** 30 kwietnia 2026, w trakcie Fazy 3 (krok 1/7 zrobiony).

---

## Status faz na dziś

| Faza | Tytuł | Status | Czas |
|------|-------|--------|------|
| 0 | Discovery i setup | ✅ DONE (30.04.2026) | ~1 dzień |
| 1 | Pipeline danych | ✅ DONE (30.04.2026) | ~1 dzień |
| 2 | Backfill historyczny | ✅ DONE (30.04.2026) | ~30 min |
| 3 | Dashboard webowy | 🟡 IN PROGRESS (krok 1/7) | 2-3 dni plan |
| 4 | Chatbot operacyjny | ⏳ pending | 1 dzień |
| 5 | Chatbot techniczny (RAG) | ⏳ pending | 1 dzień |
| 7 | Multi-tenant polish | ⏳ pending | 1 dzień |
| 6 | Email digest + alerty | ⏳ pending | pół dnia |

**Kolejność realizacji** (uzgodnione 30.04.2026): 0 → 1 → 2 → 3 → 4 → 5 → 7 → 6. Email digest na sam koniec, bo wymaga wszystkich pozostałych komponentów.

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
