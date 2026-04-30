#!/usr/bin/env node
/**
 * Solax Monitor — Faza 2 backfill (one-shot, idempotent)
 *
 * Imports 3 years of historical Solax data:
 *
 *   Phase A — monthly aggregates 2023-2025 (12 rows × 3 = 36)
 *     POST /openapi/v2/plant/energy/get_stat_data with dateType=1, date='YYYY'
 *     Target table: monthly_aggregates (UPSERT by inverter_id+month)
 *
 *   Phase B — daily aggregates 2026-01 .. current month (~120 rows)
 *     POST /openapi/v2/plant/energy/get_stat_data with dateType=2, date='YYYY-MM'
 *     Plus tariff math (06-tariff.md sec 6) for savings/cost/earnings/net.
 *     Target table: daily_aggregates (UPSERT by inverter_id+date)
 *
 * Re-running is safe: every write is upsert-keyed.
 *
 * Usage:
 *   node scripts/backfill-history.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env.local');
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    }),
);

const SOLAX_BASE_URL = env.SOLAX_BASE_URL ?? 'https://openapi-eu.solaxcloud.com';
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ----- Helpers --------------------------------------------------------------

function round2(n) {
  return n == null ? null : Math.round(n * 100) / 100;
}

function todayInWarsaw() {
  const fmt = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return fmt.format(new Date()); // YYYY-MM-DD
}

/**
 * Calls Solax stat_data. Returns { ok: true, records: [...] } on success,
 * { ok: false, code, message } on Solax-side rejection (out-of-range date,
 * missing data). Throws only on network errors and token expiry.
 *
 * Solax in practice rejects dates older than ~12 months with
 *   code 10200 PARAM_ERROR "The date must be within the past year"
 * even though the developer portal docs imply 3-year access. We handle that
 * gracefully (skip-and-log) instead of failing the whole backfill.
 */
