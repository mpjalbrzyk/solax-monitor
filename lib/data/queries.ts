import "server-only";
import { getServiceClient } from "./client";
import type {
  DailyAggregate,
  DeviceRealtimeReading,
  HistoricalYearlyConsumption,
  InverterAlarm,
  MonthlyAggregate,
  PlantRealtimeReading,
  Tariff,
  UserInverter,
} from "./types";

// All queries are scoped by inverter_id. On MVP we have one inverter — pulled
// once via getActiveInverter() and threaded through page props.

export async function getActiveInverter(): Promise<UserInverter | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_inverters")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getActiveInverter]", error.message);
    return null;
  }
  return (data as UserInverter | null) ?? null;
}

export async function getLatestPlantReading(
  inverterId: string,
): Promise<PlantRealtimeReading | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("plant_realtime_readings")
    .select(
      "id, inverter_id, recorded_at, plant_local_time, daily_yield_kwh, total_yield_kwh, daily_imported_kwh, total_imported_kwh, daily_exported_kwh, total_exported_kwh",
    )
    .eq("inverter_id", inverterId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getLatestPlantReading]", error.message);
    return null;
  }
  return (data as PlantRealtimeReading | null) ?? null;
}

export async function getLatestDeviceReading(
  inverterId: string,
  deviceType: 1 | 2,
): Promise<DeviceRealtimeReading | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("device_realtime_readings")
    .select("*")
    .eq("inverter_id", inverterId)
    .eq("device_type", deviceType)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getLatestDeviceReading]", error.message);
    return null;
  }
  return (data as DeviceRealtimeReading | null) ?? null;
}

export async function getDeviceReadingsRange(
  inverterId: string,
  deviceType: 1 | 2,
  fromIso: string,
  toIso: string,
): Promise<DeviceRealtimeReading[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("device_realtime_readings")
    .select(
      "id, inverter_id, device_type, recorded_at, total_active_power_w, grid_power_w, daily_yield_kwh, today_import_energy_kwh, today_export_energy_kwh, battery_soc_pct, charge_discharge_power_w",
    )
    .eq("inverter_id", inverterId)
    .eq("device_type", deviceType)
    .gte("recorded_at", fromIso)
    .lte("recorded_at", toIso)
    .order("recorded_at", { ascending: true });

  if (error) {
    console.error("[getDeviceReadingsRange]", error.message);
    return [];
  }
  return (data as DeviceRealtimeReading[]) ?? [];
}

export async function getDailyAggregates(
  inverterId: string,
  fromDate: string,
  toDate: string,
): Promise<DailyAggregate[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("daily_aggregates")
    .select("*")
    .eq("inverter_id", inverterId)
    .gte("date", fromDate)
    .lte("date", toDate)
    .order("date", { ascending: true });

  if (error) {
    console.error("[getDailyAggregates]", error.message);
    return [];
  }
  return (data as DailyAggregate[]) ?? [];
}

export async function getMonthlyAggregates(
  inverterId: string,
): Promise<MonthlyAggregate[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("monthly_aggregates")
    .select("*")
    .eq("inverter_id", inverterId)
    .order("month", { ascending: true });

  if (error) {
    console.error("[getMonthlyAggregates]", error.message);
    return [];
  }
  return (data as MonthlyAggregate[]) ?? [];
}

export async function getRecentAlarms(
  inverterId: string,
  days = 30,
): Promise<InverterAlarm[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];

  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from("inverter_alarms")
    .select(
      "id, device_sn, error_code, alarm_name, alarm_type, alarm_level, alarm_state, alarm_start_time, alarm_end_time, resolved_notes",
    )
    .eq("inverter_id", inverterId)
    .gte("alarm_start_time", since.toISOString())
    .order("alarm_start_time", { ascending: false });

  if (error) {
    console.error("[getRecentAlarms]", error.message);
    return [];
  }
  return (data as InverterAlarm[]) ?? [];
}

export async function getActiveTariff(
  inverterId: string,
  date: string,
): Promise<Tariff | null> {
  const supabase = getServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("tariffs")
    .select("*")
    .eq("inverter_id", inverterId)
    .lte("effective_from", date)
    .or(`effective_to.is.null,effective_to.gte.${date}`)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getActiveTariff]", error.message);
    return null;
  }
  return (data as Tariff | null) ?? null;
}

export async function getHistoricalConsumption(
  inverterId: string,
): Promise<HistoricalYearlyConsumption[]> {
  const supabase = getServiceClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("historical_yearly_consumption")
    .select("*")
    .eq("inverter_id", inverterId)
    .order("year", { ascending: true });

  if (error) {
    console.error("[getHistoricalConsumption]", error.message);
    return [];
  }
  return (data as HistoricalYearlyConsumption[]) ?? [];
}

// Sum cumulative savings/cost/earnings over all daily aggregates — used by
// Financial dashboard to show progress vs break-even target.
export async function getCumulativeFinancials(inverterId: string): Promise<{
  total_savings_pln: number;
  total_cost_pln: number;
  total_earnings_pln: number;
  total_net_pln: number;
  total_yield_kwh: number;
  days_count: number;
}> {
  const supabase = getServiceClient();
  if (!supabase) {
    return {
      total_savings_pln: 0,
      total_cost_pln: 0,
      total_earnings_pln: 0,
      total_net_pln: 0,
      total_yield_kwh: 0,
      days_count: 0,
    };
  }

  const { data, error } = await supabase
    .from("daily_aggregates")
    .select(
      "yield_kwh, savings_pln, cost_pln, earnings_pln, net_balance_pln",
    )
    .eq("inverter_id", inverterId);

  if (error) {
    console.error("[getCumulativeFinancials]", error.message);
    return {
      total_savings_pln: 0,
      total_cost_pln: 0,
      total_earnings_pln: 0,
      total_net_pln: 0,
      total_yield_kwh: 0,
      days_count: 0,
    };
  }

  const rows = (data ?? []) as Array<{
    yield_kwh: number | null;
    savings_pln: number | null;
    cost_pln: number | null;
    earnings_pln: number | null;
    net_balance_pln: number | null;
  }>;

  return rows.reduce(
    (acc, r) => ({
      total_savings_pln: acc.total_savings_pln + (Number(r.savings_pln) || 0),
      total_cost_pln: acc.total_cost_pln + (Number(r.cost_pln) || 0),
      total_earnings_pln: acc.total_earnings_pln + (Number(r.earnings_pln) || 0),
      total_net_pln: acc.total_net_pln + (Number(r.net_balance_pln) || 0),
      total_yield_kwh: acc.total_yield_kwh + (Number(r.yield_kwh) || 0),
      days_count: acc.days_count + 1,
    }),
    {
      total_savings_pln: 0,
      total_cost_pln: 0,
      total_earnings_pln: 0,
      total_net_pln: 0,
      total_yield_kwh: 0,
      days_count: 0,
    },
  );
}
