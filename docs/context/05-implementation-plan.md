# Solax Monitor — Implementation Plan dla Claude Code

**Cel pliku:** ten plik jest dedykowanym przewodnikiem dla agenta kodującego (Claude Code, ewentualnie inny developer) który zaczyna pracę od zera. Zawiera onboarding kontekstowy, kolejność czytania plików, strukturę projektu, fazy implementacji, i konkretne instrukcje krok po kroku.

**Adresat:** Claude Code uruchomiony lokalnie w terminalu Michała (Mac), z dostępem do `/mnt/project/` (pliki dokumentacyjne tego projektu) i lokalnego workspace gdzie tworzy aplikację.

---

## 1. Pierwsze 5 minut — co czytasz

Zanim napiszesz pierwszą linię kodu, czytaj pliki w tej kolejności:

1. **`00-context.md`** — kim jest user (Michał), co posiada (instalacja PV), co chcemy zbudować, jaki stack
2. **`01-strategia.md`** — pełna strategia, mapa problemów, architektura, plan fazowy 0-8, koszty
3. **`03-decisions.md`** — wszystkie decyzje techniczne i biznesowe z uzasadnieniem (D-001 do D-009 plus otwarte O-001, O-002)
4. **`04-api-spec.md`** — kompletna spec integracji z Solax API włącznie z realnymi payloadami i schematem Supabase
5. **`02-case-study.md`** — perspektywa biznesowa, dialogi z chatbotem (przydatne przy projektowaniu UX)
6. **`project-instructions.md`** — instrukcje stylu komunikacji (relevant tylko jeśli używasz tego projektu w Claude.ai)

**Po przeczytaniu wszystkich tych plików masz pełny kontekst.** Nie pytaj Michała o rzeczy które są w tych plikach — sięgnij do nich.

---

## 2. Stack i wersje (lock)

```
Frontend:
- Next.js 15 (App Router, Server Components)
- React 19
- TypeScript 5.x
- Tailwind CSS 4.x
- shadcn/ui (komponenty)
- Recharts (wykresy) lub Tremor (drugi wybór)
- lucide-react (ikony)

Backend / Data:
- Supabase (Postgres 16+, Auth, Storage, pgvector, **Edge Functions**, **pg_cron**)
- pgcrypto dla encrypted columns
- Supabase Vault dla sekretów (API keys, tokens)

Automation (po D-011, 30.04.2026):
- **Supabase Edge Functions** (Deno runtime, TypeScript) — workflow polling, agregacje, digest
- **pg_cron** w Postgresie — scheduling (zastępuje n8n cron triggers)
- ~~n8n self-hosted~~ ❌ wycięte
- ~~Hetzner Cloud VPS~~ ❌ wycięte

AI:
- Anthropic Claude API (Sonnet 4.6/4.7 + Haiku 4.5)
- Voyage AI dla embeddings (voyage-3 model, 1024 dim)

Email:
- Resend (3000 maili/mc free)

Deployment:
- Vercel (frontend, Next.js Server Components)
- Supabase (Edge Functions + DB + Storage)
- GitHub (repo, CI/CD przez Vercel + Supabase)

Monitoring:
- Supabase Logs (built-in dla DB i Edge Functions)
- Sentry free tier (error tracking w Next.js, opcjonalne tier 2)
- ~~Healthchecks.io~~ ❌ niepotrzebne, zastąpione Supabase Logs
```

**Nie wprowadzaj nowych narzędzi bez wyraźnej dyskusji z Michałem.** Jeśli coś nie pasuje, zatrzymaj się i zapytaj.

---

## 3. Struktura repo

Repo: `solax-monitor` na GitHub (prywatne).

