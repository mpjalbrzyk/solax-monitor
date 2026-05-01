-- Solax Monitor — Faza 6 cron schedules: weekly-digest + monthly-digest
-- Aktywuje dwa zadania mailowe. Każde wymaga:
--   1) Vault secret 'service_role_jwt' (z Fazy 1)
--   2) RESEND_API_KEY w secrets Edge Functions (`supabase secrets set RESEND_API_KEY=...`)
--   3) Deployed weekly-digest + monthly-digest functions
--
-- Idempotency: helper schedule_edge_function() unschedules po nazwie, więc
-- re-run bezpieczny.
--
-- Schedule:
--   weekly-digest  — Mon 07:00 Europe/Warsaw → 06:00 UTC w lecie / 06:00 UTC w zimie
--                    (cron działa w UTC; akceptujemy ±1h DST drift, raz w tygodniu)
--   monthly-digest — 1. dzień miesiąca 08:00 Warsaw → 06:00 UTC

DO $$
DECLARE
  vault_id uuid;
BEGIN
  SELECT id INTO vault_id FROM vault.secrets WHERE name = 'service_role_jwt' LIMIT 1;
  IF vault_id IS NULL THEN
    RAISE EXCEPTION
      'Vault secret "service_role_jwt" not found. Patrz migracja '
      '20260430024317_enable_phase1_crons.sql header.';
  END IF;
END
$$;

-- weekly-digest — Mon 06:00 UTC (= 07:00 CET zimą / 08:00 CEST latem;
-- 1h DST drift akceptowalne raz/tydzień)
SELECT public.schedule_edge_function(
  'weekly-digest',
  '0 6 * * 1',
  'weekly-digest'
);

-- monthly-digest — 1st of month 06:00 UTC (= 07:00 CET zimą / 08:00 CEST latem)
SELECT public.schedule_edge_function(
  'monthly-digest',
  '0 6 1 * *',
  'monthly-digest'
);
