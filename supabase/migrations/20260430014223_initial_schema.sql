-- Solax Monitor — initial schema
-- 10 tables + RLS, designed against real Solax Developer Portal API payloads (see docs/context/04-api-spec.md sec 12).
-- Multi-tenant from day one (D-002): every user-owned table has RLS scoped to auth.uid().

-- ============================================================================
-- Extensions
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;     -- pgvector for documentation_chunks (RAG)
CREATE EXTENSION IF NOT EXISTS pg_cron;    -- scheduled jobs (Edge Functions triggers)
CREATE EXTENSION IF NOT EXISTS pg_net;     -- HTTP from Postgres (cron -> Edge Function)
CREATE EXTENSION IF NOT EXISTS pgcrypto;   -- encryption helpers for tokens/secrets

-- ============================================================================
-- Table: user_inverters
-- One row per physical Solax installation owned by a user.
-- ============================================================================

CREATE TABLE user_inverters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  solax_plant_id TEXT NOT NULL UNIQUE,
  solax_inverter_sn TEXT NOT NULL,
  solax_dongle_sn TEXT NOT NULL,
  device_model INTEGER NOT NULL DEFAULT 14,

  plant_name TEXT,
  pv_capacity_kwp NUMERIC(8,2),
  battery_capacity_kwh NUMERIC(8,2),
  battery_model TEXT,
  installation_date DATE,
  plant_timezone TEXT DEFAULT 'Europe/Warsaw',
  plant_address TEXT,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),

  is_active BOOLEAN DEFAULT true,
  last_polled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_user_inverters_user_id ON user_inverters(user_id);
CREATE INDEX idx_user_inverters_solax_plant_id ON user_inverters(solax_plant_id);

ALTER TABLE user_inverters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own inverters" ON user_inverters
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users manage own inverters" ON user_inverters
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- Table: plant_realtime_readings
-- Aggregated plant-level snapshots from Solax /plant/realtime_data, polled every 5 min.
-- ============================================================================

CREATE TABLE plant_realtime_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,

  recorded_at TIMESTAMPTZ NOT NULL,
  plant_local_time TIMESTAMP,

  daily_yield_kwh NUMERIC(10,2),
  total_yield_kwh NUMERIC(12,2),

  -- Battery aggregates from Solax = always 0 for our plant (battery not registered as device, see api-spec sec 7.1)
  daily_charged_kwh NUMERIC(10,2),
  total_charged_kwh NUMERIC(12,2),
  daily_discharged_kwh NUMERIC(10,2),
  total_discharged_kwh NUMERIC(12,2),

  daily_imported_kwh NUMERIC(10,2),
  total_imported_kwh NUMERIC(12,2),
  daily_exported_kwh NUMERIC(10,2),
  total_exported_kwh NUMERIC(12,2),

  -- Solax earnings always 0 for us (no tariff in Solax Cloud, we calculate ourselves)
  daily_earnings NUMERIC(10,2),
  total_earnings NUMERIC(12,2),

  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_plant_realtime_user_recorded ON plant_realtime_readings(user_id, recorded_at DESC);
CREATE INDEX idx_plant_realtime_inverter_recorded ON plant_realtime_readings(inverter_id, recorded_at DESC);

ALTER TABLE plant_realtime_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own plant readings" ON plant_realtime_readings
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- Table: device_realtime_readings
-- Per-device snapshots: inverter (device_type=1) and battery (device_type=2).
-- Battery has empty deviceSn in API responses (see api-spec sec 7.1) — identify via (inverter_id, device_type=2).
-- ============================================================================

