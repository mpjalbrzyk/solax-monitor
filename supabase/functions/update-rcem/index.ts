// Function: update-rcem
// Purpose: Fetch latest RCEm (Rynkowa Cena Energii Miesięczna) value from PSE,
//          append to tariffs.rcem_history JSONB for all active tariffs.
//          Source: https://www.pse.pl/oire/rcem-rynkowa-miesieczna-cena-energii-elektrycznej
// Schedule: 5th of month at 08:00 Europe/Warsaw (cron 0 8 5 * *) — to be enabled in Faza 6
// Status: NOT IMPLEMENTED — implementation lands in Faza 6.

import "@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((_req) => {
  return new Response(
    JSON.stringify({ status: "not_implemented", function: "update-rcem" }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
