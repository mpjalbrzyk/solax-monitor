// Function: send-alert
// Purpose: Send immediate alert email when poll-alarms detects new alarm_level >= 2.
//          Triggered by poll-alarms via net.http_post (no cron).
//          Recipients: user_inverters.user_id email + shared viewers from a future
//          sharing table (Faza 7).
// Schedule: triggered (no cron)
// Status: NOT IMPLEMENTED — implementation lands in Faza 1 (alert path) /
//         Faza 6 (email template polish).

import "@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((_req) => {
  return new Response(
    JSON.stringify({ status: "not_implemented", function: "send-alert" }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