```
solax-monitor/
├── apps/
│   ├── web/                    # Next.js 15 aplikacja (dashboard + chatbot)
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   └── login/      # magic link login
│   │   │   ├── (dashboard)/
│   │   │   │   ├── overview/   # główny dashboard
│   │   │   │   ├── daily/      # widok dnia
│   │   │   │   ├── monthly/    # widok miesiąca
│   │   │   │   ├── yearly/     # widok rok-do-roku
│   │   │   │   ├── financial/  # ROI, oszczędności
│   │   │   │   └── chat/       # chatbot UI
│   │   │   ├── api/
│   │   │   │   ├── chat/       # endpoint dla chatbota (tool calling)
│   │   │   │   └── auth/       # callback magic link
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui komponenty
│   │   │   ├── charts/         # wrapped Recharts
│   │   │   └── chat/           # message list, input
│   │   ├── lib/
│   │   │   ├── supabase/       # client i server helpers
│   │   │   ├── claude/         # Claude API wrapper, tool definitions
│   │   │   └── tariff/         # kalkulacje finansowe
│   │   └── package.json
├── supabase/
│   ├── migrations/             # SQL migrations (versionowane)
│   ├── functions/              # ⭐ Edge Functions (Deno + TypeScript)
│   │   ├── poll-realtime/      # cron co 5 min: polling Solax
│   │   ├── poll-alarms/        # cron co 15 min: polling alarmów
│   │   ├── refresh-token/      # cron co 25 dni: refresh OAuth tokenu
│   │   ├── daily-aggregates/   # cron 1:00: kalkulacja daily + finansowa
│   │   ├── weekly-digest/      # cron Mon 7:00: weekly email
│   │   ├── monthly-digest/     # cron 1. dnia 8:00: monthly email
│   │   ├── update-rcem/        # cron 5. dnia: ściągnięcie RCEm z PSE
│   │   ├── send-alert/         # trigger z poll-alarms: alert email
│   │   └── _shared/            # shared utility (Solax client, auth, etc.)
│   ├── config.toml             # konfiguracja pg_cron + funkcji
│   └── seed.sql                # dane testowe
├── scripts/
│   ├── backfill-monthly.ts     # jednorazowy backfill 3 lat (lokalne)
│   ├── backfill-daily.ts       # backfill bieżącego roku
│   ├── build-rag-index.ts      # parse PDFs + embeddingi
│   └── smoke-test-api.sh       # testowe curle
├── docs/                       # dokumentacja projektu (gitignored content)
│   ├── context/                # 00-context, 01-strategia, ..., 07-installation
│   ├── source-documents/       # arkusz brata, faktury proforma, przelewy
│   ├── pge-invoices/           # faktury PGE PDF
│   └── solax-pdfs/             # User Manual, Datasheet (gitignored, do Supabase Storage)
├── CLAUDE.md                   # ⭐ entry point dla Claude Code
├── .env.example                # template envów
├── .env.local                  # (gitignored)
├── .gitignore
├── README.md                   # quickstart dla Michała
└── package.json                # workspaces config jeśli monorepo
```

**Jeśli monorepo wydaje się overkillem, możesz uprościć: jeden `app` Next.js w roocie, `supabase/`, `scripts/`. Decyzja Twoja, ale uzasadnij w `03-decisions.md` jako D-013.**

---

## 4. Faza 0 — setup (pół dnia)

### 4.1 Konta serwisów (Michał już to zrobi przed twoim startem)

- GitHub: prywatne repo `solax-monitor`
- Supabase: nowy projekt (region eu-central-1 Frankfurt). Włącz pgvector i pg_cron extensions w Database → Extensions.
- Vercel: import repo, wybierz Next.js, ustaw env vars (potem)
- Resend: nowy projekt, weryfikacja domeny `mpjalbrzyk.pl`
- Voyage AI: nowe konto, pierwszy API key
- Anthropic Console: Michał ma, dorzuca billing
- ~~Hetzner Cloud~~ ❌ NIE potrzebujemy (D-011)

### 4.2 Lokalna inicjacja repo

```bash
cd ~/Code  # albo gdziekolwiek Michał trzyma projekty
git clone git@github.com:mpjalbrzyk/solax-monitor.git
cd solax-monitor

# Jeśli repo jest puste, inicjujemy Next.js 15
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"

# Instalacja dodatkowych zależności
npm install @supabase/ssr @supabase/supabase-js
npm install @anthropic-ai/sdk
npm install recharts lucide-react
npm install -D @types/node

# shadcn/ui
npx shadcn@latest init
```