async function fetchStatData(accessToken, plantId, dateType, date) {
  const response = await fetch(`${SOLAX_BASE_URL}/openapi/v2/plant/energy/get_stat_data`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ plantId, dateType, date, businessType: 1 }),
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text().catch(() => '')}`);
  }
  const data = await response.json();
  if (data.code === 10402) throw new Error('access_token expired (10402); run refresh-token first');
  if (data.code === 10000) return { ok: true, result: data.result };
  // Anything else is a soft failure — return so caller can decide
  return { ok: false, code: data.code, message: data.message ?? '' };
}

/** Solax stat_data response can wrap records in different keys; normalize to array. */
function unwrapRecords(result) {
  if (Array.isArray(result)) return result;
  if (result?.plantEnergyStatDataList) return result.plantEnergyStatDataList;
  if (result?.records) return result.records;
  if (result?.list) return result.list;
  // Sometimes Solax returns the array under a different key — log and bail visible
  console.warn('Unexpected stat_data result shape, dumping keys:', Object.keys(result ?? {}));
  return [];
}

// ----- Main -----------------------------------------------------------------

async function main() {
  console.log('=== Solax Monitor — Faza 2 backfill ===\n');

  // 1. Load active inverter + creds
  const { data: inv, error: invErr } = await supabase
    .from('user_inverters')
    .select('id, user_id, solax_plant_id, solax_inverter_sn, installation_date')
    .eq('is_active', true)
    .single();
  if (invErr) throw invErr;

  const { data: cred, error: credErr } = await supabase
    .from('api_credentials')
    .select('access_token_encrypted, expires_at')
    .eq('user_id', inv.user_id)
    .eq('provider', 'solax_developer')
    .single();
  if (credErr) throw credErr;
  if (!cred.access_token_encrypted) throw new Error('no access_token; run refresh-token first');

  const accessToken = cred.access_token_encrypted;
  const plantId = inv.solax_plant_id;
  console.log(`Inverter:    ${inv.id}`);
  console.log(`Plant:       ${plantId}`);
  console.log(`Token until: ${cred.expires_at}\n`);

  // 2. Load tariff for daily-aggregates pln math
  const { data: tariff, error: tariffErr } = await supabase
    .from('tariffs')
    .select('id, zones, rcem_history')
    .eq('inverter_id', inv.id)
    .order('effective_from', { ascending: false })
    .limit(1)
    .single();
  if (tariffErr) throw tariffErr;
  const pricePerKwh = tariff.zones[0].price_brutto_pln_kwh;
  console.log(`Tariff: ${pricePerKwh} PLN/kWh brutto, ${tariff.rcem_history?.length ?? 0} RCEm months\n`);

  // ============================================================
  // Phase A — monthly aggregates (only what Solax allows: ~past 12 months)
  // ============================================================
  console.log('--- Phase A: monthly (annual aggregations) ---');
  console.log('Solax limits dateType=1 to "past year" so we expect 2023/2024 to fail.');
  let monthlyRows = 0;
  let firstSampleLogged = false;

  for (const year of ['2023', '2024', '2025', '2026']) {
    const r = await fetchStatData(accessToken, plantId, 1, year);
    if (!r.ok) {
      console.log(`  ${year}: SKIPPED (Solax code ${r.code}: ${r.message})`);
      continue;
    }
    const records = unwrapRecords(r.result);

    if (!firstSampleLogged && records.length > 0) {
      console.log(`  Sample record (${year}):`, JSON.stringify(records[0]));
      firstSampleLogged = true;
    }

    const rows = records
      .filter((rec) => rec.date)
      .map((rec) => {
        const monthStr = String(rec.date).length === 7 ? `${rec.date}-01` : String(rec.date).slice(0, 10);
        return {
          user_id: inv.user_id,
          inverter_id: inv.id,
          month: monthStr,
          pv_generation_kwh: round2(rec.pvGeneration),
          inverter_ac_output_kwh: round2(rec.inverterACOutputEnergy),
          export_energy_kwh: round2(rec.exportEnergy),
          import_energy_kwh: round2(rec.importEnergy),
          load_consumption_kwh: round2(rec.loadConsumption),
          battery_charged_kwh: round2(rec.batteryCharged),
          battery_discharged_kwh: round2(rec.batteryDischarged),
          earnings: round2(rec.earnings),
        };
      });

    if (rows.length === 0) {
      console.log(`  ${year}: no records`);
      continue;
    }

    const { error } = await supabase.from('monthly_aggregates').upsert(rows, {
      onConflict: 'inverter_id,month',
    });
    if (error) throw new Error(`monthly upsert ${year}: ${error.message}`);
    monthlyRows += rows.length;
    console.log(`  ${year}: ${rows.length} months upserted`);
  }
  console.log(`Phase A total: ${monthlyRows} monthly rows\n`);

  // ============================================================
  // Phase B — daily aggregates for the past ~12 months (Solax limit)
  // We try a generous window: every month from May 2025 through current month.
  // Months Solax rejects are skipped with a log.
  // ============================================================
  console.log('--- Phase B: daily (monthly breakdowns) ---');
  const today = todayInWarsaw();
  const [yToday, mToday] = today.slice(0, 7).split('-').map(Number);
  // Past 12 months: start from same month one year ago
  const targetMonths = [];
  let y = yToday - 1;
  let m = mToday;
  while (true) {
    targetMonths.push(`${y}-${String(m).padStart(2, '0')}`);
    if (y === yToday && m === mToday) break;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  console.log(`Months in scope: ${targetMonths[0]} → ${targetMonths[targetMonths.length - 1]} (${targetMonths.length} months)`);

  let dailyRows = 0;
  let firstDailySampleLogged = false;

  for (const month of targetMonths) {
    const r = await fetchStatData(accessToken, plantId, 2, month);
    if (!r.ok) {
      console.log(`  ${month}: SKIPPED (Solax code ${r.code}: ${r.message})`);
      continue;
    }
    const records = unwrapRecords(r.result);

    if (!firstDailySampleLogged && records.length > 0) {
      console.log(`  Sample record (${month}):`, JSON.stringify(records[0]));
      firstDailySampleLogged = true;
    }

    const rows = records
      .filter((rec) => rec.date)
      .map((rec) => {
        const date = String(rec.date).slice(0, 10);
        const yieldKwh = rec.pvGeneration ?? 0;
        const importKwh = rec.importEnergy ?? 0;
        const exportKwh = rec.exportEnergy ?? 0;
        const consumption = rec.loadConsumption ?? 0;
        const batteryCharged = rec.batteryCharged ?? 0;
        const batteryDischarged = rec.batteryDischarged ?? 0;
        const selfUseKwh = Math.max(yieldKwh - exportKwh, 0);
        const selfUseRatePct = yieldKwh > 0 ? (selfUseKwh / yieldKwh) * 100 : null;

        // Apply tariff (G11 single-zone). RCEm history covers some months only;
        // missing months → earnings_pln = 0.
        const monthStr = date.slice(0, 7);
        const rcemEntry = tariff.rcem_history?.find((entry) => entry.month === monthStr);
        const rcemPerKwh = rcemEntry ? rcemEntry.price_pln_mwh / 1000 : 0;

        const savingsPln = selfUseKwh * pricePerKwh;
        const costPln = importKwh * pricePerKwh;
        const earningsPln = exportKwh * rcemPerKwh;
        const netBalancePln = savingsPln + earningsPln - costPln;

        return {
          user_id: inv.user_id,
          inverter_id: inv.id,
          date,
          yield_kwh: round2(yieldKwh),
          consumption_kwh: round2(consumption),
          import_kwh: round2(importKwh),
          export_kwh: round2(exportKwh),
          battery_charged_kwh: round2(batteryCharged),
          battery_discharged_kwh: round2(batteryDischarged),
          self_use_kwh: round2(selfUseKwh),
          self_use_rate_pct: selfUseRatePct == null ? null : round2(selfUseRatePct),
          savings_pln: round2(savingsPln),
          cost_pln: round2(costPln),
          earnings_pln: round2(earningsPln),
          net_balance_pln: round2(netBalancePln),
        };
      });

    if (rows.length === 0) {
      console.log(`  ${month}: no records`);
      continue;
    }

    const { error } = await supabase.from('daily_aggregates').upsert(rows, {
      onConflict: 'inverter_id,date',
    });
    if (error) throw new Error(`daily upsert ${month}: ${error.message}`);
    dailyRows += rows.length;
    console.log(`  ${month}: ${rows.length} days upserted`);
  }
  console.log(`Phase B total: ${dailyRows} daily rows\n`);

  // ============================================================
  // Sanity check summary
  // ============================================================
  console.log('--- Sanity check ---');

  const { data: yearlyTotals } = await supabase
    .from('monthly_aggregates')
    .select('month, pv_generation_kwh, export_energy_kwh, import_energy_kwh, load_consumption_kwh')
    .eq('inverter_id', inv.id);

  const byYear = {};
  for (const row of yearlyTotals ?? []) {
    const year = row.month.slice(0, 4);
    if (!byYear[year]) byYear[year] = { pv: 0, exp: 0, imp: 0, load: 0 };
    byYear[year].pv += row.pv_generation_kwh ?? 0;
    byYear[year].exp += row.export_energy_kwh ?? 0;
    byYear[year].imp += row.import_energy_kwh ?? 0;
    byYear[year].load += row.load_consumption_kwh ?? 0;
  }

  console.log('Yearly totals (kWh):');
  console.log('  Year | PV gen | Export | Import | Load');
  for (const year of Object.keys(byYear).sort()) {
    const t = byYear[year];
    console.log(`  ${year} | ${Math.round(t.pv).toString().padStart(6)} | ${Math.round(t.exp).toString().padStart(6)} | ${Math.round(t.imp).toString().padStart(6)} | ${Math.round(t.load).toString().padStart(6)}`);
  }

  const lifetimePv = Object.values(byYear).reduce((s, t) => s + t.pv, 0);
  console.log(`\nLifetime PV from monthly aggregates: ${Math.round(lifetimePv)} kWh`);
  console.log(`(plant_realtime_readings.total_yield reports ~17717 kWh)`);

  const { data: dailyFinancial } = await supabase
    .from('daily_aggregates')
    .select('savings_pln, cost_pln, earnings_pln, net_balance_pln')
    .eq('inverter_id', inv.id)
    .gte('date', '2026-01-01');

  const lifetime2026 = (dailyFinancial ?? []).reduce(
    (acc, r) => ({
      savings: acc.savings + (r.savings_pln ?? 0),
      cost: acc.cost + (r.cost_pln ?? 0),
      earnings: acc.earnings + (r.earnings_pln ?? 0),
      net: acc.net + (r.net_balance_pln ?? 0),
    }),
    { savings: 0, cost: 0, earnings: 0, net: 0 },
  );

  console.log('\n2026 financials (PLN, brutto):');
  console.log(`  Savings (autoconsumption × G11): ${lifetime2026.savings.toFixed(2)}`);
  console.log(`  Cost (grid imports × G11):       ${lifetime2026.cost.toFixed(2)}`);
  console.log(`  Earnings (exports × RCEm):       ${lifetime2026.earnings.toFixed(2)}`);
  console.log(`  Net balance:                     ${lifetime2026.net.toFixed(2)}`);

  console.log('\n=== Backfill complete ===');
}

main().catch((e) => {
  console.error('Backfill failed:', e);
  process.exit(1);
});
