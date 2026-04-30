// Function: poll-realtime
// Purpose: For every active user_inverter, hit Solax three endpoints
//          (plant/realtime_data, device/realtime_data deviceType=1 inverter,
//          deviceType=2 battery via requestSnType=1), normalize sign conventions
//          (api-spec sec 6), insert into plant_realtime_readings and
//          device_realtime_readings (one row per device).
//
// Schedule: every 5 minutes (cron */5 * * * *) — to be enabled in Commit 9.
//
// Multi-tenant from day one: iterates inverters and credentials independently.
// Per-inverter error isolation: one failure does not block the rest.

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";
import {
  type ApiCredentialRow,
  normalizeBatteryPower,
  passThroughPower,
  solaxFetch,
} from "../_shared/solax-client.ts";

interface UserInverter {
  id: string;
  user_id: string;
  solax_plant_id: string;
  solax_inverter_sn: string;
}

interface PollOutcome {
  inverter_id: string;
  user_id: string;
  status: "ok" | "failed";
  error?: string;
}

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: inverters, error: invError } = await supabase
    .from("user_inverters")
    .select("id, user_id, solax_plant_id, solax_inverter_sn")
    .eq("is_active", true);

  if (invError) return jsonResponse({ ok: false, error: `select inverters: ${invError.message}` }, 500);
  if (!inverters || inverters.length === 0) {
    return jsonResponse({ ok: true, polled: 0, message: "no active inverters" });
  }

  const outcomes: PollOutcome[] = [];

  for (const inv of inverters as UserInverter[]) {
    try {
      await pollOneInverter(supabase, inv);
      outcomes.push({ inverter_id: inv.id, user_id: inv.user_id, status: "ok" });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      outcomes.push({ inverter_id: inv.id, user_id: inv.user_id, status: "failed", error: message });
      console.error(`poll-realtime failed for inverter ${inv.id}:`, message);
    }
  }

  const polled = outcomes.filter((o) => o.status === "ok").length;
  const failed = outcomes.filter((o) => o.status === "failed").length;

  return jsonResponse({ ok: failed === 0, polled, failed, outcomes }, failed === 0 ? 200 : 207);
});

async function pollOneInverter(supabase: SupabaseClient, inv: UserInverter): Promise<void> {
  const { data: cred, error: credError } = await supabase
    .from("api_credentials")
    .select(
      "id, user_id, client_id, client_secret_encrypted, access_token_encrypted, expires_at",
    )
    .eq("user_id", inv.user_id)
    .eq("provider", "solax_developer")
    .single<ApiCredentialRow>();

  if (credError || !cred) {
    throw new Error(`no Solax credentials for user_id ${inv.user_id}`);
  }

  const recordedAt = new Date().toISOString();

  // Three Solax calls in parallel. solaxFetch handles 10402 token expiry transparently.
  const [plantData, inverterArray, batteryArray] = await Promise.all([
    solaxFetch<PlantRealtime>(supabase, cred, "/openapi/v2/plant/realtime_data", {
      plantId: inv.solax_plant_id,
      businessType: "1",
    }),
    solaxFetch<DeviceRealtime[]>(supabase, cred, "/openapi/v2/device/realtime_data", {
      snList: inv.solax_inverter_sn,
      deviceType: "1",
      businessType: "1",
    }),
    solaxFetch<DeviceRealtime[]>(supabase, cred, "/openapi/v2/device/realtime_data", {
      snList: inv.solax_inverter_sn,
      deviceType: "2",
      requestSnType: "1",
      businessType: "1",
    }),
  ]);

  const inverterData = inverterArray?.[0];
  const batteryData = batteryArray?.[0];

  // Plant snapshot
  const { error: plantError } = await supabase.from("plant_realtime_readings").insert({
    user_id: inv.user_id,
    inverter_id: inv.id,
    recorded_at: recordedAt,
    plant_local_time: plantData.plantLocalTime ?? null,
    daily_yield_kwh: plantData.dailyYield ?? null,
    total_yield_kwh: plantData.totalYield ?? null,
    daily_charged_kwh: plantData.dailyCharged ?? null,
    total_charged_kwh: plantData.totalCharged ?? null,
    daily_discharged_kwh: plantData.dailyDischarged ?? null,
    total_discharged_kwh: plantData.totalDischarged ?? null,
    daily_imported_kwh: plantData.dailyImported ?? null,
    total_imported_kwh: plantData.totalImported ?? null,
    daily_exported_kwh: plantData.dailyExported ?? null,
    total_exported_kwh: plantData.totalExported ?? null,
    daily_earnings: plantData.dailyEarnings ?? null,
    total_earnings: plantData.totalEarnings ?? null,
    raw_response: plantData,
  });
  if (plantError) throw new Error(`plant insert: ${plantError.message}`);

  // Inverter device snapshot — defensive against nulls and Waiting-state empty maps
  if (inverterData) {
    const inverterRow = mapInverterRow(inv, inverterData, recordedAt);
    const { error: invErr } = await supabase.from("device_realtime_readings").insert(inverterRow);
    if (invErr) throw new Error(`inverter device insert: ${invErr.message}`);
  }

  // Battery device snapshot — deviceSn is always empty (api-spec sec 7.1)
  if (batteryData) {
    const batteryRow = mapBatteryRow(inv, batteryData, recordedAt);
    const { error: batErr } = await supabase.from("device_realtime_readings").insert(batteryRow);
    if (batErr) throw new Error(`battery device insert: ${batErr.message}`);
  }

  await supabase
    .from("user_inverters")
    .update({ last_polled_at: recordedAt })
    .eq("id", inv.id);
}

