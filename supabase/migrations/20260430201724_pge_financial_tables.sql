-- Phase 3 enhancement: authoritative PGE data from invoices.
-- Three new tables — each backed by docs/context/08-historical-monthly-data.md
-- and 09-pge-invoices-audit.md (validated against 7 PGE invoice PDFs).
--
-- Rationale: Solax-reported financial figures are dramatically undercounted
-- (53 zł import cost in 13 months vs 4707 zł from 2025 PGE invoice alone).
-- These tables hold the trustworthy source of truth.

-- ============================================================================
-- Table: historical_pge_invoices
-- One row per (inverter, month) covering 02.2023 → present. Imported once
-- from invoice PDFs, then UPDATE-d when PGE issues retroactive corrections
-- (RCEm → RCE in 2024-07/08, multiplier 1.23 from 2025-02 etc).
-- ============================================================================

CREATE TABLE historical_pge_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,

  -- First day of the billing month, e.g. 2024-07-01
  month_date DATE NOT NULL,

  -- Meter readings from licznik 13931416
  grid_import_kwh NUMERIC(10, 2) NOT NULL,
  grid_export_kwh NUMERIC(10, 2) NOT NULL,

  -- Net-billing model used in this period
  -- 'rcem'         (17.02.2023 — 30.06.2024)  Rynkowa cena miesięczna
  -- 'rce'          (01.07.2024 — 31.01.2025)  Rynkowa cena godzinowa
  -- 'rce_x_1.23'   (01.02.2025 — present)     RCE z premią 23% prosumencką
  billing_model TEXT NOT NULL CHECK (billing_model IN ('rcem', 'rce', 'rce_x_1.23')),

  -- Base rate (RCEm or RCE) BEFORE applying the 1.23 multiplier, in PLN/kWh
  -- For 'rcem' periods: rcem_pln_per_kwh is set, rce_avg_pln_per_kwh is null
  -- For 'rce' / 'rce_x_1.23' periods: rce_avg_pln_per_kwh is set, rcem null
  rcem_pln_per_kwh NUMERIC(10, 5),
  rce_avg_pln_per_kwh NUMERIC(10, 5),

  -- Multiplier applied to base rate (1.00 or 1.23)
  deposit_multiplier NUMERIC(4, 2) NOT NULL DEFAULT 1.00,

  -- Final value of the prosumer deposit for this month, in PLN
  -- = grid_export_kwh × base_rate × deposit_multiplier
  deposit_value_pln NUMERIC(10, 2) NOT NULL,

  -- PGE invoice number (e.g. '03/2307/00117991'). NULL if not yet captured.
  invoice_no TEXT,

  -- Provenance: 'pge_invoice' (validated from PDF), 'tariff_md_extracted'
  -- (from 06-tariff.md, awaiting PDF), 'estimated' (no source yet, placeholder)
  data_source TEXT NOT NULL DEFAULT 'pge_invoice'
    CHECK (data_source IN ('pge_invoice', 'tariff_md_extracted', 'estimated')),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (inverter_id, month_date)
);

CREATE INDEX idx_pge_invoices_user_month ON historical_pge_invoices(user_id, month_date DESC);
CREATE INDEX idx_pge_invoices_inverter_month ON historical_pge_invoices(inverter_id, month_date DESC);

ALTER TABLE historical_pge_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own pge invoices" ON historical_pge_invoices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users manage own pge invoices" ON historical_pge_invoices
  FOR ALL USING (auth.uid() = user_id);

COMMENT ON TABLE historical_pge_invoices IS
  'Per-month authoritative PGE financial data from invoice PDFs. Replaces Solax-reported financial fields which are systematically undercounted.';

-- ============================================================================
-- Table: pge_invoices
-- One row per actual PGE invoice document. Source for "kiedy ostatnio
-- zapłaciłem", "ile zalegamy", etc. Each invoice covers 1-6 months of
-- historical_pge_invoices rows.
-- ============================================================================

