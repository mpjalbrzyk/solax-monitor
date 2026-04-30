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

  console.log('\n=== Seed complete ===');
  console.log(`user_id:     ${user.id}`);
  console.log(`inverter_id: ${inverter.id}`);
  console.log(`creds_id:    ${creds.id}`);
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