// ----- Row mapping ---------------------------------------------------------

function mapInverterRow(inv: UserInverter, d: DeviceRealtime, recordedAt: string) {
  return {
    user_id: inv.user_id,
    inverter_id: inv.id,
    device_type: 1,
    device_sn: d.deviceSn ?? inv.solax_inverter_sn,
    recorded_at: recordedAt,
    plant_local_time: d.plantLocalTime ?? null,
    device_status: d.deviceStatus ?? null,

    ac_voltage_l1: d.acVoltage1 ?? null,
    ac_voltage_l2: d.acVoltage2 ?? null,
    ac_voltage_l3: d.acVoltage3 ?? null,
    ac_current_l1: d.acCurrent1 ?? null,
    ac_current_l2: d.acCurrent2 ?? null,
    ac_current_l3: d.acCurrent3 ?? null,
    ac_power_l1_w: d.acPower1 ?? null,
    ac_power_l2_w: d.acPower2 ?? null,
    ac_power_l3_w: d.acPower3 ?? null,
    ac_frequency_l1: d.acFrequency1 ?? null,
    ac_frequency_l2: d.acFrequency2 ?? null,
    ac_frequency_l3: d.acFrequency3 ?? null,
    grid_frequency: d.gridFrequency ?? null,
    total_active_power_w: passThroughPower(d.totalActivePower),
    total_reactive_power_var: d.totalReactivePower ?? null,
    total_power_factor: d.totalPowerFactor ?? null,
    inverter_temperature_c: d.inverterTemperature ?? null,
    daily_yield_kwh: d.dailyYield ?? null,
    total_yield_kwh: d.totalYield ?? null,
    daily_ac_output_kwh: d.dailyACOutput ?? null,
    total_ac_output_kwh: d.totalACOutput ?? null,
    mppt_total_input_power_w: d.MPPTTotalInputPower ?? null,

    grid_power_w: passThroughPower(d.gridPower),
    today_import_energy_kwh: d.todayImportEnergy ?? null,
    total_import_energy_kwh: d.totalImportEnergy ?? null,
    today_export_energy_kwh: d.todayExportEnergy ?? null,
    total_export_energy_kwh: d.totalExportEnergy ?? null,
    grid_power_m2_w: passThroughPower(d.gridPowerM2),
    today_import_energy_m2_kwh: d.todayImportEnergyM2 ?? null,
    total_import_energy_m2_kwh: d.totalImportEnergyM2 ?? null,
    today_export_energy_m2_kwh: d.todayExportEnergyM2 ?? null,
    total_export_energy_m2_kwh: d.totalExportEnergyM2 ?? null,

    // pvMap can be {} when deviceStatus=100 (Waiting); store as-is including empty object
    mppt_data: d.mpptMap ?? null,
    pv_data: d.pvMap ?? null,

    eps_l1_voltage: d.EPSL1Voltage ?? null,
    eps_l1_current: d.EPSL1Current ?? null,
    eps_l1_active_power_w: d.EPSL1ActivePower ?? null,
    eps_l2_voltage: d.EPSL2Voltage ?? null,
    eps_l2_current: d.EPSL2Current ?? null,
    eps_l2_active_power_w: d.EPSL2ActivePower ?? null,
    eps_l3_voltage: d.EPSL3Voltage ?? null,
    eps_l3_current: d.EPSL3Current ?? null,
    eps_l3_active_power_w: d.EPSL3ActivePower ?? null,
    eps_l1_apparent_power_va: d.EPSL1ApparentPower ?? null,
    eps_l2_apparent_power_va: d.EPSL2ApparentPower ?? null,
    eps_l3_apparent_power_va: d.EPSL3ApparentPower ?? null,

    l1l2_voltage: d.l1l2Voltage ?? null,
    l2l3_voltage: d.l2l3Voltage ?? null,
    l1l3_voltage: d.l1l3Voltage ?? null,

    raw_response: d,
  };
}

