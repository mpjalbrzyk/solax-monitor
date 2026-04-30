// Function: daily-aggregates
// Purpose: Build daily_aggregates rows for previous day per inverter:
//          - aggregate plant_realtime_readings (yield, import, export)
//          - integrate device_realtime_readings.charge_discharge_power for battery flow
//            (api-spec sec 9 — battery not registered, computed by us)
//          - apply tariff (06-tariff.md sec 6 algorithm) for savings_pln/cost_pln/earnings_pln/net_balance_pln
// Schedule: daily at 01:00 Europe/Warsaw (cron 0 1 * * *) — to be enabled in Faza 1
// Status: NOT IMPLEMENTED — implementation lands in Faza 1.

import "@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((_req) => {
  return new Response(
    JSON.stringify({ status: "not_implemented", function: "daily-aggregates" }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
