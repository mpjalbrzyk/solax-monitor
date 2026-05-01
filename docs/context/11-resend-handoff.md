# Solax Monitor — Faza 6 Resend handoff

**Cel pliku:** instrukcja wdrożenia mailowych digestów (weekly + monthly) na produkcji. Kod gotowy w repo, brakuje tylko: konto Resend → API key → secrets w Supabase → deploy funkcji → uruchomienie pg_cron.

---

## 1. Co już jest w repo (zrobione automatycznie)

- ✅ `supabase/functions/_shared/period-narrator.ts` — Deno port narratora (sync z `lib/derive/period-narrator.ts`)
- ✅ `supabase/functions/_shared/email-template.ts` — HTML template email-safe (inline CSS, table-based)
- ✅ `supabase/functions/_shared/resend-client.ts` — minimalny wrapper Resend API
- ✅ `supabase/functions/_shared/digest-data.ts` — fetchery + helpery dat (Warsaw TZ)
- ✅ `supabase/functions/weekly-digest/index.ts` — pełna implementacja
- ✅ `supabase/functions/monthly-digest/index.ts` — pełna implementacja
- ✅ `supabase/migrations/20260501230000_enable_phase6_digest_crons.sql` — pg_cron schedules
- ✅ `.env.example` zaktualizowany o RESEND vars

---

## 2. Co Ty robisz (kroki w terminalu / GUI)

### Krok 1 — Konto Resend + API key (~5 min)