function mapBatteryRow(inv: UserInverter, d: DeviceRealtime, recordedAt: string) {
  return {
    user_id: inv.user_id,
    inverter_id: inv.id,
    device_type: 2,
    // Battery has empty deviceSn in API responses (api-spec sec 7.1)
    device_sn: d.deviceSn || null,
    recorded_at: recordedAt,
    plant_local_time: d.plantLocalTime ?? null,
    device_status: d.deviceStatus ?? null,

    battery_soc_pct: d.batterySOC ?? null,
    battery_remainings_kwh: d.batteryRemainings ?? null,
    battery_soh_pct: d.batterySOH ?? null,
    charge_discharge_power_w: normalizeBatteryPower(d.chargeDischargePower),
    battery_voltage_v: d.batteryVoltage ?? null,
    battery_current_a: d.batteryCurrent ?? null,
    battery_temperature_c: d.batteryTemperature ?? null,
    battery_cycle_times: d.batteryCycleTimes ?? null,
    total_charge_kwh: d.totalDeviceCharge ?? null,
    total_discharge_kwh: d.totalDeviceDischarge ?? null,

    raw_response: d,
  };
}

// ----- Solax response shapes (only the fields we care about) ---------------

interface PlantRealtime {
  plantLocalTime?: string;
  dailyYield?: number;
  totalYield?: number;
  dailyCharged?: number;
  totalCharged?: number;
  dailyDischarged?: number;
  totalDischarged?: number;
  dailyImported?: number;
  totalImported?: number;
  dailyExported?: number;
  totalExported?: number;
  dailyEarnings?: number;
  totalEarnings?: number;
  [k: string]: unknown;
}

interface DeviceRealtime {
  deviceSn?: string;
  deviceStatus?: number;
  plantLocalTime?: string;
  dataTime?: string;

  // Inverter AC
  acVoltage1?: number; acVoltage2?: number; acVoltage3?: number;
  acCurrent1?: number; acCurrent2?: number; acCurrent3?: number;
  acPower1?: number; acPower2?: number; acPower3?: number;
  acFrequency1?: number; acFrequency2?: number; acFrequency3?: number;
  gridFrequency?: number | null;
  totalActivePower?: number;
  totalReactivePower?: number;
  totalPowerFactor?: number;
  inverterTemperature?: number;
  dailyYield?: number; totalYield?: number;
  dailyACOutput?: number; totalACOutput?: number;
  MPPTTotalInputPower?: number | null;

  // Grid / meter
  gridPower?: number;
  todayImportEnergy?: number; totalImportEnergy?: number;
  todayExportEnergy?: number; totalExportEnergy?: number;
  gridPowerM2?: number;
  todayImportEnergyM2?: number; totalImportEnergyM2?: number;
  todayExportEnergyM2?: number; totalExportEnergyM2?: number;

  // Strings
  mpptMap?: Record<string, number>;
  pvMap?: Record<string, number>;

  // EPS
  EPSL1Voltage?: number; EPSL1Current?: number; EPSL1ActivePower?: number;
  EPSL2Voltage?: number; EPSL2Current?: number; EPSL2ActivePower?: number;
  EPSL3Voltage?: number; EPSL3Current?: number; EPSL3ActivePower?: number;
  EPSL1ApparentPower?: number; EPSL2ApparentPower?: number; EPSL3ApparentPower?: number;

  // Line-to-line
  l1l2Voltage?: number | null;
  l2l3Voltage?: number | null;
  l1l3Voltage?: number | null;

  // Battery
  batterySOC?: number;
  batterySOH?: number;
  batteryRemainings?: number;
  chargeDischargePower?: number;
  batteryVoltage?: number;
  batteryCurrent?: number;
  batteryTemperature?: number;
  batteryCycleTimes?: number;
  totalDeviceCharge?: number;
  totalDeviceDischarge?: number;

  [k: string]: unknown;
}

// ----- Helpers -------------------------------------------------------------

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
