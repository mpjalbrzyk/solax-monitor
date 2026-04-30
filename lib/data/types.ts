// Shape of rows we read from Supabase. Trimmed to fields the dashboard
// actually uses — full schema lives in supabase/migrations.

export type UserInverter = {
  id: string;
  user_id: string;
  solax_plant_id: string;
  solax_inverter_sn: string;
  device_model: number;
  plant_name: string | null;
  pv_capacity_kwp: number | null;
  battery_capacity_kwh: number | null;
  battery_model: string | null;
  installation_date: string | null;
  plant_timezone: string | null;
  installation_cost_pln: number | null;
  installation_subsidy_pln: number | null;
  is_active: boolean;
  last_polled_at: string | null;
};

export type PlantRealtimeReading = {
  id: string;
  inverter_id: string;
  recorded_at: string;
  plant_local_time: string | null;
  daily_yield_kwh: number | null;
  total_yield_kwh: number | null;
  daily_imported_kwh: number | null;
  total_imported_kwh: number | null;
  daily_exported_kwh: number | null;
  total_exported_kwh: number | null;
};

export type DeviceRealtimeReading = {
  id: string;
  inverter_id: string;
  device_type: 1 | 2;
  device_sn: string | null;
  recorded_at: string;
  device_status: number | null;
  total_active_power_w: number | null;
  daily_yield_kwh: number | null;
  total_yield_kwh: number | null;
  inverter_temperature_c: number | null;
  grid_power_w: number | null;
  today_import_energy_kwh: number | null;
  today_export_energy_kwh: number | null;
  total_import_energy_kwh: number | null;
  total_export_energy_kwh: number | null;
  battery_soc_pct: number | null;
  battery_remainings_kwh: number | null;
  charge_discharge_power_w: number | null;
  battery_voltage_v: number | null;
  battery_temperature_c: number | null;
};

export type DailyAggregate = {
  date: string;
  yield_kwh: number | null;
  consumption_kwh: number | null;
  import_kwh: number | null;
  export_kwh: number | null;
  battery_charged_kwh: number | null;
  battery_discharged_kwh: number | null;
  self_use_kwh: number | null;
  self_use_rate_pct: number | null;
  savings_pln: number | null;
  cost_pln: number | null;
  earnings_pln: number | null;
  net_balance_pln: number | null;
  peak_production_w: number | null;
  peak_consumption_w: number | null;
};

export type MonthlyAggregate = {
  month: string;
  pv_generation_kwh: number | null;
  inverter_ac_output_kwh: number | null;
  export_energy_kwh: number | null;
  import_energy_kwh: number | null;
  load_consumption_kwh: number | null;
  battery_charged_kwh: number | null;
  battery_discharged_kwh: number | null;
};

export type InverterAlarm = {
  id: string;
  device_sn: string;
  error_code: string;
  alarm_name: string | null;
  alarm_type: string | null;
  alarm_level: number | null;
  alarm_state: number;
  alarm_start_time: string;
  alarm_end_time: string | null;
  resolved_notes: string | null;
};

export type Tariff = {
  id: string;
  effective_from: string;
  effective_to: string | null;
  seller: string;
  tariff_code: string;
  is_net_billing: boolean;
  zones: { name: string; rate_brutto_pln_kwh: number }[];
  fixed_handling_pln_month: number | null;
  fixed_distribution_pln_month: number | null;
  fixed_capacity_pln_month: number | null;
  fixed_oze_pln_month: number | null;
  fixed_other_pln_month: number | null;
  rcem_history: Record<string, number> | null;
};

export type HistoricalYearlyConsumption = {
  year: number;
  consumption_from_grid_kwh: number | null;
  total_cost_brutto_pln: number | null;
  notes: string | null;
};
