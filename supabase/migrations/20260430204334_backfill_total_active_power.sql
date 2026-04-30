-- Phase 3: backfill total_active_power_w for historical readings where
-- Solax bug returned 0 despite real production.
--
-- Symptom: device_realtime_readings rows with device_type=1,
-- total_active_power_w=0 OR NULL, but raw_response has acPower1/2/3 > 0
-- summing to the actual production. This silently zeroed out the
-- /daily and /overview production charts whenever the bug fired.
--
-- Strategy mirrors the new deriveTotalActivePower() in poll-realtime:
--   1. Trust the stored value if > 0 (already correct)
--   2. Fallback: sum of acPower1+2+3 from raw_response
--   3. Last resort: MPPT power sum
--
-- Only touches device_type=1 (inverter) rows.

UPDATE device_realtime_readings d
   SET total_active_power_w = computed.new_value
  FROM (
    SELECT
      id,
      COALESCE(
        NULLIF(NULLIF((raw_response->>'totalActivePower')::numeric, 0), -1),
        NULLIF(
          COALESCE((raw_response->>'acPower1')::numeric, 0) +
          COALESCE((raw_response->>'acPower2')::numeric, 0) +
          COALESCE((raw_response->>'acPower3')::numeric, 0),
          0
        ),
        0
      ) AS new_value
    FROM device_realtime_readings
    WHERE device_type = 1
      AND raw_response IS NOT NULL
      AND (total_active_power_w IS NULL OR total_active_power_w = 0)
      AND (
        COALESCE((raw_response->>'acPower1')::numeric, 0) +
        COALESCE((raw_response->>'acPower2')::numeric, 0) +
        COALESCE((raw_response->>'acPower3')::numeric, 0)
      ) > 0
  ) AS computed
 WHERE d.id = computed.id;
