-- Phase 3 enhancement: align existing tables with authoritative PGE/Sunwise data.
--
-- Three tables touched:
-- 1. user_inverters    — pv_capacity 8.00 → 7.70, install date 2023-02-23 → 2023-02-17
-- 2. historical_yearly_consumption  — replace placeholder/estimated rows with PGE-derived totals
-- 3. tariffs.rcem_history  — rebuild from new historical_pge_invoices to support
--    multi-model billing (rcem / rce / rce_x_1.23) with multiplier

-- ============================================================================
-- 1. user_inverters: Sunwise contract + warranty card corrections
-- ============================================================================

UPDATE user_inverters
   SET pv_capacity_kwp = 7.70,
       installation_date = '2023-02-17',
       battery_model = NULL,
       battery_capacity_kwh = NULL
 WHERE solax_plant_id = '1613529907775754244';

-- 7.70 kWp = 20× JOLYWOOD JW-HD120N 385W (validated against Umowa SunWise
-- 47.W/M/2022 z 24.11.2022 sec Załącznik 2 + Karta gwarancyjna z 12.01.2023).
-- Solax API rounds to 8.00 — that's the inverter nameplate.
--
-- 2023-02-17 = day the bidirectional meter was swapped (Zlecenie OT 1312/U/2023,
-- monter Monika Bietak), real start of net-billing. We previously had
-- 2023-02-23 which is the day the device first appeared in Solax API — 5 days
-- of delay. Financial analysis should anchor on net-billing start.
--
-- Battery confirmed absent (O-003 closed scenario A) — no battery in either
-- contract spec or warranty card. Falownik gotowy pod baterię, "łącze bater."
-- gwarantowane przez SunWise jako część montażu, ale fizycznej baterii brak.

-- ============================================================================
-- 2. historical_yearly_consumption: replace with PGE-authoritative totals
-- Source: docs/context/08-historical-monthly-data.md sec 5
-- ============================================================================

DO $$
DECLARE
  v_user_id UUID;
  v_inverter_id UUID;
BEGIN
  SELECT user_id, id INTO v_user_id, v_inverter_id
  FROM user_inverters
  WHERE solax_plant_id = '1613529907775754244'
  LIMIT 1;

  -- 2023: my partial year (11 months Feb-Dec post-PV)
  -- Per-month sum from PGE invoices = 3 386 kWh (sec 5 of 08-historical-monthly-data)
  -- Cost: hard to pin down a single number for partial year — use NULL to avoid
  -- misleading PGE-actual calc; row mainly serves as "pre/post PV boundary marker".
  -- Remove the old "arkusz brata" 4073 row (which was full-year estimate).
  UPDATE historical_yearly_consumption
     SET consumption_from_grid_kwh = 3386,
         total_cost_brutto_pln = 2010.51,
         notes = 'Z 7 zwalidowanych faktur PGE 02-12.2023; cost = 611,19 + 1399,32 (przybliżenie pierwszej zapłaty 2024 za 2023)'
   WHERE inverter_id = v_inverter_id AND year = 2023;

  -- 2024: replace placeholder
  UPDATE historical_yearly_consumption
     SET consumption_from_grid_kwh = 4016,
         total_cost_brutto_pln = 2553.34,
         notes = 'PGE per-month sum (sec 5). Oficjalna PGE roczna podaje 4459 kWh — różnica 443 kWh wynika z dat odczytów; per-month autorytatywne dla rozliczeń. Cost = 1705,34 + 47,84 + 877,54 - czyli faktury #3, #4, #5/2 w 2024'
   WHERE inverter_id = v_inverter_id AND year = 2024;

  -- 2025: replace estimate with hard PGE numbers
  UPDATE historical_yearly_consumption
     SET consumption_from_grid_kwh = 3845,
         total_cost_brutto_pln = 1020.28,
         notes = 'PGE per-month sum (sec 5). Oficjalna PGE roczna 4282 kWh — różnica 437 kWh j/w. Cost = 776,38 (#6) + 213,54 (#7) + 8,37 (odsetki #7a) + 30,28 (#8 korekta) - bez prognozy #7b niezapłaconej'
   WHERE inverter_id = v_inverter_id AND year = 2025;

  -- 2026 partial: insert if missing
  INSERT INTO historical_yearly_consumption (
    user_id, inverter_id, year, consumption_from_grid_kwh, total_cost_brutto_pln, notes
  ) VALUES (
    v_user_id, v_inverter_id, 2026, 1030, NULL,
    'Tylko 01-02.2026 — 2 mies. częściowe; cost TBD bo prognoza niezapłacona'
  )
  ON CONFLICT (inverter_id, year) DO NOTHING;
END $$;

-- ============================================================================
-- 3. tariffs.rcem_history rebuild — multi-model schema
-- Old: array of { month, price_pln_mwh } — only 20 rows, schema doesn't
-- distinguish RCEm/RCE or carry the multiplier.
-- New: built from historical_pge_invoices, covers all 37 months, with model
-- and multiplier preserved.
-- ============================================================================

UPDATE tariffs t
   SET rcem_history = (
     SELECT jsonb_agg(
       jsonb_build_object(
         'month',          to_char(hpi.month_date, 'YYYY-MM'),
         'price_pln_mwh',  ROUND(COALESCE(hpi.rcem_pln_per_kwh, hpi.rce_avg_pln_per_kwh) * 1000, 2),
         'billing_model',  hpi.billing_model,
         'multiplier',     hpi.deposit_multiplier
       )
       ORDER BY hpi.month_date
     )
     FROM historical_pge_invoices hpi
     WHERE hpi.inverter_id = t.inverter_id
   )
 WHERE EXISTS (
   SELECT 1 FROM user_inverters ui
   WHERE ui.id = t.inverter_id
     AND ui.solax_plant_id = '1613529907775754244'
 );
