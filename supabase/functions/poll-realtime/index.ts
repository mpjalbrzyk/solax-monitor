// Function: poll-realtime
// Purpose: Poll Solax /plant/realtime_data + /device/realtime_data (inverter + battery),
//          normalize sign conventions (api-spec sec 6), upsert into plant_realtime_readings
//          and device_realtime_readings.
// Schedule: every 5 minutes (cron */5 * * * *) — to be enabled in Faza 1
// Status: NOT IMPLEMENTED — implementation lands in Faza 1.

import "@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((_req) => {
  return new Response(
    JSON.stringify({ status: "not_implemented", function: "poll-realtime" }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
