// Function: poll-alarms
// Purpose: Poll Solax /alarm/page_alarm_info, upsert into inverter_alarms,
//          trigger send-alert for new alarm_level >= 2 events.
// Schedule: every 15 minutes (cron */15 * * * *) — to be enabled in Faza 1
// Status: NOT IMPLEMENTED — implementation lands in Faza 1.

import "@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((_req) => {
  return new Response(
    JSON.stringify({ status: "not_implemented", function: "poll-alarms" }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
