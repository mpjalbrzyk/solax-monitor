# CLAUDE.md

**Ten plik jest pierwszym co czyta Claude Code uruchomiony w tym repo. Określa kontekst projektu i wskazuje gdzie znaleźć resztę informacji.**

---

## Co budujemy

**Solax Monitor** to webowa aplikacja monitoringu fotowoltaicznego dla mojej rodziny (Michał Jałbrzykowski). Zastępuje panel Solax Cloud dla domowej instalacji 8 kWp z falownikiem Solax X3-Hybrid-G4 i baterią. Multi-tenant od dnia pierwszego z myślą o przyszłej komercjalizacji.

**Trzy filary:**
1. Dashboard webowy (Next.js 15 + Vercel) z magic link auth
2. Email digest tygodniowy/miesięczny + alerty (Supabase Edge Functions + Resend)
3. AI Chatbot prywatny w dwóch trybach: operacyjny (dane) i techniczny (RAG na dokumentacji Solax)

**Stack (po D-011, 30.04.2026):** Next.js 15 + Vercel, Supabase (Postgres + Auth + Storage + pgvector + **Edge Functions** + **pg_cron**), Anthropic Claude API, Voyage AI dla embeddings, Resend dla maili. **Sześć kont, pięć darmowych.** Run rate ~10-30 PLN/mc (tylko Anthropic API).

**Co wycięte:** ~~n8n~~, ~~Hetzner Cloud VPS~~, ~~Healthchecks.io~~. Wszystkie automatyzacje (cron polling, agregacje, digest, alerty) jako Edge Functions w `supabase/functions/` w TypeScript, scheduling przez pg_cron.

---

## Gdzie szukać kontekstu — kolejność czytania

**Wszystkie pliki dokumentacyjne są w `docs/context/`. Czytaj je w tej kolejności:**

1. **`docs/context/00-context.md`** — kim jest user, co posiada (instalacja PV), jakie identyfikatory, status integracji
2. **`docs/context/01-strategia.md`** — pełna strategia, mapa 10 problemów, architektura, plan fazowy 0-8, koszty
3. **`docs/context/03-decisions.md`** — wszystkie decyzje techniczne i biznesowe z uzasadnieniem
4. **`docs/context/04-api-spec.md`** — specyfikacja Solax Developer Portal API z realnymi payloadami i schematem Supabase (10 tabel)
5. **`docs/context/05-implementation-plan.md`** — Twój dedykowany przewodnik. Struktura repo, fazy implementacji 0-8 step-by-step, lista "10 rzeczy żeby NIE zepsuć"
6. **`docs/context/06-tariff.md`** — konfiguracja taryfy PGE G11 z realnymi cenami z faktury, RCEm history, algorytm kalkulacji finansowej
7. **`docs/context/07-installation-history.md`** — historia powstania instalacji, koszty, dotacja, ROI break-even
8. **`docs/context/02-case-study.md`** — perspektywa biznesowa, dialogi z chatbotem (przydatne dla UX)
9. **`docs/context/08-phase-status.md`** — **aktualny stan każdej fazy, problemy z runtime'u i jak je rozwiązano**. Czytaj na końcu — pokazuje gdzie jesteśmy względem planu (Faza 0 done, Faza 1 next).

**Po przeczytaniu wszystkich tych plików masz pełny kontekst.** NIE pytaj Michała o rzeczy które są w tych plikach — sięgnij do nich.

---

## Pliki źródłowe (reference, nie do edycji)

**Wszystkie poniższe foldery są gitignored.** Pliki istnieją lokalnie na maszynie Michała, NIE są w repo na GitHubie. Claude Code uruchomiony lokalnie ma do nich dostęp przez Read.

