// Solax Developer Portal API client — shared by Edge Functions.
// Spec: docs/context/04-api-spec.md
//
// Conventions:
// - Auth endpoint /openapi/auth/oauth/token returns code: 0 on success
//   (NOT 10000 — that's the convention for every other endpoint, see api-spec sec 4.1).
// - Access token TTL is 30 days (expires_in = 2591999 sec).
// - On code: 10402 from data endpoints, the access token has expired or was revoked
//   server-side; solaxFetch transparently refreshes via solaxAuthRequest and retries once.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export const SOLAX_BASE_URL = "https://openapi-eu.solaxcloud.com";

// ----- Types ---------------------------------------------------------------

export interface SolaxAuthResponse {
  code: number;
  result?: {
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
    grant_type: string;
  };
  message?: string;
}

export interface SolaxApiResponse<T = unknown> {
  code: number;
  result?: T;
  message?: string;
  traceId?: string;
}

export interface ApiCredentialRow {
  id: string;
  user_id: string;
  client_id: string;
  client_secret_encrypted: string;
  access_token_encrypted: string | null;
  expires_at: string | null;
}

// Common Solax response codes (Appendix 1 of Developer Portal docs).
export const SolaxCode = {
  AuthSuccess: 0,
  Success: 10000,
  Failed: 10001,
  Abnormality: 10200,
  NotAuthenticated: 10400,
  CredsInvalid: 10401,
  AccessTokenExpired: 10402,
  NoAccessRights: 10403,
  ApiCallsLimitReached: 10405,
  RateLimitReached: 10406,
  NoDevicePermission: 10500,
  SystemBusy: 11500,
} as const;

// ----- OAuth ---------------------------------------------------------------

/** Exchange client_credentials for a fresh access_token. Throws on failure. */
export async function solaxAuthRequest(
  clientId: string,
  clientSecret: string,
): Promise<NonNullable<SolaxAuthResponse["result"]>> {
  const response = await fetch(`${SOLAX_BASE_URL}/openapi/auth/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "client_credentials",
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "<unreadable body>");
    throw new Error(`Solax auth HTTP ${response.status}: ${text}`);
  }

  const data: SolaxAuthResponse = await response.json();

  if (data.code !== SolaxCode.AuthSuccess || !data.result) {
    throw new Error(
      `Solax auth failed (code ${data.code}): ${data.message ?? "no message"}`,
    );
  }

  return data.result;
}

/**
 * Compute a safe expires_at timestamp from Solax's expires_in (seconds).
 * Solax returns 2591999 sec (~30 days). Subtracts a 60s margin so requests
 * near expiration don't race the actual cutoff.
 */
export function computeExpiresAt(expiresInSec: number): Date {
  const safeMs = (expiresInSec - 60) * 1000;
  return new Date(Date.now() + safeMs);
}

/**
 * Refresh the access_token for one credentials row and persist it back.
 * Returns the new access token. Used both by the refresh-token Edge Function
 * (cron) and by solaxFetch (ad-hoc on 10402).
 */
export async function refreshTokenForCredentials(
  supabase: SupabaseClient,
  cred: ApiCredentialRow,
): Promise<string> {
  const tokenResult = await solaxAuthRequest(
    cred.client_id,
    cred.client_secret_encrypted,
  );

  const expiresAt = computeExpiresAt(tokenResult.expires_in);

  const { error } = await supabase
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
    .eq("id", cred.id);

  if (error) throw new Error(`persist refreshed token: ${error.message}`);

  return tokenResult.access_token;
}

// ----- Data fetch ----------------------------------------------------------

export type FetchOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  /** Internal flag. Do not set externally. Used to prevent infinite retry loops. */
  _isRetry?: boolean;
};

/**
 * Call any Solax data endpoint with the row's current access_token.
 * On code 10402 (token expired), refreshes once and retries; subsequent failures
 * surface as thrown errors. Returns the `result` payload only.
 *
 * The credentials row is mutated in place when refresh happens (caller sees the
 * new access_token via cred.access_token_encrypted).
 */
export async function solaxFetch<T = unknown>(
  supabase: SupabaseClient,
  cred: ApiCredentialRow,
  endpoint: string,
  queryParams: Record<string, string> = {},
  options: FetchOptions = {},
): Promise<T> {
  if (!cred.access_token_encrypted) {
    cred.access_token_encrypted = await refreshTokenForCredentials(supabase, cred);
  }

  const url = new URL(endpoint, SOLAX_BASE_URL);
  for (const [k, v] of Object.entries(queryParams)) {
    url.searchParams.set(k, v);
  }

  const init: RequestInit = {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${cred.access_token_encrypted}`,
      "Content-Type": "application/json",
    },
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);

  const response = await fetch(url.toString(), init);

  if (!response.ok) {
    const text = await response.text().catch(() => "<unreadable body>");
    throw new Error(`Solax HTTP ${response.status} on ${endpoint}: ${text}`);
  }

  const data: SolaxApiResponse<T> = await response.json();

  if (data.code === SolaxCode.AccessTokenExpired && !options._isRetry) {
    cred.access_token_encrypted = await refreshTokenForCredentials(supabase, cred);
    return solaxFetch<T>(supabase, cred, endpoint, queryParams, {
      ...options,
      _isRetry: true,
    });
  }

  if (data.code !== SolaxCode.Success || data.result === undefined) {
    throw new Error(
      `Solax API error on ${endpoint} (code ${data.code}): ${data.message ?? "no message"}`,
    );
  }

  return data.result;
}

// ----- Sign-convention normalization (api-spec sec 6) ----------------------
//
// House convention for our schema (every *_power_w field):
//   negative = energy flowing INTO the device/grid (consumed)
//   positive = energy flowing OUT of the device/grid (produced/exported)
//
// Solax conventions (from api-spec sec 6):
//   inverter.totalActivePower:  + discharge (produces) / - charge (consumes)  → ALREADY MATCHES
//   inverter.gridPower (meter): + export to grid       / - import from grid    → ALREADY MATCHES
//   battery.chargeDischargePower: + charging (consumes) / - discharging (produces) → FLIP REQUIRED

/**
 * Battery `chargeDischargePower` from Solax has the OPPOSITE sign convention
 * from our `*_power_w` columns. Solax: positive = charging (battery consumes
 * from house). Our schema: positive = discharging (battery produces to house).
 * Flip the sign on read.
 */
export const normalizeBatteryPower = (solaxValue: number | null | undefined): number | null => {
  if (solaxValue === null || solaxValue === undefined) return null;
  return -solaxValue;
};

/**
 * Inverter `totalActivePower` and meter `gridPower` already match our convention.
 * Helper exists to make the choice explicit at call sites.
 */
export const passThroughPower = (
  solaxValue: number | null | undefined,
): number | null => (solaxValue === null || solaxValue === undefined ? null : solaxValue);