### 4.3 Setup Supabase (DB + Edge Functions + pg_cron)

```bash
# Supabase CLI
npm install -D supabase

# Logowanie
npx supabase login

# Link do projektu
npx supabase link --project-ref [PROJECT_REF]

# Pierwsza migracja schematu
npx supabase migration new initial_schema
```

Wklej do `supabase/migrations/[timestamp]_initial_schema.sql` SQL ze schematem z `04-api-spec.md` sekcja 12 (wszystkie tabele po kolei). Plus włącz extensions:

```sql
-- W migracji: extensions
CREATE EXTENSION IF NOT EXISTS vector;       -- dla RAG
CREATE EXTENSION IF NOT EXISTS pg_cron;      -- dla cron
CREATE EXTENSION IF NOT EXISTS pg_net;       -- dla HTTP calls z Edge Functions
```

Apply:

```bash
npx supabase db push
```

### 4.4 Setup Edge Functions (zastępuje Hetzner+n8n)

```bash
# Tworzymy szkielet każdej funkcji
npx supabase functions new poll-realtime
npx supabase functions new poll-alarms
npx supabase functions new refresh-token
npx supabase functions new daily-aggregates
npx supabase functions new weekly-digest
npx supabase functions new monthly-digest
npx supabase functions new update-rcem
npx supabase functions new send-alert

# Każda funkcja generuje folder w supabase/functions/[nazwa]/index.ts
# Implementację zrobimy w Fazie 1 po jednej funkcji na raz
```

**Sekrety** (Solax Client ID/Secret, Anthropic API key, Resend API key) ustawiamy przez Supabase CLI:

```bash
npx supabase secrets set SOLAX_CLIENT_ID="2f5adbd934aa4fb89a94bc0e08e70de1"
npx supabase secrets set SOLAX_CLIENT_SECRET="..."
npx supabase secrets set ANTHROPIC_API_KEY="..."
npx supabase secrets set RESEND_API_KEY="..."
npx supabase secrets set VOYAGE_API_KEY="..."
```

Sekrety są szyfrowane w Supabase Vault, dostępne w Edge Functions przez `Deno.env.get("SOLAX_CLIENT_ID")`. **Nie commitujemy ich nigdzie.**

**Cron schedule** ustawiamy przez `pg_cron` w SQL migration:

```sql
-- supabase/migrations/[timestamp]_setup_cron.sql

-- Helper: wywołanie Edge Function z poziomu pg_cron
-- (używa pg_net + service_role key z Vault)

-- Polling realtime co 5 minut
SELECT cron.schedule(
  'poll-realtime',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://[PROJECT_REF].supabase.co/functions/v1/poll-realtime',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
    )
  ) AS request_id;
  $$
);

-- Polling alarmów co 15 minut
SELECT cron.schedule('poll-alarms', '*/15 * * * *', $$ ... $$);

-- Daily aggregates 1:00
SELECT cron.schedule('daily-aggregates', '0 1 * * *', $$ ... $$);

-- Weekly digest poniedziałek 7:00
SELECT cron.schedule('weekly-digest', '0 7 * * 1', $$ ... $$);

-- Monthly digest 1. dnia 8:00
SELECT cron.schedule('monthly-digest', '0 8 1 * *', $$ ... $$);

-- RCEm update 5. dnia 8:00
SELECT cron.schedule('update-rcem', '0 8 5 * *', $$ ... $$);

-- Token refresh co 25 dni 3:00 UTC
SELECT cron.schedule('refresh-token', '0 3 */25 * *', $$ ... $$);
```

**Zalety vs n8n:**
- Wszystkie crony widać w jednym SQL pliku (versioned w Git)
- Logi w Supabase Dashboard → Database → Logs (filtrowanie po nazwie joba)
- Edycja crona = nowa migracja SQL (code review przez PR)
- Brak osobnego serwera, brak SSH, brak Docker do utrzymania

### 4.5 Konfiguracja env

Wypełnij `.env.local` na podstawie `.env.example`. Sekrety z password managera Michała.

---

## 5. Faza 1 — Pipeline danych (1 dzień)