CREATE TABLE device_realtime_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,

  device_type SMALLINT NOT NULL,  -- 1=inverter, 2=battery
  device_sn TEXT,                 -- nullable: empty for battery
  recorded_at TIMESTAMPTZ NOT NULL,
  plant_local_time TIMESTAMP,
  device_status INTEGER,          -- 100=Waiting, 102=Normal, etc.

  -- Inverter AC/grid (sign convention: see api-spec sec 6, normalized in poll-realtime Edge Function)
  ac_voltage_l1 NUMERIC(8,2),
  ac_voltage_l2 NUMERIC(8,2),
  ac_voltage_l3 NUMERIC(8,2),
  ac_current_l1 NUMERIC(8,2),
  ac_current_l2 NUMERIC(8,2),
  ac_current_l3 NUMERIC(8,2),
  ac_power_l1_w NUMERIC(10,2),
  ac_power_l2_w NUMERIC(10,2),
  ac_power_l3_w NUMERIC(10,2),
  ac_frequency_l1 NUMERIC(6,2),
  ac_frequency_l2 NUMERIC(6,2),
  ac_frequency_l3 NUMERIC(6,2),
  grid_frequency NUMERIC(6,2),
  total_active_power_w NUMERIC(10,2),
  total_reactive_power_var NUMERIC(10,2),
  total_power_factor NUMERIC(4,2),
  inverter_temperature_c NUMERIC(5,1),
  daily_yield_kwh NUMERIC(10,2),
  total_yield_kwh NUMERIC(12,2),
  daily_ac_output_kwh NUMERIC(10,2),
  total_ac_output_kwh NUMERIC(12,2),
  mppt_total_input_power_w NUMERIC(10,2),

  -- Grid / meter
  grid_power_w NUMERIC(10,2),
  today_import_energy_kwh NUMERIC(10,2),
  total_import_energy_kwh NUMERIC(12,2),
  today_export_energy_kwh NUMERIC(10,2),
  total_export_energy_kwh NUMERIC(12,2),
  grid_power_m2_w NUMERIC(10,2),
  today_import_energy_m2_kwh NUMERIC(10,2),
  total_import_energy_m2_kwh NUMERIC(12,2),
  today_export_energy_m2_kwh NUMERIC(10,2),
  total_export_energy_m2_kwh NUMERIC(12,2),

  -- MPPT and PV strings (jsonb because variable string count)
  mppt_data JSONB,
  pv_data JSONB,

  -- EPS (Emergency Power Supply, off-grid backup)
  eps_l1_voltage NUMERIC(8,2),
  eps_l1_current NUMERIC(8,2),
  eps_l1_active_power_w NUMERIC(10,2),
  eps_l2_voltage NUMERIC(8,2),
  eps_l2_current NUMERIC(8,2),
  eps_l2_active_power_w NUMERIC(10,2),
  eps_l3_voltage NUMERIC(8,2),
  eps_l3_current NUMERIC(8,2),
  eps_l3_active_power_w NUMERIC(10,2),
  eps_l1_apparent_power_va NUMERIC(10,2),
  eps_l2_apparent_power_va NUMERIC(10,2),
  eps_l3_apparent_power_va NUMERIC(10,2),

  -- Line-to-line voltages (3-phase only)
  l1l2_voltage NUMERIC(8,2),
  l2l3_voltage NUMERIC(8,2),
  l1l3_voltage NUMERIC(8,2),

  -- Battery-only fields
  battery_soc_pct NUMERIC(5,2),
  battery_remainings_kwh NUMERIC(8,2),
  battery_soh_pct NUMERIC(5,2),
  charge_discharge_power_w NUMERIC(10,2),
  battery_voltage_v NUMERIC(8,2),
  battery_current_a NUMERIC(8,2),
  battery_temperature_c NUMERIC(5,1),
  battery_cycle_times INTEGER,
  total_charge_kwh NUMERIC(12,2),
  total_discharge_kwh NUMERIC(12,2),

  raw_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_device_realtime_user_recorded ON device_realtime_readings(user_id, recorded_at DESC);
CREATE INDEX idx_device_realtime_inverter_type_recorded ON device_realtime_readings(inverter_id, device_type, recorded_at DESC);

ALTER TABLE device_realtime_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own device readings" ON device_realtime_readings
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- Table: monthly_aggregates
-- From Solax /plant/energy/get_stat_data with dateType=1 (annual) — one row per (inverter, month).
-- Source for YoY comparisons.
-- ============================================================================

CREATE TABLE monthly_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,

  month DATE NOT NULL,  -- first day of month, e.g. 2025-09-01

  pv_generation_kwh NUMERIC(12,2),
  inverter_ac_output_kwh NUMERIC(12,2),
  export_energy_kwh NUMERIC(10,2),
  import_energy_kwh NUMERIC(10,2),
  load_consumption_kwh NUMERIC(12,2),
  battery_charged_kwh NUMERIC(10,2),
  battery_discharged_kwh NUMERIC(10,2),
  earnings NUMERIC(10,2),  -- from Solax = 0 for us, we compute our own

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (inverter_id, month)
);

CREATE INDEX idx_monthly_user_month ON monthly_aggregates(user_id, month DESC);

ALTER TABLE monthly_aggregates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own monthly" ON monthly_aggregates
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- Table: daily_aggregates
-- Computed daily by Edge Function from plant_realtime_readings + device_realtime_readings + tariffs.
-- Source for dashboard, weekly digest, alerts.
-- ============================================================================

CREATE TABLE daily_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  yield_kwh NUMERIC(10,2),
  consumption_kwh NUMERIC(10,2),
  import_kwh NUMERIC(10,2),
  export_kwh NUMERIC(10,2),
  battery_charged_kwh NUMERIC(10,2),
  battery_discharged_kwh NUMERIC(10,2),
  self_use_kwh NUMERIC(10,2),
  self_use_rate_pct NUMERIC(5,2),

  -- Financial (computed from tariffs table)
  savings_pln NUMERIC(10,2),
  cost_pln NUMERIC(10,2),
  earnings_pln NUMERIC(10,2),
  net_balance_pln NUMERIC(10,2),

  peak_production_w NUMERIC(10,2),
  peak_consumption_w NUMERIC(10,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (inverter_id, date)
);

