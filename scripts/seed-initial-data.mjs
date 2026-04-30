#!/usr/bin/env node
/**
 * Solax Monitor — initial seed (Faza 1, single-tenant bootstrap)
 *
 * Run once to create:
 *   1. auth user for Michał (mpjalbrzyk@gmail.com), email auto-confirmed
 *   2. user_inverters row for the X3-Hybrid-G4 installation in Ząbki
 *   3. api_credentials row with Solax Developer Portal client_id + client_secret
 *      (stored as plain text for now — RLS protects access; encryption-at-rest
 *      via pgcrypto/Vault deferred to Faza 7 multi-tenant polish)
 *
 * Idempotent: re-running picks up existing user/rows and updates if anything changed.
 *
 * Usage:
 *   node scripts/seed-initial-data.mjs
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

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;
const SOLAX_CLIENT_ID = env.SOLAX_CLIENT_ID;
const SOLAX_CLIENT_SECRET = env.SOLAX_CLIENT_SECRET;

if (!SUPABASE_URL || !SERVICE_ROLE || !SOLAX_CLIENT_ID || !SOLAX_CLIENT_SECRET) {
  console.error('Missing env vars in .env.local. Need NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SOLAX_CLIENT_ID, SOLAX_CLIENT_SECRET.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const USER_EMAIL = 'mpjalbrzyk@gmail.com';

const INVERTER = {
  solax_plant_id: '1613529907775754244',
  solax_inverter_sn: 'H34B10H7319017',
  solax_dongle_sn: 'SXTGG4YRYR',
  device_model: 14,
  plant_name: 'Legionow17 Site 1',
  pv_capacity_kwp: 8.0,
  battery_capacity_kwh: null,
  battery_model: null,
  installation_date: '2023-02-23',
  plant_timezone: 'Europe/Warsaw',
  plant_address: 'Legionów 17, 05-091 Ząbki',
  latitude: 52.2912,
  longitude: 21.1198,
  is_active: true,
};

const CREDS = {
  provider: 'solax_developer',
  app_code: 'b64c796a-d03d-4595-b54c-067908c615dc',
  client_id: SOLAX_CLIENT_ID,
  client_secret_encrypted: SOLAX_CLIENT_SECRET,
};

// PGE G11 tariff for the installation in Ząbki — see docs/context/06-tariff.md
// Verified against the real PGE invoice 03/2603/10663516/00000001 from March 2026.
const TARIFF = {
  effective_from: '2026-01-01',
  seller: 'PGE Obrót',
  tariff_code: 'G11',
  is_net_billing: true,
  zones: [
    {
      name: 'calodobowa',
      price_brutto_pln_kwh: 1.0991,
      hours: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
      days_of_week: [0, 1, 2, 3, 4, 5, 6],
    },
  ],
  fixed_handling_pln_month: 0.92,
  fixed_distribution_pln_month: 12.28,
  fixed_capacity_pln_month: 29.58,
  fixed_oze_pln_month: 0,
  fixed_other_pln_month: 0.41,
  rcem_history: [
    { month: '2023-01', price_pln_mwh: 596.56 },
    { month: '2023-02', price_pln_mwh: 668.51 },
    { month: '2023-03', price_pln_mwh: 508.90 },
    { month: '2023-04', price_pln_mwh: 505.44 },
    { month: '2023-05', price_pln_mwh: 381.44 },
    { month: '2023-06', price_pln_mwh: 454.62 },
    { month: '2023-07', price_pln_mwh: 439.22 },
    { month: '2023-08', price_pln_mwh: 412.33 },
    { month: '2023-09', price_pln_mwh: 404.82 },
    { month: '2023-10', price_pln_mwh: 329.25 },
    { month: '2023-11', price_pln_mwh: 378.97 },
    { month: '2023-12', price_pln_mwh: 304.63 },
    { month: '2025-07', price_pln_mwh: 284.83 },
    { month: '2025-08', price_pln_mwh: 214.68 },
    { month: '2025-09', price_pln_mwh: 279.71 },
    { month: '2025-10', price_pln_mwh: 340.84 },
    { month: '2025-11', price_pln_mwh: 382.88 },
    { month: '2025-12', price_pln_mwh: 466.08 },
    { month: '2026-01', price_pln_mwh: 551.96 },
    { month: '2026-02', price_pln_mwh: 339.01 },
  ],
};

// Historical yearly consumption from brother's spreadsheet — see 06-tariff.md sec 7
const HISTORICAL = [
  { year: 2015, consumption_from_grid_kwh: 5766, total_cost_brutto_pln: null, notes: 'arkusz brata' },
  { year: 2016, consumption_from_grid_kwh: 5731, total_cost_brutto_pln: null, notes: 'arkusz brata' },
  { year: 2017, consumption_from_grid_kwh: 6715, total_cost_brutto_pln: 4018, notes: 'arkusz brata' },
  { year: 2018, consumption_from_grid_kwh: 5508, total_cost_brutto_pln: 3330, notes: 'arkusz brata' },
  { year: 2019, consumption_from_grid_kwh: 6665, total_cost_brutto_pln: 3926, notes: 'arkusz brata' },
  { year: 2020, consumption_from_grid_kwh: 6151, total_cost_brutto_pln: 4017, notes: 'arkusz brata' },
  { year: 2021, consumption_from_grid_kwh: 6016, total_cost_brutto_pln: 4144, notes: 'arkusz brata' },
  { year: 2022, consumption_from_grid_kwh: 5122, total_cost_brutto_pln: 3736, notes: 'arkusz brata, ostatni rok przed PV' },
  { year: 2023, consumption_from_grid_kwh: 4073, total_cost_brutto_pln: 2727, notes: 'arkusz brata, PV od 23 lutego (net-billing)' },
  { year: 2025, consumption_from_grid_kwh: 4282, total_cost_brutto_pln: null, notes: 'z faktury PGE rocznej' },
];

async function main() {
  console.log('=== Solax Monitor — initial seed ===\n');

  // 1. User
  console.log('1. Looking up auth user…');
  const { data: usersList, error: listErr } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  if (listErr) throw listErr;

  let user = usersList.users.find((u) => u.email === USER_EMAIL);
  if (user) {
    console.log(`   already exists: ${user.id}`);
  } else {
    console.log(`   creating user ${USER_EMAIL}…`);
    const { data, error } = await supabase.auth.admin.createUser({
      email: USER_EMAIL,
      email_confirm: true,
    });
    if (error) throw error;
    user = data.user;
    console.log(`   created: ${user.id}`);
  }

  // 2. user_inverter
  console.log('\n2. Upserting user_inverter…');
  const { data: inverter, error: invErr } = await supabase
    .from('user_inverters')
    .upsert(
      { user_id: user.id, ...INVERTER },
      { onConflict: 'solax_plant_id', ignoreDuplicates: false },
    )
    .select('id, solax_plant_id, solax_inverter_sn')
    .single();
  if (invErr) throw invErr;
  console.log(`   id: ${inverter.id}`);
  console.log(`   plant: ${inverter.solax_plant_id}, inverter SN: ${inverter.solax_inverter_sn}`);

  // 3. api_credentials
  console.log('\n3. Upserting api_credentials (Solax)…');
  const { data: creds, error: credsErr } = await supabase
    .from('api_credentials')
    .upsert(
      { user_id: user.id, ...CREDS },
      { onConflict: 'user_id,provider', ignoreDuplicates: false },
    )
    .select('id, provider, client_id')
    .single();
  if (credsErr) throw credsErr;
  console.log(`   id: ${creds.id}`);
  console.log(`   provider: ${creds.provider}, client_id: ${creds.client_id}`);

  // 4. tariffs (PGE G11)
  console.log('\n4. Upserting tariff (PGE G11)…');
  // Find existing active tariff for this inverter (effective_to IS NULL)
  const { data: existingTariffs } = await supabase
    .from('tariffs')
    .select('id')
    .eq('inverter_id', inverter.id)
    .eq('seller', TARIFF.seller)
    .eq('tariff_code', TARIFF.tariff_code)
    .is('effective_to', null);

  if (existingTariffs && existingTariffs.length > 0) {
    const { error: updateErr } = await supabase
      .from('tariffs')
      .update({ user_id: user.id, ...TARIFF })
      .eq('id', existingTariffs[0].id);
    if (updateErr) throw updateErr;
    console.log(`   updated existing: ${existingTariffs[0].id}`);
  } else {
    const { data: newTariff, error: insertErr } = await supabase
      .from('tariffs')
      .insert({ user_id: user.id, inverter_id: inverter.id, ...TARIFF })
      .select('id')
      .single();
    if (insertErr) throw insertErr;
    console.log(`   inserted: ${newTariff.id}`);
  }

  // 5. historical_yearly_consumption
  console.log('\n5. Upserting historical_yearly_consumption…');
  const histRows = HISTORICAL.map((h) => ({ user_id: user.id, inverter_id: inverter.id, ...h }));
  const { error: histErr } = await supabase
    .from('historical_yearly_consumption')
    .upsert(histRows, { onConflict: 'inverter_id,year' });
  if (histErr) throw histErr;
  console.log(`   ${histRows.length} years (${HISTORICAL[0].year}–${HISTORICAL[HISTORICAL.length - 1].year})`);

  console.log('\n=== Seed complete ===');
  console.log(`user_id:     ${user.id}`);
  console.log(`inverter_id: ${inverter.id}`);
  console.log(`creds_id:    ${creds.id}`);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