1. Wejdź [resend.com](https://resend.com), zarejestruj się mailem.
2. Free tier daje **3000 mails/mc** + **100/dzień** — masz ogromną rezerwę dla tygodniowych/miesięcznych.
3. Po zalogowaniu: **API Keys → Create API Key** → name "solax-monitor" → permission "Sending access only" → save.
4. Skopiuj klucz `re_xxxxxxx`. Pokazuje się **tylko raz**, więc zapisz w password managerze od razu.

**Domena:** możesz pominąć weryfikację domeny dla MVP. Wtedy `from = "Solax Monitor <onboarding@resend.dev>"` — działa od razu, ale w skrzynce odbiorcy sender wyświetla się jako resend.dev.

Jeśli chcesz custom domain (`solar@mpjalbrzyk.pl`):
1. Resend → Domains → Add Domain → wpisz `mpjalbrzyk.pl`
2. Skopiuj 3 rekordy DNS (SPF, DKIM, return-path) i wstaw u rejestratora
3. Poczekaj 15-60 min na propagację, kliknij Verify
4. Zmień `RESEND_FROM_EMAIL` na `Solax Monitor <solar@mpjalbrzyk.pl>`

### Krok 2 — Secrets w Supabase (~2 min)

Edge Functions czytają sekrety z **Supabase secrets**, NIE z Vercela. Ustawiasz przez CLI lub Dashboard.

**CLI (zalecane):**

```bash
# Zaloguj się i wybierz projekt jeśli nie masz aktywnego
supabase login
supabase link --project-ref duecptzvkbauctdxsxsw

# Set secrets dla Edge Functions
supabase secrets set RESEND_API_KEY=re_xxxxxxx
supabase secrets set RESEND_FROM_EMAIL="Solax Monitor <onboarding@resend.dev>"
supabase secrets set PUBLIC_APP_URL=https://solax-monitor.vercel.app

# Opcjonalnie — override odbiorcy (do testów). Bez tego digest leci do email
# z auth.users powiązanego z user_inverters.user_id.
supabase secrets set DIGEST_RECIPIENT_EMAIL=mpjalbrzyk@gmail.com

# Sprawdź
supabase secrets list
```

**Dashboard (alternatywnie):** Project Settings → Edge Functions → Secrets → Add → wpisz każdy z osobna.

### Krok 3 — Deploy Edge Functions (~1 min)

```bash
# Deploy obie funkcje (z folderu repo)
supabase functions deploy weekly-digest
supabase functions deploy monthly-digest
```

Sprawdź w Dashboard → Edge Functions czy obie są `ACTIVE`.

### Krok 4 — Test manual (~2 min)

Zanim odpalisz cron, sprawdź że funkcje działają.

```bash
# Pobierz service-role key z .env.local (sb_secret_xxx)
curl -X POST \
  -H "Authorization: Bearer $(grep SUPABASE_SERVICE_ROLE_KEY .env.local | cut -d= -f2)" \
  -H "Content-Type: application/json" \
  -d '{}' \
  https://duecptzvkbauctdxsxsw.supabase.co/functions/v1/weekly-digest
```

Oczekiwana odpowiedź:
```json
{
  "ok": true,
  "period": { "from": "2026-04-21", "to": "2026-04-27" },
  "recipients": 1,
  "sent": 1,
  "results": [{ "email": "mpjalbrzyk@gmail.com", "ok": true, "id": "..." }]
}
```

Sprawdź skrzynkę. Jeśli mail nie przyszedł:
- `ok: false` w results → patrz `error` field (najczęściej `RESEND_API_KEY` zły lub from-domain niezweryfikowany)
- `recipients: 0` → brak active inverters lub user nie ma maila w `auth.users`
- HTTP 500 → patrz logi `supabase functions logs weekly-digest`

To samo dla monthly:
```bash
curl -X POST \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
  -d '{}' \
  https://duecptzvkbauctdxsxsw.supabase.co/functions/v1/monthly-digest
```

Bilansuje **poprzedni** miesiąc (kwiecień 2026 jeśli odpalasz 1 maja).

### Krok 5 — Aktywuj pg_cron (~30s)

Po sukcesie testów manualnych — odpal migrację która scheduluje oba zadania.

```bash
supabase db push
```

To uruchomi `20260501230000_enable_phase6_digest_crons.sql` która:
- planuje `weekly-digest` na **poniedziałki 06:00 UTC** (≈ 07:00 CET / 08:00 CEST)
- planuje `monthly-digest` na **1. dzień miesiąca 06:00 UTC**

Zweryfikuj w Supabase Dashboard → Database → Cron Jobs:
```
weekly-digest      0 6 * * 1      next: 2026-05-04 06:00 UTC
monthly-digest     0 6 1 * *      next: 2026-06-01 06:00 UTC
```

### Krok 6 — Logi i monitoring

- **Logi pojedynczych wywołań Edge Function:** Dashboard → Edge Functions → `weekly-digest` → Logs
- **Logi cron:** Dashboard → Database → Cron Jobs → wybierz job → History (pokazuje status każdego firingu)
- **Resend dashboard:** [resend.com/emails](https://resend.com/emails) — pokazuje status każdego wysłanego maila (delivered/bounced/spam)

---

## 3. Modyfikacje narratora — gdy zmieniasz copy

Logika narratora żyje w **dwóch miejscach** (świadoma duplikacja):
- `lib/derive/period-narrator.ts` — używane przez dashboard
- `supabase/functions/_shared/period-narrator.ts` — używane przez digesty

Powód: Edge Functions to Deno, app/ to Node. Bundlowanie cross-runtime byłoby overhead. Przy każdej zmianie logiki narratora **edytuj oba pliki ręcznie**.

Test: po zmianie odpal `supabase functions deploy weekly-digest monthly-digest` żeby Deno zaktualizowała import.

---

## 4. Co się stanie jeśli któryś krok pójdzie źle

| Symptom | Przyczyna | Fix |
|---------|-----------|-----|
| `ok: false, error: "RESEND_API_KEY not set"` | Sekret nie wstawiony | `supabase secrets set RESEND_API_KEY=re_...` |
| `ok: false, error: "401 Unauthorized"` (Resend) | Klucz nieprawidłowy | Wygeneruj nowy w Resend dashboard |
| `ok: false, error: "from address must be from a verified domain"` | Custom from bez weryfikacji domeny | Użyj `onboarding@resend.dev` albo zweryfikuj domenę |
| Mail trafia do spamu | Domyślne `onboarding@resend.dev` | Zweryfikuj własną domenę (Krok 1) |
| `recipients: 0` | Brak inverters lub user bez emaila | `SELECT * FROM user_inverters WHERE is_active = true` + `SELECT id, email FROM auth.users` |
| pg_cron job pokazuje `failed` w History | Vault secret `service_role_jwt` brakuje | Patrz `20260430024317_enable_phase1_crons.sql` header |

---

## 5. Możliwe rozszerzenia (poza scope Fazy 6)

- **Format passive (tata):** O-002 mówi że tata dostaje 3-4 zdania prozy + 1 number. Obecnie format jest jednolity dla wszystkich. Rozszerzenie: dodać kolumnę `digest_format` w `user_inverters` (`active`/`passive`) i wybierać template w runtime.
- **Threshold alerts (alarm engine):** osobna Edge Function `alarm-engine` które wykrywa anomalie (produkcja <50% średniej, długi pobór z sieci, niestabilna bateria) i wysyła natychmiast. Plan: 30 min logiki + ten sam template.
- **CSV załącznik:** Resend wspiera attachments. Można dodać `attachment` z CSV `daily_aggregates` z tygodnia/miesiąca dla power users.
- **Dwujęzyczność EN:** template gotowy na `lang` parameter, wystarczy duplikat `period-narrator.en.ts`.

---

*Plik utworzony 1 maja 2026 noc. Po wdrożeniu i pierwszych mailach zaktualizować `08-phase-status.md` w sekcji Fazy 6.*
