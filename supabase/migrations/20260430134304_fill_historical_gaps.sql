-- Phase 3 follow-up: fill missing 2024 row + 2025 cost in
-- historical_yearly_consumption so PGE-actual savings calc has continuous
-- post-PV data.
--
-- 2024: no PGE invoice on hand yet; interpolated from 2023 (4073 kWh post-PV)
-- and 2025 (4282 kWh) — round number that conservatively undershoots.
-- 2025 cost: estimated from 4282 kWh × G11 brutto 1.0991 PLN/kWh ≈ 4707 PLN.
-- Both rows tagged in `notes` so we know to overwrite when real invoices arrive.

INSERT INTO historical_yearly_consumption
  (user_id, inverter_id, year, consumption_from_grid_kwh, total_cost_brutto_pln, notes)
SELECT
  ui.user_id,
  ui.id,
  2024::INT,
  4178.00::NUMERIC,                  -- interpolated mean(2023, 2025)
  NULL::NUMERIC,                      -- no PGE invoice yet
  'PLACEHOLDER — interpolated from 2023+2025; replace with real PGE invoice'
FROM user_inverters ui
WHERE ui.solax_plant_id = '1613529907775754244'
ON CONFLICT (inverter_id, year) DO NOTHING;

-- Backfill 2025 cost (was NULL).
UPDATE historical_yearly_consumption hyc
   SET total_cost_brutto_pln = 4707.00,
       notes = COALESCE(hyc.notes, '') ||
               ' · cost estimated 4282 kWh × 1.0991 PLN/kWh G11 brutto'
  FROM user_inverters ui
 WHERE hyc.inverter_id = ui.id
   AND ui.solax_plant_id = '1613529907775754244'
   AND hyc.year = 2025
   AND hyc.total_cost_brutto_pln IS NULL;
