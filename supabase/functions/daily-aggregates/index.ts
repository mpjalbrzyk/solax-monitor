// Function: daily-aggregates
// Purpose: For every active user_inverter, compute one daily_aggregates row
//          per inverter for the target date (default: yesterday in Europe/Warsaw).
//
// Sources:
//   - plant_realtime_readings  → daily yield, import, export (cumulative, take MAX over day)
//   - device_realtime_readings → battery charge/discharge integrated from
//                                charge_discharge_power_w samples (api-spec sec 9)
//                              → peak production + peak consumption from inverter rows
//   - tariffs (active for date) + 06-tariff.md sec 6 algorithm:
//                                 savings_pln, cost_pln, earnings_pln, net_balance_pln
//
// Schedule: daily 01:00 Europe/Warsaw (cron 0 1 * * *) — to be enabled in Commit 9.
//
// Optional POST body:
//   { "date": "YYYY-MM-DD" }      → run for that specific local date
//   { "inverter_id": "uuid" }     → restrict to one inverter
// Both are optional. Default: every active inverter, yesterday.

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

interface UserInverter {
  id: string;
  user_id: string;
}

interface PlantRow {
  daily_yield_kwh: number | null;
  daily_imported_kwh: number | null;
  daily_exported_kwh: number | null;
  plant_local_time: string | null;
}

interface DeviceRow {
  device_type: number;
  charge_discharge_power_w: number | null;
  total_active_power_w: number | null;
  plant_local_time: string | null;
}

interface TariffZone {
  name: string;
  price_brutto_pln_kwh: number;
  hours: number[];
  days_of_week: number[];
}

interface RcemEntry {
  month: string;
  price_pln_mwh: number;
}

interface Tariff {
  id: string;
  zones: TariffZone[];
  rcem_history: RcemEntry[] | null;
  effective_from: string;
  effective_to: string | null;
}

interface AggregationResult {
  yield_kwh: number;
  consumption_kwh: number;
  import_kwh: number;
  export_kwh: number;
  battery_charged_kwh: number;
  battery_discharged_kwh: number;
  self_use_kwh: number;
  self_use_rate_pct: number | null;
  savings_pln: number;
  cost_pln: number;
  earnings_pln: number;
  net_balance_pln: number;
  peak_production_w: number | null;
  peak_consumption_w: number | null;
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let body: { date?: string; inverter_id?: string } = {};
  if (req.headers.get("content-type")?.includes("application/json")) {
    body = await req.json().catch(() => ({}));
  }

  const targetDate = body.date ?? yesterdayInWarsaw();

  let query = supabase.from("user_inverters").select("id, user_id").eq("is_active", true);
  if (body.inverter_id) query = query.eq("id", body.inverter_id);

  const { data: inverters, error: invError } = await query;
  if (invError) return jsonResponse({ ok: false, error: `select inverters: ${invError.message}` }, 500);
  if (!inverters || inverters.length === 0) {
    return jsonResponse({ ok: true, aggregated: 0, message: "no inverters" });
  }

  const outcomes: Array<{ inverter_id: string; user_id: string; date: string; status: "ok" | "failed" | "skipped"; details?: AggregationResult; error?: string }> = [];

