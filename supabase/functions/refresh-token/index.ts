// Function: refresh-token
// Purpose: Refresh Solax OAuth access_token (TTL 30 days) via POST to
//          /openapi/auth/oauth/token, update api_credentials with new token.
//          NOTE: auth endpoint returns code: 0 on success, NOT 10000 (api-spec sec 4.1).
// Schedule: every 25 days at 03:00 UTC (cron 0 3 */25 * *) — to be enabled in Faza 1
// Status: NOT IMPLEMENTED — implementation lands in Faza 1.

import "@supabase/functions-js/edge-runtime.d.ts";

Deno.serve((_req) => {
  return new Response(
    JSON.stringify({ status: "not_implemented", function: "refresh-token" }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
