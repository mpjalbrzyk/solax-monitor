-- Solax Monitor — pg_cron scheduled jobs (REFERENCE / TEMPLATE)
--
-- This file is NOT applied automatically. It documents the cron schedule for
-- each Edge Function in Faza 0. To enable a schedule:
--   1. Implement the corresponding Edge Function handler (Faza 1+).
--   2. Copy the relevant `cron.schedule(...)` call into a new migration file:
--        npx supabase migration new enable_<job_name>_cron
--   3. Apply with `npx supabase db push`.
--
-- All schedules disabled in Faza 0 — empty handlers must not flood logs.
--
-- Required infrastructure (already created in initial_schema migration):
--   - extension pg_cron
--   - extension pg_net
--
-- Authentication for net.http_post:
--   - cron jobs invoke Edge Functions over HTTPS with Authorization: Bearer <service_role_key>
--   - service_role_key is read from Supabase Vault (set via `supabase secrets set`)
--   - Vault accessor pattern: SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key'

-- ============================================================================
-- Helper: schedule_edge_function(name, schedule, function_path)
-- DRY wrapper to call an Edge Function on a cron schedule.
-- TO ENABLE in Faza 1: uncomment and run as a new migration.
-- ============================================================================

-- CREATE OR REPLACE FUNCTION schedule_edge_function(
--   job_name TEXT,
--   schedule TEXT,
--   function_path TEXT
-- ) RETURNS BIGINT AS $$
--   SELECT cron.schedule(
--     job_name,
--     schedule,
--     format(
--       $f$
--       SELECT net.http_post(
--         url := 'https://duecptzvkbauctdxsxsw.supabase.co/functions/v1/%s',
--         headers := jsonb_build_object(
--           'Content-Type', 'application/json',
--           'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
--         )
--       ) AS request_id;
--       $f$,
--       function_path
--     )
--   );
-- $$ LANGUAGE SQL;

-- ============================================================================
-- FAZA 1 SCHEDULES (Solax data pipeline) — enable when handlers implemented
-- ============================================================================

-- SELECT schedule_edge_function('refresh-token',     '0 3 */25 * *',  'refresh-token');
-- SELECT schedule_edge_function('poll-realtime',     '*/5 * * * *',   'poll-realtime');
-- SELECT schedule_edge_function('poll-alarms',       '*/15 * * * *',  'poll-alarms');
-- SELECT schedule_edge_function('daily-aggregates',  '0 1 * * *',     'daily-aggregates');

-- ============================================================================
-- FAZA 6 SCHEDULES (Email digest + RCEm) — enable when handlers implemented
-- ============================================================================

-- SELECT schedule_edge_function('weekly-digest',     '0 7 * * 1',     'weekly-digest');
-- SELECT schedule_edge_function('monthly-digest',    '0 8 1 * *',     'monthly-digest');
-- SELECT schedule_edge_function('update-rcem',       '0 8 5 * *',     'update-rcem');

-- ============================================================================
-- TRIGGERED (no cron) — invoked by other functions
-- ============================================================================
-- send-alert: invoked by poll-alarms via net.http_post when alarm_level >= 2

-- ============================================================================
-- Useful operational queries
-- ============================================================================

-- List all active jobs
-- SELECT jobid, schedule, jobname, command FROM cron.job ORDER BY jobid;

-- View recent runs of a job
-- SELECT * FROM cron.job_run_details WHERE jobname = 'poll-realtime' ORDER BY start_time DESC LIMIT 10;

-- Disable a job temporarily (does not delete it)
-- UPDATE cron.job SET active = false WHERE jobname = 'poll-realtime';

-- Permanently remove a job
-- SELECT cron.unschedule('poll-realtime');