Cel: dane lecą z Solax do Supabase co 5 minut, przez Edge Functions wyzwalane przez `pg_cron`.

### 5.1 Edge Function `refresh-token`

**Plik:** `supabase/functions/refresh-token/index.ts`  
**Schedule:** cron co 25 dni o 3:00 UTC (zdefiniowany w sekcji 4.4 SQL).

**Logika:**

```typescript
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 1. Wywołanie POST do Solax OAuth
  const tokenResponse = await fetch(
    "https://openapi-eu.solaxcloud.com/openapi/auth/oauth/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: Deno.env.get("SOLAX_CLIENT_ID")!,
        client_secret: Deno.env.get("SOLAX_CLIENT_SECRET")!,
        grant_type: "client_credentials"
      })
    }
  );

  const data = await tokenResponse.json();

  // 2. UWAGA: auth endpoint zwraca code: 0 dla success, NIE 10000
  if (data.code !== 0) {
    console.error("Token refresh failed:", data);
    // TODO: alert email do admina
    return new Response("Token refresh failed", { status: 500 });
  }

  // 3. UPSERT tokenu do api_credentials
  const expiresAt = new Date(Date.now() + (data.result.expires_in * 1000));
  
  await supabase
    .from("api_credentials")
    .upsert({
      provider: "solax_developer",
      access_token_encrypted: data.result.access_token, // TODO: encrypt
      token_type: data.result.token_type,
      expires_at: expiresAt.toISOString(),
      scope: data.result.scope,
      last_refreshed_at: new Date().toISOString()
    }, { onConflict: "user_id,provider" });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
});
```

### 5.2 Edge Function `poll-realtime`

**Plik:** `supabase/functions/poll-realtime/index.ts`  
**Schedule:** cron co 5 minut.

**Logika:**

1. SELECT z `api_credentials` świeży access_token i `solax_plant_id` + `solax_inverter_sn` z `user_inverters`
2. Dla każdego inwertera (multi-tenant):
   - GET `plant/realtime_data?plantId=X&businessType=1`
   - GET `device/realtime_data?snList=Y&deviceType=1&businessType=1` (inverter)
   - GET `device/realtime_data?snList=Y&deviceType=2&requestSnType=1&businessType=1` (battery)
3. Walidacja: `code === 10000`. Jeśli 10402, **wywołaj `refresh-token` przez net.http_post** i retry
4. Transformacja: normalizacja konwencji znaków (sekcja 6 `04-api-spec.md`). Helper w `_shared/normalize.ts`
5. INSERT do `plant_realtime_readings` i `device_realtime_readings`
6. Zapisuj `raw_response` jako jsonb dla debugging

**Helper Solax client w `_shared/solax-client.ts`** (DRY, używane przez wszystkie funkcje pollingowe):