CREATE TABLE pge_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,

  invoice_no TEXT NOT NULL,
  -- 'settlement' = regular post-period bill
  -- 'forecast'   = prognoza (PGE charges before period ends)
  -- 'correction' = retroactive correction (e.g. RCEm → RCE)
  -- 'interest'   = nota odsetkowa standalone
  invoice_type TEXT NOT NULL DEFAULT 'settlement'
    CHECK (invoice_type IN ('settlement', 'forecast', 'correction', 'interest')),

  issued_date DATE NOT NULL,
  due_date DATE,
  paid_date DATE,

  period_from DATE,
  period_to DATE,

  -- All monetary values in PLN brutto (with VAT 23%)
  amount_brutto_pln NUMERIC(10, 2) NOT NULL,
  amount_after_deposit_pln NUMERIC(10, 2),
  deposit_applied_pln NUMERIC(10, 2),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'paid_late', 'compensated', 'cancelled')),

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (inverter_id, invoice_no)
);

CREATE INDEX idx_pge_invoices_user_issued ON pge_invoices(user_id, issued_date DESC);

ALTER TABLE pge_invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own invoices" ON pge_invoices
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users manage own invoices" ON pge_invoices
  FOR ALL USING (auth.uid() = user_id);

COMMENT ON TABLE pge_invoices IS
  'PGE invoice documents trail (8 invoices for 2023-2025). Source for payment history and outstanding obligations.';

-- ============================================================================
-- Table: tariff_components
-- Per-period prices for the 11 tariff components (energia czynna, opłata
-- sieciowa zmienna, jakościowa, mocowa, OZE, kogeneracyjna, akcyza, etc).
-- Lets the dashboard compute getEffectivePricePerKwh(month) precisely.
-- ============================================================================

CREATE TABLE tariff_components (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,

  effective_from DATE NOT NULL,
  effective_to DATE,  -- null = current

  -- Component code, see docs/context/08-historical-monthly-data.md sec 7
  -- 'energia_czynna'             — variable, PLN/kWh netto
  -- 'oplata_sieciowa_zmienna'    — variable, PLN/kWh netto
  -- 'oplata_sieciowa_stala_3faz' — fixed, PLN/month netto
  -- 'oplata_jakosciowa'          — variable, PLN/kWh netto
  -- 'oplata_mocowa'              — fixed, PLN/month netto
  -- 'oplata_przejsciowa'         — fixed, PLN/month netto
  -- 'oplata_oze'                 — variable, PLN/kWh netto
  -- 'oplata_kogeneracyjna'       — variable, PLN/kWh netto
  -- 'abonament'                  — fixed, PLN/month netto
  -- 'akcyza'                     — variable, PLN/kWh netto
  component_code TEXT NOT NULL,

  -- For variable components (PLN/kWh) — fill `unit_rate_netto`
  -- For fixed components (PLN/month) — fill `monthly_rate_netto`
  unit_rate_netto NUMERIC(10, 5),
  monthly_rate_netto NUMERIC(8, 2),

  -- VAT rate, default 23%. Some periods/components may differ in future.
  vat_rate NUMERIC(4, 3) NOT NULL DEFAULT 0.23,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (
    (unit_rate_netto IS NOT NULL AND monthly_rate_netto IS NULL) OR
    (unit_rate_netto IS NULL AND monthly_rate_netto IS NOT NULL)
  )
);

CREATE INDEX idx_tariff_components_lookup
  ON tariff_components(inverter_id, component_code, effective_from DESC);

ALTER TABLE tariff_components ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own components" ON tariff_components
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users manage own components" ON tariff_components
  FOR ALL USING (auth.uid() = user_id);

COMMENT ON TABLE tariff_components IS
  'PGE G11 tariff component prices over time. Used to compute exact PLN/kWh effective price for any historical month.';

-- ============================================================================
-- Trigger: auto-update updated_at on UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pge_invoices_updated_at
  BEFORE UPDATE ON historical_pge_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_pge_invoices_doc_updated_at
  BEFORE UPDATE ON pge_invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
