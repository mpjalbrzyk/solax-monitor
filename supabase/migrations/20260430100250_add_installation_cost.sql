-- Phase 3 step 1: financial fields for ROI dashboard
-- 07-installation-history.md sec 6: 40 000 PLN brutto - 16 000 PLN Mój Prąd 4.0 = 24 000 PLN netto
-- Break-even gdy cumulative_savings >= installation_cost_pln (po dotacji)

ALTER TABLE user_inverters
  ADD COLUMN installation_cost_pln NUMERIC(10, 2),
  ADD COLUMN installation_subsidy_pln NUMERIC(10, 2);

COMMENT ON COLUMN user_inverters.installation_cost_pln IS
  'Net installation cost after subsidies (PLN). Used as ROI break-even target.';
COMMENT ON COLUMN user_inverters.installation_subsidy_pln IS
  'Subsidy received (e.g. Mój Prąd). Informational, not subtracted from cost again.';

UPDATE user_inverters
   SET installation_cost_pln = 24000.00,
       installation_subsidy_pln = 16000.00
 WHERE solax_plant_id = '1613529907775754244';
