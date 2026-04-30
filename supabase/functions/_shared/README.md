# `_shared/` — Edge Functions shared utilities

Folder for code reused across multiple Edge Functions. Supabase ignores
folders prefixed with `_` when deploying functions (they are not deployed
as standalone functions).

Planned modules (lands in Faza 1+):

- `solax-client.ts` — typed wrapper around Solax Developer Portal API,
  handles token retrieval from `api_credentials`, auto-retry on `code: 10402`
  (token expired) by triggering `refresh-token`. See `04-api-spec.md` sec 11.
- `normalize.ts` — sign-convention normalization for Solax power fields
  (`*_power_w` ujemna = pobór, dodatnia = oddawanie). See `04-api-spec.md` sec 6.
- `supabase-admin.ts` — service-role Supabase client factory for Edge Functions.
- `tariff.ts` — daily savings/cost/earnings calculation helpers (used by
  `daily-aggregates`). See `06-tariff.md` sec 6.
- `resend.ts` — Resend email client wrapper (used by `weekly-digest`,
  `monthly-digest`, `send-alert`). Faza 6.