```typescript
export async function solaxFetch(
  supabase: SupabaseClient,
  endpoint: string,
  params: URLSearchParams
): Promise<any> {
  const { data: creds } = await supabase
    .from("api_credentials")
    .select("access_token_encrypted")
    .eq("provider", "solax_developer")
    .single();

  const url = `https://openapi-eu.solaxcloud.com${endpoint}?${params}`;
  const response = await fetch(url, {
    headers: { "Authorization": `Bearer ${creds.access_token_encrypted}` }
  });

  const data = await response.json();
  
  // Auto-retry on 10402 (token expired)
  if (data.code === 10402) {
    await fetch(`${SUPABASE_URL}/functions/v1/refresh-token`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${SERVICE_ROLE_KEY}` }
    });
    return solaxFetch(supabase, endpoint, params); // retry
  }

  if (data.code !== 10000) {
    throw new Error(`Solax API error ${data.code}: ${data.message}`);
  }

  return data.result;
}
```

### 5.3 Edge Function `poll-alarms`

**Schedule:** cron co 15 minut.

1. GET `alarm/page_alarm_info?plantId=X&businessType=1&alarmState=1`
2. Dla każdego alarmu w `records`:
   - UPSERT do `inverter_alarms` po `(inverter_id, error_code, alarm_start_time)`
3. Jeśli nowy alarm z `alarm_level >= 2` i `notified_at IS NULL`:
   - Wywołaj `send-alert` Edge Function przez net.http_post
   - UPDATE `notified_at = NOW()`
4. Co 4 godziny query `alarmState=0` żeby zaktualizować `alarm_end_time` zamkniętych alarmów (osobny prosty workflow albo flag w tej samej funkcji co liczy `cron.schedule` modulo 16)

### 5.4 Edge Function `daily-aggregates`

**Schedule:** cron raz dziennie o 1:00 (timezone Europe/Warsaw).

1. Dla każdego inwertera:
   - Pobierz `plant_realtime_readings` z poprzedniego dnia
   - Oblicz daily yield, consumption, import, export, self_use_rate
   - Pobierz `device_realtime_readings` z `device_type=2` z poprzedniego dnia
   - Oblicz battery_charged i battery_discharged przez całkowanie `chargeDischargePower` (sekcja 9 `04-api-spec.md`)
   - Pobierz `tariffs` aktywne dla tego dnia
   - Oblicz savings_pln, cost_pln, earnings_pln (algorytm w `06-tariff.md` sekcja 6)
   - UPSERT do `daily_aggregates`

---

## 6. Faza 2 — Backfill historyczny (pół dnia)

Skrypt jednorazowy `scripts/backfill-monthly.ts`. Logika:

```typescript
// Pseudo-code
for (const year of [2023, 2024, 2025]) {
  const response = await fetch(`${BASE_URL}/openapi/v2/plant/energy/get_stat_data`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      plantId: PLANT_ID,
      dateType: 1,  // annual
      date: String(year),
      businessType: 1
    })
  });
  
  const data = await response.json();
  for (const monthData of data.result.plantEnergyStatDataList) {
    // INSERT INTO monthly_aggregates
  }
}

// Phase B: dzienny backfill 2026
for (let month = 1; month <= currentMonth; month++) {
  const dateStr = `2026-${String(month).padStart(2, '0')}`;
  // Same call ale dateType=2 i date jako miesiąc
  // INSERT INTO daily_aggregates
}
```

Uruchamiamy lokalnie raz: `tsx scripts/backfill-monthly.ts`. Logujemy do konsoli, sprawdzamy czy w Supabase są rekordy.

---

## 7. Faza 3 — Dashboard webowy (2-3 dni)

### 7.1 Auth (magic link)

`app/(auth)/login/page.tsx`:
- Form z polem email
- POST do Supabase Auth: `signInWithOtp({ email })`
- Po kliknięciu w link mailowy redirect do `/auth/callback`
- Callback handler ustawia sesję, redirect do `/overview`

### 7.2 Overview (live view)

`app/(dashboard)/overview/page.tsx`:
- Server Component, fetchuje najnowszy `plant_realtime_readings` i najnowszy `device_realtime_readings` (oba typy)
- Renderuje kafelki:
  - Bieżąca produkcja (W) z `device_realtime_readings.total_active_power_w` (po normalizacji)
  - Bieżące zużycie (W) — kalkulowane: produkcja - export + import
  - Stan baterii (% z battery_soc_pct, kWh remainings)
  - Status urządzeń (online/offline)
- Energy flow diagram (SVG/divs) podobny do tego w panelu Solax
- Refresh co 5 minut przez polling z client side albo Supabase Realtime subscription

### 7.3 Daily / Monthly / Yearly views

Wykresy z Recharts:
- Daily: line chart produkcja vs zużycie w 5-min interwałach (z `plant_realtime_readings` i `device_realtime_readings`)
- Monthly: bar chart dni miesiąca z `daily_aggregates`
- Yearly (year-over-year): grouped bar chart, każdy rok jako osobna seria, X = miesiąc, Y = pvGeneration

### 7.4 Financial

`app/(dashboard)/financial/page.tsx`:
- Sumaryczne savings od początku instalacji
- ROI estimate (na podstawie szacowanego kosztu instalacji — pole w `user_inverters` do dodania)
- Trajektoria: ile lat do break-even
- Breakdown: ile zaoszczędzone z autokonsumpcji vs ile zarobione z eksportu

---

## 8. Faza 4 — Chatbot operacyjny (1 dzień)

### 8.1 UI

`app/(dashboard)/chat/page.tsx`:
- Lista wiadomości (user vs assistant)
- Input z auto-resize textarea
- Streaming odpowiedzi (Vercel AI SDK albo własny SSE handler)

### 8.2 Backend

`app/api/chat/route.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

const tools = [
  {
    name: "get_current_status",
    description: "Get current real-time status: production, consumption, battery state",
    input_schema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_daily_production",
    description: "Get production data for a specific day",
    input_schema: {
      type: "object",
      properties: {
        date: { type: "string", description: "ISO date YYYY-MM-DD" }
      },
      required: ["date"]
    }
  },
  {
    name: "get_monthly_comparison",
    description: "Compare two months side by side",
    input_schema: {
      type: "object",
      properties: {
        month_a: { type: "string", description: "YYYY-MM" },
        month_b: { type: "string", description: "YYYY-MM" }
      },
      required: ["month_a", "month_b"]
    }
  },
  {
    name: "get_year_over_year",
    description: "Get year-over-year data for current year vs previous",
    input_schema: { type: "object", properties: {}, required: [] }
  },
  {
    name: "get_financial_summary",
    description: "Get financial summary: savings, earnings, ROI",
    input_schema: {
      type: "object",
      properties: {
        period: { type: "string", enum: ["day", "week", "month", "year", "lifetime"] }
      },
      required: ["period"]
    }
  }
  // ... etc
];

export async function POST(req: Request) {
  const { messages } = await req.json();
  const userId = await getUserIdFromSession();
  
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT_OPERATIONAL,  // patrz niżej
    tools,
    messages
  });
  
  // Tool use loop
  if (response.stop_reason === "tool_use") {
    // Execute tool, supabase query, append to messages, recurse
  }
  
  return Response.json(response);
}
```

System prompt operacyjny:

```
Jesteś asystentem właściciela instalacji fotowoltaicznej.
Instalacja: Solax X3-Hybrid-G4 10 kW, 8 kWp PV, bateria, lokalizacja Ząbki Polska.
Właściciel: Michał i jego rodzina (tata, brat).

Twoje zadania:
- Odpowiadaj na pytania o produkcję, zużycie, stan baterii, finansowe
- Używaj narzędzi do pobierania DANYCH RZECZYWISTYCH z bazy, nigdy nie zgaduj liczb
- Odpowiadaj zwięźle i konkretnie, w naturalnej polszczyźnie
- Jeśli user pyta o zalecenie ("czy włączyć pralkę"), bazuj na bieżących danych
- Jeśli user pyta o porównania, używaj get_monthly_comparison albo get_year_over_year

Zasady twardych liczb:
- Energia w kWh, moc w kW lub W zależnie od skali (>1000W = przełącz na kW)
- Pieniądze w PLN
- Procenty: autokonsumpcja, SOC baterii
```

### 8.3 Tool implementations

Każdy tool to funkcja w `lib/claude/tools/*.ts`:

```typescript
// lib/claude/tools/get-current-status.ts
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function getCurrentStatus(userId: string) {
  const supabase = createServerSupabaseClient();
  
  const { data: latestPlant } = await supabase
    .from("plant_realtime_readings")
    .select("*")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();
  
  const { data: latestInverter } = await supabase
    .from("device_realtime_readings")
    .select("*")
    .eq("user_id", userId)
    .eq("device_type", 1)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();
  
  const { data: latestBattery } = await supabase
    .from("device_realtime_readings")
    .select("*")
    .eq("user_id", userId)
    .eq("device_type", 2)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .single();
  
  return {
    timestamp: latestPlant.plant_local_time,
    production_w: latestInverter.total_active_power_w,
    grid_power_w: latestInverter.grid_power_w,
    battery_soc_pct: latestBattery.battery_soc_pct,
    battery_power_w: latestBattery.charge_discharge_power_w,
    daily_yield_kwh: latestPlant.daily_yield_kwh
  };
}
```

---

## 9. Faza 5 — Chatbot techniczny z RAG (1 dzień)

### 9.1 Pipeline embeddings

Skrypt jednorazowy `scripts/build-rag-index.ts`:
1. Parse PDF-y z `docs/pdfs/` (pdf-parse albo unstructured)
2. Chunk (np. ~800 tokens z 100-token overlap)
3. Embed każdy chunk przez Voyage AI (`voyage-3` model, 1024 dim)
4. INSERT do `documentation_chunks`

### 9.2 Tool `search_documentation`

```typescript
export async function searchDocumentation(query: string) {
  const supabase = createServerSupabaseClient();
  
  // Embed query
  const queryEmbedding = await voyageClient.embed([query], "voyage-3");
  
  // Vector search in pgvector
  const { data } = await supabase.rpc("match_documentation", {
    query_embedding: queryEmbedding,
    match_threshold: 0.7,
    match_count: 5
  });
  
  return data;  // top 5 chunks z metadanymi
}
```

### 9.3 System prompt techniczny

```
Jesteś technikiem fotowoltaiki specjalizującym się w falownikach Solax.
Instalacja klienta: Solax X3-Hybrid-G4 10 kW, dongle WIFI3.0 SXTGG4YRYR, bateria podłączona przez BMS.
Bateria nie jest zarejestrowana w API Solaxa jako osobne urządzenie (znany problem).

Gdy user pyta o problem techniczny:
1. Użyj get_current_status żeby zobaczyć aktualny stan instalacji
2. Użyj search_documentation żeby znaleźć właściwy fragment dokumentacji
3. Jeśli pyta o error code, użyj get_recent_alarms żeby sprawdzić czy ten kod faktycznie wystąpił
4. Daj konkretną odpowiedź z krokami diagnostycznymi
5. Cytuj źródło (np. "według User Manual sekcja 5.3")

Nie zgaduj. Jeśli nie znajdziesz w dokumentacji, powiedz że nie znajdujesz i zaproponuj kontakt z serwisem.
```

---

## 10. Faza 6 — Email digest i alerty (pół dnia)

**Edge Function `weekly-digest`:**
- Schedule: cron poniedziałek 07:00 timezone Europe/Warsaw (`0 7 * * 1` w pg_cron z `SET TIME ZONE 'Europe/Warsaw'`)
- Dla każdego usera (multi-tenant):
  - Query `daily_aggregates` z 7 ostatnich dni
  - Oblicz: total_yield, total_savings, best_day, vs_average
  - Render HTML template (Deno-compatible: `https://deno.land/x/eta` albo prosty template literal)
  - Send via Resend API (`fetch` POST do `https://api.resend.com/emails`)
- Dwa formaty (decyzja O-002 do podjęcia przed Fazą 6):
  - Active (Michał, brat): wykresy, liczby, breakdown
  - Passive (tata): 3-4 zdania, 1 kluczowa liczba

**Edge Function `monthly-digest`:**
- Schedule: cron 1. dnia miesiąca 08:00 (`0 8 1 * *`)
- Logika analogiczna do weekly, ale dane z `monthly_aggregates` plus YoY comparison

**Edge Function `send-alert`:**
- Wywoływana z `poll-alarms` przez net.http_post (nie cron)
- Template: "Wykryto problem w Twojej instalacji: {alarm_name} (kod {error_code}). Sprawdź szczegóły: {dashboard_url}"
- Send via Resend do `user_emails` (z tabeli `users` plus shared viewers)

---

## 11. Faza 7 — Multi-tenant polish (1 dzień)

- Onboarding flow dla nowego usera (po Magic Link signup):
  - Form: Solax Client ID, Client Secret, inverter SN, dongle SN
  - Walidacja: wywołanie Edge Function `validate-solax-credentials`, zwróć błąd jeśli nie działa
  - Save do `user_inverters` i `api_credentials`
  - Trigger backfill przez Edge Function `backfill-onboarding` (asynchroniczne, mail po zakończeniu)
- Family sharing: invite by email do tej samej `user_inverters` instalacji jako "viewer" role
- UI: dropdown "switch installation" jeśli user ma wiele

---

## 12. Faza 8 — Content case study (równolegle, 2 dni)

Patrz `02-case-study.md` sekcja "Plan content i dystrybucja". Michał pisze sam, ale jako agent możesz pomóc z draft artykułu blogowego, gdy szkielet projektu jest gotowy.

---

## 13. Najważniejsze rzeczy żeby NIE zepsuć

1. **RLS w Supabase od dnia pierwszego.** Każda tabela z `user_id` ma RLS policy. Test: zaloguj się jako user A, spróbuj queryować dane usera B. Powinno zwrócić pusto.

2. **Konwencje znaków w power fields.** Patrz sekcja 6 `04-api-spec.md`. Normalizuj zawsze w Edge Function `poll-realtime` przed INSERT, nigdy w aplikacji webowej.

3. **`pvMap` może być pusty `{}`.** Defensive parsing.

4. **Bateria ma puste `deviceSn`.** Zawsze identyfikuj przez `(inverter_id, device_type=2)`.

5. **Token TTL 30 dni.** Jeśli refresh job padnie, cały pipeline pada za 30 dni. Healthchecks.io z alertem absolutnie krytyczny.

6. **Nie commituj `.env.local`.** Sprawdź `.gitignore`.

7. **Multi-tenant przez RLS, nie przez sprawdzanie `user_id` w kodzie.** Postgres robi to za nas, jeśli RLS jest skonfigurowane poprawnie.

8. **Raw responses jako jsonb.** Trzymaj zawsze. Jak Solax zmieni schema albo dorzuci pole, mamy z czego odbudować.

9. **Backfill robi się raz przy onboardingu, nie cyklicznie.** Cykliczny polling co 5 min wystarcza dla nowych danych.

10. **Chatbot nie zgaduje liczb.** Tool calling > 100% odpowiedzi z konkretnymi liczbami przechodzi przez tools, nigdy z głowy modelu.

---

## 14. Czego jeszcze brakuje (czeka na Michała)

- [x] Decyzja O-001: ~~chatbot publiczny czy zalogowany~~ — **PRYWATNY** (D-010)
- [ ] Decyzja O-002: format maila weekly dla taty (odłożona do Fazy 6, rekomendacja: dwa formaty)
- [x] Konta serwisów: GitHub, Supabase, Vercel, Resend, Voyage AI, Anthropic — **gotowe** (Michał zakłada przed startem)
- [x] ~~VPS Hetzner postawiony, n8n self-hosted~~ — **WYCIĘTE** (D-011, używamy Edge Functions)
- [x] Domena `solar.mpjalbrzyk.pl` skonfigurowana w DNS (A record do Vercel, **bez CNAME do n8n** po D-011)
- [x] Plik `06-tariff.md` z danymi taryfy energetycznej **VERIFIED** z faktury PGE marzec 2026
- [ ] PDF-y dokumentacji X3-Hybrid-G4 wrzucone do `docs/solax-pdfs/` (User Manual EN + Datasheet EN + Installation Manual EN — pobranie ze strony solaxpower.com, ~36MB total)
- [ ] Battery model i pojemność (sprawdzić na fizycznej naklejce baterii albo plan B przez panel falownika)
- [ ] Email taty i brata dla Magic Link (do podania w Fazie 7 multi-tenant)

---

## 15. Status: gotowe do startu Fazy 0

Po wszystkich aktualizacjach (D-010, D-011, D-012, taryfa VERIFIED, dokumentacja kompletna) projekt jest gotowy do uruchomienia Claude Code w terminalu.

**Pierwsza komenda dla Claude Code:**

> "Przeczytaj CLAUDE.md i wszystkie pliki w docs/context/. Po przeczytaniu powiedz że jesteś gotowy do Fazy 0 (setup)."

**Czego brakuje ale NIE blokuje startu:**
- Battery model/capacity (TBD, można wpisać null w `user_inverters` i uzupełnić później)
- PDF-y Solax (potrzebne dopiero w Fazie 5 chatbota technicznego)
- Decyzja O-002 (format maila, potrzebny w Fazie 6)

---

*Ostatnia aktualizacja: 30 kwietnia 2026 (D-011 wdrożone), status: gotowe do startu Fazy 0. Stack: Supabase Edge Functions + Next.js + Vercel.*