CREATE INDEX idx_daily_user_date ON daily_aggregates(user_id, date DESC);

ALTER TABLE daily_aggregates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own daily" ON daily_aggregates
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- Table: inverter_alarms
-- From Solax /alarm/page_alarm_info, polled every 15 min. Alerts on alarm_level >= 2.
-- ============================================================================

CREATE TABLE inverter_alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,
  device_sn TEXT NOT NULL,

  error_code TEXT NOT NULL,
  alarm_name TEXT,
  alarm_type TEXT,
  alarm_level SMALLINT,
  alarm_state SMALLINT NOT NULL,  -- 0=closed, 1=ongoing
  alarm_start_time TIMESTAMPTZ NOT NULL,
  alarm_end_time TIMESTAMPTZ,

  notified_at TIMESTAMPTZ,
  notification_sent_to TEXT[],
  resolved_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (inverter_id, error_code, alarm_start_time)
);

CREATE INDEX idx_alarms_user_state ON inverter_alarms(user_id, alarm_state);
CREATE INDEX idx_alarms_inverter_start ON inverter_alarms(inverter_id, alarm_start_time DESC);

ALTER TABLE inverter_alarms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own alarms" ON inverter_alarms
  FOR SELECT USING (auth.uid() = user_id);

-- ============================================================================
-- Table: tariffs
-- Per-user energy tariff config. Used by daily-aggregates Edge Function.
-- See docs/context/06-tariff.md for PGE G11 structure for our installation.
-- ============================================================================

CREATE TABLE tariffs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,

  effective_from DATE NOT NULL,
  effective_to DATE,  -- null = current

  seller TEXT NOT NULL,           -- 'PGE Obrót', 'Tauron', 'Energa', 'Enea'
  tariff_code TEXT NOT NULL,      -- 'G11', 'G12', 'G12w', 'G13'
  is_net_billing BOOLEAN DEFAULT true,

  -- Variable rates per zone (G11: one zone "calodobowa"; G12: two; G12w: three)
  zones JSONB NOT NULL,

  -- Fixed monthly charges (PLN brutto/month)
  fixed_handling_pln_month NUMERIC(8,2),
  fixed_distribution_pln_month NUMERIC(8,2),
  fixed_capacity_pln_month NUMERIC(8,2),
  fixed_oze_pln_month NUMERIC(8,2),
  fixed_other_pln_month NUMERIC(8,2),

  -- RCEm history for net-billing (PLN/MWh, updated monthly from PSE)
  rcem_history JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tariffs_user_inverter ON tariffs(user_id, inverter_id, effective_from DESC);

ALTER TABLE tariffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own tariffs" ON tariffs
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- Table: api_credentials
-- Encrypted Solax OAuth credentials per user. Token refreshed every ~25 days
-- by refresh-token Edge Function (see api-spec sec 10).
-- ============================================================================

CREATE TABLE api_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  provider TEXT NOT NULL,         -- 'solax_developer'
  app_code TEXT,
  client_id TEXT NOT NULL,
  client_secret_encrypted TEXT NOT NULL,

  access_token_encrypted TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ,
  scope TEXT,

  last_refreshed_at TIMESTAMPTZ,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (user_id, provider)
);

CREATE INDEX idx_api_creds_user_provider ON api_credentials(user_id, provider);

ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users access own credentials" ON api_credentials
  FOR ALL USING (auth.uid() = user_id);

-- ============================================================================
-- Table: documentation_chunks
-- Chunked + embedded technical docs (Solax X3-Hybrid-G4 manuals) for RAG chatbot in Faza 5.
-- Shared across all users (no RLS) — same docs apply to anyone with the same inverter model.
-- ============================================================================

CREATE TABLE documentation_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  source_document TEXT NOT NULL,
  source_page INTEGER,
  chunk_index INTEGER NOT NULL,

  content TEXT NOT NULL,
  content_metadata JSONB,         -- e.g. {"section":"Error Codes","model":"X3-Hybrid-G4"}

  embedding vector(1024),         -- Voyage AI voyage-3 default dimension

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_doc_chunks_embedding ON documentation_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- Table: historical_yearly_consumption
-- Pre-PV historical data from brother's spreadsheet (2015-2023) plus post-PV
-- yearly totals. Used as a baseline for "life before PV" comparisons in chatbot.
-- See docs/context/06-tariff.md sec 7.
-- ============================================================================

CREATE TABLE historical_yearly_consumption (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  inverter_id UUID NOT NULL REFERENCES user_inverters(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  consumption_from_grid_kwh NUMERIC(10,2),
  total_cost_brutto_pln NUMERIC(10,2),
  notes TEXT,
  PRIMARY KEY (inverter_id, year)
);

ALTER TABLE historical_yearly_consumption ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own history" ON historical_yearly_consumption
  FOR ALL USING (auth.uid() = user_id);
