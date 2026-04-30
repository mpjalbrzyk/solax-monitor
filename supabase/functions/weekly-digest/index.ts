// Function: weekly-digest
// Purpose: Send weekly summary email per user. Two formats (decision O-002):
//          - active (Michał, brat): charts + numbers + breakdown
//          - passive (tata): 3-4 sentences prose + one key number
//          Source: daily_aggregates last 7 days. Sender: Resend.
// Schedule: every Monday at 07:00 Europe/Warsaw (cron 0 7 * * 1) — to be enabled in Faza 6
// Status: NOT IMPLEMENTED — implementation lands in Faza 6.

import "@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((_req) => {
  return new Response(
    JSON.stringify({ status: "not_implemented", function: "weekly-digest" }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
