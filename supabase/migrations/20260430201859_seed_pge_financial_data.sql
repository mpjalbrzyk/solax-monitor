-- Phase 3 enhancement: seed PGE financial data
--
-- Source files (validated by Michał from PGE invoice PDFs):
--   docs/context/08-historical-monthly-data.md  — 37 months + 11 components × 6 periods
--   docs/context/09-pge-invoices-audit.md       — 8 invoice documents trail
--
-- All inserts scoped via subquery on solax_plant_id so we don't hardcode UUIDs.

DO $$
DECLARE
  v_user_id UUID;
  v_inverter_id UUID;
BEGIN
  SELECT user_id, id INTO v_user_id, v_inverter_id
  FROM user_inverters
  WHERE solax_plant_id = '1613529907775754244'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Solax plant 1613529907775754244 not found in user_inverters';
  END IF;

  -- ==========================================================================
  -- A. historical_pge_invoices — 37 months
  -- ==========================================================================

  INSERT INTO historical_pge_invoices (
    user_id, inverter_id, month_date,
    grid_import_kwh, grid_export_kwh,
    rcem_pln_per_kwh, rce_avg_pln_per_kwh,
    deposit_multiplier, deposit_value_pln,
    billing_model, invoice_no, data_source
  ) VALUES
    -- 2023 (11 mies, RCEm)
    (v_user_id, v_inverter_id, '2023-02-01', 136, 27,  0.66851, NULL,    1.00, 18.05,  'rcem', '03/2307/00117991', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2023-03-01', 304, 223, 0.50890, NULL,    1.00, 113.48, 'rcem', '03/2307/00117991', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2023-04-01', 248, 351, 0.50544, NULL,    1.00, 177.41, 'rcem', '03/2307/00117991', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2023-05-01', 222, 517, 0.38144, NULL,    1.00, 197.20, 'rcem', '03/2307/00117991', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2023-06-01', 190, 488, 0.45462, NULL,    1.00, 221.85, 'rcem', '03/2307/00117991', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2023-07-01', 248, 497, 0.43922, NULL,    1.00, 218.29, 'rcem', '03/2402/00170603', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2023-08-01', 257, 436, 0.41233, NULL,    1.00, 179.78, 'rcem', '03/2402/00170603', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2023-09-01', 258, 481, 0.40482, NULL,    1.00, 194.72, 'rcem', '03/2402/00170603', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2023-10-01', 409, 126, 0.32925, NULL,    1.00, 41.49,  'rcem', '03/2402/00170603', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2023-11-01', 564, 22,  0.37897, NULL,    1.00, 8.34,   'rcem', '03/2402/00170603', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2023-12-01', 550, 1,   0.30463, NULL,    1.00, 0.30,   'rcem', '03/2402/00170603', 'pge_invoice'),
    -- 2024 (12 mies, RCEm Jan-Jun, RCE Jul-Dec)
    (v_user_id, v_inverter_id, '2024-01-01', 570, 7,   0.43702, NULL,    1.00, 3.06,   'rcem', '03/2407/00383158', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2024-02-01', 404, 54,  0.32317, NULL,    1.00, 17.45,  'rcem', '03/2407/00383158', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2024-03-01', 356, 247, 0.24912, NULL,    1.00, 61.53,  'rcem', '03/2407/00383158', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2024-04-01', 250, 330, 0.25369, NULL,    1.00, 83.72,  'rcem', '03/2407/00383158', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2024-05-01', 189, 582, 0.25532, NULL,    1.00, 148.60, 'rcem', '03/2407/00383158', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2024-06-01', 212, 477, 0.33047, NULL,    1.00, 157.63, 'rcem', '03/2407/00383158', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2024-07-01', 214, 559, NULL,    0.26125, 1.00, 146.04, 'rce',  '03/2505/00099527', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2024-08-01', 208, 477, NULL,    0.21893, 1.00, 104.43, 'rce',  '03/2505/00099527', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2024-09-01', 232, 414, NULL,    0.22329, 1.00, 92.44,  'rce',  '03/2505/00099527', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2024-10-01', 370, 152, NULL,    0.21816, 1.00, 33.16,  'rce',  '03/2505/00099527', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2024-11-01', 477, 29,  NULL,    0.41069, 1.00, 11.91,  'rce',  '03/2505/00099527', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2024-12-01', 534, 5,   NULL,    0.57800, 1.00, 2.89,   'rce',  '03/2505/00099527', 'pge_invoice'),
    -- 2025 (12 mies; Jan still RCE 1.00, Feb+ multiplier 1.23)
    (v_user_id, v_inverter_id, '2025-01-01', 530, 16,  NULL,    0.49500, 1.00, 7.92,   'rce',         '03/2505/00099527', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2025-02-01', 346, 101, NULL,    0.44202, 1.23, 54.91,  'rce_x_1.23',  '03/2505/00099527', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2025-03-01', 304, 374, NULL,    0.18296, 1.23, 84.16,  'rce_x_1.23',  '03/2509/00137305', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2025-04-01', 183, 590, NULL,    0.16319, 1.23, 118.42, 'rce_x_1.23',  '03/2509/00137305', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2025-05-01', 207, 504, NULL,    0.21697, 1.23, 134.50, 'rce_x_1.23',  '03/2509/00137305', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2025-06-01', 182, 484, NULL,    0.13629, 1.23, 81.14,  'rce_x_1.23',  '03/2509/00137305', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2025-07-01', 235, 387, NULL,    0.28483, 1.23, 135.58, 'rce_x_1.23',  '03/2509/00137305', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2025-08-01', 205, 500, NULL,    0.21468, 1.23, 132.03, 'rce_x_1.23',  '03/2509/00137305', 'pge_invoice'),
    (v_user_id, v_inverter_id, '2025-09-01', 244, 352, NULL,    0.27971, 1.23, 121.11, 'rce_x_1.23',  NULL,               'tariff_md_extracted'),
    (v_user_id, v_inverter_id, '2025-10-01', 377, 134, NULL,    0.34084, 1.23, 56.17,  'rce_x_1.23',  NULL,               'tariff_md_extracted'),
    (v_user_id, v_inverter_id, '2025-11-01', 454, 35,  NULL,    0.38288, 1.23, 16.49,  'rce_x_1.23',  NULL,               'tariff_md_extracted'),
    (v_user_id, v_inverter_id, '2025-12-01', 578, 1,   NULL,    0.46608, 1.23, 0.57,   'rce_x_1.23',  NULL,               'tariff_md_extracted'),
    -- 2026 (2 mies, partial)
    (v_user_id, v_inverter_id, '2026-01-01', 583, 0,   NULL,    0.55196, 1.23, 0.00,   'rce_x_1.23',  NULL,               'tariff_md_extracted'),
    (v_user_id, v_inverter_id, '2026-02-01', 447, 52,  NULL,    0.33901, 1.23, 21.69,  'rce_x_1.23',  NULL,               'tariff_md_extracted')
  ON CONFLICT (inverter_id, month_date) DO NOTHING;

  -- ==========================================================================
  -- B. pge_invoices — 8 invoice documents
  -- ==========================================================================

  INSERT INTO pge_invoices (
    user_id, inverter_id,
    invoice_no, invoice_type,
    issued_date, due_date, paid_date,
    period_from, period_to,
    amount_brutto_pln, amount_after_deposit_pln, deposit_applied_pln,
    status, notes
  ) VALUES
    (v_user_id, v_inverter_id, '03/2307/00117991', 'settlement', '2023-07-14', '2023-07-28', '2023-07-28',
     '2023-02-17', '2023-06-30', 952.52, 611.19, 341.33, 'paid',
     'Pierwsza faktura prosumencka po przyłączeniu mikroinstalacji'),
    (v_user_id, v_inverter_id, '03/2402/00170603', 'settlement', '2024-02-27', '2024-03-12', '2024-03-07',
     '2023-07-01', '2023-12-31', 2553.94, 1399.32, 1029.28, 'paid',
     'II półrocze 2023; nadpłata z poprzedniej -125,34'),
    (v_user_id, v_inverter_id, '03/2407/00383158', 'settlement', '2024-08-01', '2024-08-16', '2024-08-16',
     '2024-01-01', '2024-06-30', 2020.00, 1705.34, 314.66, 'paid',
     'I półrocze 2024'),
    (v_user_id, v_inverter_id, '03/2409/00109610', 'settlement', '2024-09-17', NULL, NULL,
     '2024-07-01', '2024-08-31', 47.84, 47.84, 262.13, 'compensated',
     'Z upustem 10% rządowym; nadwyżka 207,74 PLN skompensowana na fakturze prognozowej'),
    (v_user_id, v_inverter_id, '03/2409/00109610/2', 'forecast', '2024-09-17', '2024-12-27', '2024-10-25',
     '2024-09-01', '2024-12-31', 995.58, 877.54, 118.04, 'paid',
     'Pierwsza prognoza wystawiona przez PGE'),
    (v_user_id, v_inverter_id, '03/2505/00099527', 'settlement', '2025-05-21', '2025-06-04', '2025-06-06',
     '2024-09-01', '2025-02-28', 2812.13, 776.38, 90.92, 'paid_late',
     'Korekta wsteczna RCEm → RCE (07-08.2024) i wprowadzenie mnożnika 1,23 od 02.2025'),
    (v_user_id, v_inverter_id, '03/2509/00137305', 'settlement', '2025-09-17', '2025-10-01', '2025-09-29',
     '2025-03-01', '2025-08-31', 1562.50, 213.54, 600.47, 'paid',
     'Mnożnik 1,23 zastosowany dla pełnego okresu'),
    (v_user_id, v_inverter_id, '03/0684882', 'interest', '2025-09-17', '2025-10-01', '2025-09-29',
     '2024-12-27', '2025-06-05', 8.37, 8.37, 0.00, 'paid',
     'Nota odsetkowa naliczona przy fakturze 03/2509/00137305'),
    (v_user_id, v_inverter_id, '03/2509/00137305/2', 'forecast', '2025-09-17', '2025-12-31', NULL,
     '2025-09-01', '2025-12-31', 983.09, 715.64, 267.45, 'pending',
     'Prognoza 09-12.2025 — niezapłacona, do sprawdzenia w eBOK'),
    (v_user_id, v_inverter_id, '03/2512/10663516/00000001', 'correction', '2025-12-30', '2026-01-19', '2026-01-15',
     '2024-09-01', '2025-02-28', 0.00, 30.28, 30.28, 'paid',
     'Korekta techniczna — drobna zmiana wartości depozytu')
  ON CONFLICT (inverter_id, invoice_no) DO NOTHING;

  -- ==========================================================================
  -- C. tariff_components — 11 components × 6 periods
  -- Per docs/context/08-historical-monthly-data.md sec 7
  -- ==========================================================================

  -- 7.1 Energia czynna całodobowa (PLN/kWh netto)
  INSERT INTO tariff_components (user_id, inverter_id, effective_from, effective_to, component_code, unit_rate_netto, vat_rate, notes) VALUES
    (v_user_id, v_inverter_id, '2023-02-17', '2023-10-31', 'energia_czynna', 0.41400, 0.23, NULL),
    (v_user_id, v_inverter_id, '2023-11-01', '2023-12-31', 'energia_czynna', 0.69800, 0.23, NULL),
    (v_user_id, v_inverter_id, '2024-01-01', '2024-04-21', 'energia_czynna', 0.41400, 0.23, NULL),
    (v_user_id, v_inverter_id, '2024-04-22', '2024-08-31', 'energia_czynna', 0.69800, 0.23, NULL),
    (v_user_id, v_inverter_id, '2024-09-01', '2025-09-30', 'energia_czynna', 0.50500, 0.23, NULL),
    (v_user_id, v_inverter_id, '2025-10-01', NULL,         'energia_czynna', 0.63380, 0.23, NULL);

  -- 7.2 Opłata sieciowa zmienna całodobowa
  INSERT INTO tariff_components (user_id, inverter_id, effective_from, effective_to, component_code, unit_rate_netto) VALUES
    (v_user_id, v_inverter_id, '2023-02-17', '2023-10-31', 'oplata_sieciowa_zmienna', 0.22230),
    (v_user_id, v_inverter_id, '2023-11-01', '2023-12-31', 'oplata_sieciowa_zmienna', 0.34880),
    (v_user_id, v_inverter_id, '2024-01-01', '2024-04-21', 'oplata_sieciowa_zmienna', 0.22230),
    (v_user_id, v_inverter_id, '2024-04-22', '2024-12-31', 'oplata_sieciowa_zmienna', 0.35000),
    (v_user_id, v_inverter_id, '2025-01-01', NULL,         'oplata_sieciowa_zmienna', 0.34690);

  -- 7.3 Opłata sieciowa stała 3-fazowa (PLN/m-c)
  INSERT INTO tariff_components (user_id, inverter_id, effective_from, effective_to, component_code, monthly_rate_netto) VALUES
    (v_user_id, v_inverter_id, '2023-02-17', '2023-10-31', 'oplata_sieciowa_stala_3faz', 6.56),
    (v_user_id, v_inverter_id, '2023-11-01', '2024-12-31', 'oplata_sieciowa_stala_3faz', 9.99),
    (v_user_id, v_inverter_id, '2025-01-01', NULL,         'oplata_sieciowa_stala_3faz', 9.98);

  -- 7.4 Opłata jakościowa
  INSERT INTO tariff_components (user_id, inverter_id, effective_from, effective_to, component_code, unit_rate_netto) VALUES
    (v_user_id, v_inverter_id, '2023-02-17', '2024-04-21', 'oplata_jakosciowa', 0.00950),
    (v_user_id, v_inverter_id, '2024-04-22', '2024-12-31', 'oplata_jakosciowa', 0.03140),
    (v_user_id, v_inverter_id, '2025-01-01', NULL,         'oplata_jakosciowa', 0.03210);

  -- 7.5 Opłata mocowa (zmienna w czasie, w tym zwolnienie 09.2024-08.2025)
  INSERT INTO tariff_components (user_id, inverter_id, effective_from, effective_to, component_code, monthly_rate_netto, notes) VALUES
    (v_user_id, v_inverter_id, '2023-02-17', '2023-12-31', 'oplata_mocowa', 13.35, 'Pełna stawka'),
    (v_user_id, v_inverter_id, '2024-01-01', '2024-08-31', 'oplata_mocowa', 14.90, 'Wzrost'),
    (v_user_id, v_inverter_id, '2024-09-01', '2025-08-31', 'oplata_mocowa', 0.00,  'Zwolnienie ustawowe'),
    (v_user_id, v_inverter_id, '2025-09-01', NULL,         'oplata_mocowa', 16.01, 'Powrót opłaty');

  -- 7.6 Opłata przejściowa (>1200 kWh) — stała przez cały okres
  INSERT INTO tariff_components (user_id, inverter_id, effective_from, effective_to, component_code, monthly_rate_netto) VALUES
    (v_user_id, v_inverter_id, '2023-02-17', NULL, 'oplata_przejsciowa', 0.33);

  -- 7.7 Opłata OZE
  INSERT INTO tariff_components (user_id, inverter_id, effective_from, effective_to, component_code, unit_rate_netto) VALUES
    (v_user_id, v_inverter_id, '2023-02-17', '2024-12-31', 'oplata_oze', 0.00000),
    (v_user_id, v_inverter_id, '2025-01-01', NULL,         'oplata_oze', 0.00350);

  -- 7.8 Opłata kogeneracyjna
  INSERT INTO tariff_components (user_id, inverter_id, effective_from, effective_to, component_code, unit_rate_netto) VALUES
    (v_user_id, v_inverter_id, '2023-02-17', '2023-12-31', 'oplata_kogeneracyjna', 0.00496),
    (v_user_id, v_inverter_id, '2024-01-01', '2024-12-31', 'oplata_kogeneracyjna', 0.00618),
    (v_user_id, v_inverter_id, '2025-01-01', NULL,         'oplata_kogeneracyjna', 0.00300);

  -- 7.9 Abonament — stała 0,75 PLN/m-c
  INSERT INTO tariff_components (user_id, inverter_id, effective_from, effective_to, component_code, monthly_rate_netto) VALUES
    (v_user_id, v_inverter_id, '2023-02-17', NULL, 'abonament', 0.75);

  -- 7.10 Akcyza — 0,005 PLN/kWh
  INSERT INTO tariff_components (user_id, inverter_id, effective_from, effective_to, component_code, unit_rate_netto, vat_rate) VALUES
    (v_user_id, v_inverter_id, '2023-02-17', NULL, 'akcyza', 0.00500, 0.00);  -- akcyza is not VAT-able

END $$;
