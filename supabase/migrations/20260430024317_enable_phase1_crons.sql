-- Solax Monitor — enable Faza 1 cron schedules
-- Activates the four data-pipeline jobs: refresh-token, poll-realtime,
-- poll-alarms, daily-aggregates. Each job posts to its Edge Function over
-- HTTPS with the service_role secret pulled from Vault.
--
-- The reference template lives in supabase/scheduled-jobs.sql; this migration
-- is the activation step for Faza 1 only. Faza 6 jobs (weekly-digest,
-- monthly-digest, update-rcem) stay disabled.
--
-- Idempotency: helper schedule_edge_function() unschedules the named job
-- first, so re-running this migration replaces the entry instead of duplicating.

-- ----------------------------------------------------------------------------
-- Vault: store the service-role secret used by pg_cron net.http_post
-- ----------------------------------------------------------------------------
-- The Edge Functions have verify_jwt = false (see config.toml), so any
-- non-empty Bearer header is accepted. We still pass the project's sb_secret_*
-- key as a defense-in-depth measure: if we ever flip verify_jwt back on,
-- we will replace this Vault entry with a real JWT and the cron flows keep
-- working untouched.
--
-- IMPORTANT: this migration does NOT embed the secret literal (GitHub Push
-- Protection blocks Supabase secret keys in commits). Before applying for
-- the first time on a fresh project, populate the Vault entry manually via
-- Supabase Dashboard → Project Settings → Vault → New secret:
--
--   name:    service_role_jwt
--   secret:  <project's sb_secret_* from Project Settings → API Keys>
--
-- Or via SQL:
--
--   SELECT vault.create_secret('<sb_secret_value>', 'service_role_jwt',
--          'Service role secret for pg_cron');
--
-- The block below verifies the entry exists and raises a clear error if not.

DO $$
DECLARE
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = 'service_role_jwt' LIMIT 1;
  IF existing_id IS NULL THEN
    RAISE EXCEPTION 'Vault secret "service_role_jwt" not found. Create it manually before applying this migration. See file header for instructions.';
  END IF;
END
$$;

-- ----------------------------------------------------------------------------
-- Helper: schedule_edge_function(job_name, schedule, function_path)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.schedule_edge_function(
  job_name TEXT,
  cron_schedule TEXT,
  function_path TEXT
) RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  jobid BIGINT;
BEGIN
  -- Remove any pre-existing job with this name so re-running the migration
  -- replaces the schedule rather than failing.
  PERFORM cron.unschedule(job_name) FROM cron.job WHERE jobname = job_name;

  jobid := cron.schedule(
    job_name,
    cron_schedule,
    format(
      $sql$
      SELECT net.http_post(
        url := 'https://duecptzvkbauctdxsxsw.supabase.co/functions/v1/%s',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_jwt' LIMIT 1)
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $sql$,
      function_path
    )
  );

  RETURN jobid;
END;
$$;

-- ----------------------------------------------------------------------------
-- Faza 1 schedules
-- ----------------------------------------------------------------------------

-- refresh-token — every 25 days at 03:00 UTC (5-day margin before 30-day TTL)
SELECT public.schedule_edge_function('refresh-token',     '0 3 */25 * *', 'refresh-token');

-- poll-realtime — every 5 minutes
SELECT public.schedule_edge_function('poll-realtime',     '*/5 * * * *',  'poll-realtime');

-- poll-alarms — every 15 minutes
SELECT public.schedule_edge_function('poll-alarms',       '*/15 * * * *', 'poll-alarms');

-- daily-aggregates — daily at 01:00 UTC (~02:00/03:00 Warsaw depending on DST;
-- aggregates are computed for the previous local day, so a fixed UTC hour is fine).
SELECT public.schedule_edge_function('daily-aggregates',  '0 1 * * *',    'daily-aggregates');
