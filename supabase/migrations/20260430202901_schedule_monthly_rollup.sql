-- Phase 3 enhancement: schedule roll-monthly-aggregates Edge Function.
--
-- Runs 1st of every month at 02:00 UTC (= 03:00 winter / 04:00 summer Warsaw).
-- Daily-aggregates Edge Function runs at 01:00 UTC daily — by 02:00 the
-- previous day's record exists, so on the 1st we already have the full
-- previous month sealed in daily_aggregates.
--
-- Reuses the schedule_edge_function() helper from
-- 20260430024317_enable_phase1_crons.sql

SELECT schedule_edge_function(
  'roll-monthly-aggregates',
  '0 2 1 * *',
  '/functions/v1/roll-monthly-aggregates'
);
