// Function: refresh-token
// Purpose: For every active api_credentials row with provider='solax_developer',
//          exchange client_credentials for a fresh access_token and persist it
//          back to the row along with expires_at (30-day TTL with 60s safety margin).
//
// Schedule: every 25 days at 03:00 UTC (cron 0 3 */25 * *)
//          5-day margin before the 30-day expiry, in case of one missed run.
//
// Iterates every credentials row independently (multi-tenant from day one):
// one user's failure does not block the others.

import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { computeExpiresAt, solaxAuthRequest } from "../_shared/solax-client.ts";

interface CredentialRow {
  id: string;
  user_id: string;
  client_id: string;
  client_secret_encrypted: string;
}

interface RefreshOutcome {
  credentials_id: string;
  user_id: string;
  status: "ok" | "failed";
  expires_at?: string;
  error?: string;
}

Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      { ok: false, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env" },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: rows, error: selectError } = await supabase
    .from("api_credentials")
    .select("id, user_id, client_id, client_secret_encrypted")
    .eq("provider", "solax_developer");

  if (selectError) {
    return jsonResponse(
      { ok: false, error: `select api_credentials: ${selectError.message}` },
      500,
    );
  }

  if (!rows || rows.length === 0) {
    return jsonResponse({ ok: true, refreshed: 0, message: "no solax_developer credentials found" });
  }

  const outcomes: RefreshOutcome[] = [];

  for (const row of rows as CredentialRow[]) {
    try {
      const tokenResult = await solaxAuthRequest(row.client_id, row.client_secret_encrypted);
      if (!tokenResult) throw new Error("empty token result");

      const expiresAt = computeExpiresAt(tokenResult.expires_in);

      const { error: updateError } = await supabase
        .from("api_credentials")
        .update({
          access_token_encrypted: tokenResult.access_token,
          token_type: tokenResult.token_type,
          expires_at: expiresAt.toISOString(),
          scope: tokenResult.scope,
          last_refreshed_at: new Date().toISOString(),
          last_error: null,
          last_error_at: null,
        })
        .eq("id", row.id);

      if (updateError) throw new Error(`update row: ${updateError.message}`);

      outcomes.push({
        credentials_id: row.id,
        user_id: row.user_id,
        status: "ok",
        expires_at: expiresAt.toISOString(),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      outcomes.push({
        credentials_id: row.id,
        user_id: row.user_id,
        status: "failed",
        error: message,
      });

      await supabase
        .from("api_credentials")
        .update({
          last_error: message,
          last_error_at: new Date().toISOString(),
        })
        .eq("id", row.id);
    }
  }

  const refreshed = outcomes.filter((o) => o.status === "ok").length;
  const failed = outcomes.filter((o) => o.status === "failed").length;

  return jsonResponse(
    { ok: failed === 0, refreshed, failed, outcomes },
    failed === 0 ? 200 : 500,
  );
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