  for (const inv of inverters as UserInverter[]) {
    try {
      const result = await aggregateForDate(supabase, inv, targetDate);
      if (result === null) {
        outcomes.push({ inverter_id: inv.id, user_id: inv.user_id, date: targetDate, status: "skipped", error: "no plant readings for date" });
      } else {
        outcomes.push({ inverter_id: inv.id, user_id: inv.user_id, date: targetDate, status: "ok", details: result });
      }
    } catch (err) {
      outcomes.push({
        inverter_id: inv.id,
        user_id: inv.user_id,
        date: targetDate,
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const failed = outcomes.filter((o) => o.status === "failed").length;
  return jsonResponse({ ok: failed === 0, date: targetDate, outcomes }, failed === 0 ? 200 : 207);
});

async function aggregateForDate(
  supabase: SupabaseClient,
  inv: UserInverter,
  dateStr: string,
): Promise<AggregationResult | null> {
  // Plant readings for the local day (filter on plant_local_time which is TIMESTAMP without TZ)
  const dayStart = `${dateStr}T00:00:00`;
  const dayEnd = `${dateStr}T23:59:59.999`;

  const { data: plantRows, error: plantErr } = await supabase
    .from("plant_realtime_readings")
    .select("daily_yield_kwh, daily_imported_kwh, daily_exported_kwh, plant_local_time")
    .eq("inverter_id", inv.id)
    .gte("plant_local_time", dayStart)
    .lte("plant_local_time", dayEnd)
    .order("plant_local_time", { ascending: true });

  if (plantErr) throw new Error(`select plant_realtime_readings: ${plantErr.message}`);
  if (!plantRows || plantRows.length === 0) return null;

  // Cumulative-of-day metrics: take the maximum observed value during the day.
  const yieldKwh = maxField(plantRows as PlantRow[], "daily_yield_kwh") ?? 0;
  const importKwh = maxField(plantRows as PlantRow[], "daily_imported_kwh") ?? 0;
  const exportKwh = maxField(plantRows as PlantRow[], "daily_exported_kwh") ?? 0;

  // Battery flow integrated from device readings (api-spec sec 9).
  const { data: deviceRows, error: deviceErr } = await supabase
    .from("device_realtime_readings")
    .select("device_type, charge_discharge_power_w, total_active_power_w, plant_local_time")
    .eq("inverter_id", inv.id)
    .gte("plant_local_time", dayStart)
    .lte("plant_local_time", dayEnd)
    .order("plant_local_time", { ascending: true });

  if (deviceErr) throw new Error(`select device_realtime_readings: ${deviceErr.message}`);

  const { batteryChargedKwh, batteryDischargedKwh, peakProductionW } = integrateDeviceRows(
    (deviceRows ?? []) as DeviceRow[],
  );

  // Consumption (load): yield - export + import + battery_discharged - battery_charged
  // (energy that actually reached the house = self-used PV + grid imports + battery discharged - battery charged)
  // self_use is yield minus what we sent out the door.
  const selfUseKwh = Math.max(yieldKwh - exportKwh, 0);
  const consumptionKwh = selfUseKwh + importKwh + batteryDischargedKwh - batteryChargedKwh;
  const peakConsumptionW = peakProductionW; // approximation; will refine in Faza 3 with proper meter integration

  // Tariff lookup
  const { data: tariff, error: tariffErr } = await supabase
    .from("tariffs")
    .select("id, zones, rcem_history, effective_from, effective_to")
    .eq("inverter_id", inv.id)
    .lte("effective_from", dateStr)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle<Tariff>();

  if (tariffErr) throw new Error(`select tariff: ${tariffErr.message}`);

  const { savingsPln, costPln, earningsPln, netBalancePln } = applyTariff(
    tariff ?? null,
    dateStr,
    selfUseKwh,
    importKwh,
    exportKwh,
  );

  const result: AggregationResult = {
    yield_kwh: round2(yieldKwh),
    consumption_kwh: round2(consumptionKwh),
    import_kwh: round2(importKwh),
    export_kwh: round2(exportKwh),
    battery_charged_kwh: round2(batteryChargedKwh),
    battery_discharged_kwh: round2(batteryDischargedKwh),
    self_use_kwh: round2(selfUseKwh),
    self_use_rate_pct: yieldKwh > 0 ? round2((selfUseKwh / yieldKwh) * 100) : null,
    savings_pln: round2(savingsPln),
    cost_pln: round2(costPln),
    earnings_pln: round2(earningsPln),
    net_balance_pln: round2(netBalancePln),
    peak_production_w: peakProductionW,
    peak_consumption_w: peakConsumptionW,
  };

  const { error: upsertErr } = await supabase.from("daily_aggregates").upsert(
    {
      user_id: inv.user_id,
      inverter_id: inv.id,
      date: dateStr,
      ...result,
    },
    { onConflict: "inverter_id,date" },
  );
  if (upsertErr) throw new Error(`upsert daily_aggregates: ${upsertErr.message}`);

  return result;
}

// ----- Helpers -------------------------------------------------------------

function integrateDeviceRows(rows: DeviceRow[]): {
  batteryChargedKwh: number;
  batteryDischargedKwh: number;
  peakProductionW: number | null;
} {
  // Battery flow: integrate charge_discharge_power_w (W) over time.
  // Each sample represents the instant; we approximate with 5-minute intervals
  // (the actual cron cadence). Power × hours = energy in Wh; / 1000 → kWh.
  const SAMPLE_HOURS = 5 / 60;

  const batterySamples = rows.filter((r) => r.device_type === 2 && r.charge_discharge_power_w != null);
  let chargedWh = 0;
  let dischargedWh = 0;

  for (const sample of batterySamples) {
    const power = sample.charge_discharge_power_w as number;
    // House convention after normalizeBatteryPower: positive = discharging, negative = charging
    if (power > 0) dischargedWh += power * SAMPLE_HOURS;
    else if (power < 0) chargedWh += -power * SAMPLE_HOURS;
  }

  const inverterSamples = rows.filter((r) => r.device_type === 1 && r.total_active_power_w != null);
  const peakProductionW =
    inverterSamples.length > 0
      ? Math.max(...inverterSamples.map((s) => Math.max(s.total_active_power_w as number, 0)))
      : null;

  return {
    batteryChargedKwh: chargedWh / 1000,
    batteryDischargedKwh: dischargedWh / 1000,
    peakProductionW,
  };
}

function applyTariff(
  tariff: Tariff | null,
  dateStr: string,
  selfUseKwh: number,
  importKwh: number,
  exportKwh: number,
): { savingsPln: number; costPln: number; earningsPln: number; netBalancePln: number } {
  if (!tariff || !tariff.zones || tariff.zones.length === 0) {
    return { savingsPln: 0, costPln: 0, earningsPln: 0, netBalancePln: 0 };
  }

  // For G11 there's a single zone covering all hours.
  // For G12/G12w we'd need hourly attribution; deferred until we have a hourly tariff.
  const pricePerKwh = tariff.zones[0].price_brutto_pln_kwh;

  const savingsPln = selfUseKwh * pricePerKwh;
  const costPln = importKwh * pricePerKwh;

  const monthStr = dateStr.slice(0, 7); // YYYY-MM
  const rcemEntry = tariff.rcem_history?.find((r) => r.month === monthStr);
  const rcemPerKwh = rcemEntry ? rcemEntry.price_pln_mwh / 1000 : 0;
  const earningsPln = exportKwh * rcemPerKwh;

  return {
    savingsPln,
    costPln,
    earningsPln,
    netBalancePln: savingsPln + earningsPln - costPln,
  };
}

function maxField<T>(rows: T[], field: keyof T): number | null {
  let max: number | null = null;
  for (const row of rows) {
    const v = row[field] as unknown as number | null;
    if (v == null) continue;
    if (max == null || v > max) max = v;
  }
  return max;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function yesterdayInWarsaw(): string {
  // Approximate: take current Warsaw local date (as if browser were in Warsaw)
  // and subtract one day. Edge-case DST transition error is at most 1 hour,
  // which doesn't affect a daily date.
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Warsaw",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayStr = fmt.format(now); // sv-SE locale gives "YYYY-MM-DD"
  const today = new Date(`${todayStr}T00:00:00Z`);
  today.setUTCDate(today.getUTCDate() - 1);
  return today.toISOString().slice(0, 10);
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