W `docs/source-documents/` (gitignored, dane wrażliwe):
- `Rachunki_Legionów.xlsx` — analiza rachunków 2015-2023 od brata Michała
- `Proj_WM7KSSe.pdf` — koncepcja systemu PV od SunWise z 2021
- `faktura-PRO-FORMA_*.pdf` — faktura proforma
- `pko_trans_details_*.pdf` — 3 potwierdzenia przelewów

W `docs/pge-invoices/` (gitignored, dane wrażliwe):
- `Druki-2026-energia-PGE.pdf` — komunikat informacyjny PGE z cennikiem URE 2026
- `energetyka-2026.pdf` — faktura PGE z marca 2026 (źródło danych w `06-tariff.md`)

W `docs/solax-pdfs/` (gitignored, idą do Supabase Storage przy Fazie 5):
- X3-Hybrid-G4 User Manual
- X3-Hybrid-G4 Datasheet
- X3-Hybrid-G4 Installation Manual
- Battery Manual (model TBD)

W `docs/private/` (gitignored, kluczowe liczby finansowe):
- `financials.md` — koszt instalacji netto, dotacja, breakdown przelewów, numery kont bankowych. Czytaj zanim implementujesz sekcję Financial dashboardu albo kalkulację ROI.

---

## Kluczowe identyfikatory (quick reference)

```
Plant ID:        1613529907775754244
Inverter SN:     H34B10H7319017
Dongle SN:       SXTGG4YRYR
deviceModel:     14 (X3-Hybrid-G4)
PV capacity:     8.00 kWp
Install date:    2023-02-23
Timezone:        Europe/Warsaw
GPS:             52.2912 N, 21.1198 E

Solax API base:  https://openapi-eu.solaxcloud.com
App Code:        b64c796a-d03d-4595-b54c-067908c615dc
```

Credentials (Client ID, Client Secret, access_token) NIE są w repo. Są w password managerze Michała plus `.env.local` (gitignored).

---

## Jak komunikujesz z Michałem

Po polsku, casual, jak kolega po fachu nie konsultant. Direct, no-bullshit. Krytykę i wątpliwości mówisz wprost ale konstruktywnie.

**Nie:** długie myślniki em-dash w prozie, nadmiar bullet pointów, nagłówki gdzie nie trzeba, "świetne pytanie!", emoji, owijanie w bawełnę.

**Tak:** liczysz koszty i czas zawsze gdy się da. Proponujesz alternatywy. Pytasz o brakujące dane TYLKO gdy ich nie ma w plikach.

---

## Pierwsza rzecz którą robisz po przeczytaniu wszystkiego

1. Powiedz Michałowi że przeczytałeś dokumenty i jesteś gotowy
2. Zapytaj którą fazę startujemy (zwykle Faza 1 - Pipeline danych, jeśli infrastruktura już stoi)
3. Sprawdź `.env.local` czy jest skonfigurowany. Jeśli nie, zatrzymaj się i poproś o brakujące credentials
4. Przed pisaniem kodu, ZAWSZE pokaż plan jak działać (co stworzysz, w jakiej kolejności)

---

## Co NIE wolno

1. Commitować `.env.local` ani żadnych sekretów. Sprawdź `.gitignore` zawiera `.env.local`.
2. Wprowadzać nowych narzędzi/bibliotek bez wyraźnej zgody Michała. Stack jest zlockowany w `05-implementation-plan.md` sekcja 2.
3. Pominąć RLS w tabelach Supabase. Każda tabela z `user_id` MUSI mieć RLS policy.
4. Zgadywać liczb w chatbocie. Wszystko przez tool calling do Supabase.
5. Pomylić konwencji znaków w polach `*_power_w`. Patrz `04-api-spec.md` sekcja 6 i 7.

---

## Pełna lista "10 rzeczy żeby nie zepsuć"

W `docs/context/05-implementation-plan.md` sekcja 13. Przeczytaj zanim zaczniesz cokolwiek kodować.

---

*Ten plik jest punktem startu. Reszta wiedzy jest w `docs/context/`.*
