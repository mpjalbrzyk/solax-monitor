// Function: monthly-digest
// Purpose: Send monthly summary email per user. Source: monthly_aggregates +
//          daily_aggregates plus YoY comparison (same month previous year).
// Schedule: 1st of month at 08:00 Europe/Warsaw (cron 0 8 1 * *) — to be enabled in Faza 6
// Status: NOT IMPLEMENTED — implementation lands in Faza 6.

import "@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((_req) => {
  return new Response(
    JSON.stringify({ status: "not_implemented", function: "monthly-digest" }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
