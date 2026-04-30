// Solax Developer Portal API client — shared by Edge Functions.
// Spec: docs/context/04-api-spec.md
//
// Conventions:
// - Auth endpoint /openapi/auth/oauth/token returns code: 0 on success
//   (NOT 10000 — that's the convention for every other endpoint, see api-spec sec 4.1).
// - Access token TTL is 30 days (expires_in = 2591999 sec).
// - On code: 10402 from data endpoints, the access token has expired or was revoked
//   server-side; callers should call refreshTokenForCredentials() and retry.

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

/**
 * Exchange client_credentials for a fresh access_token.
 * Throws on network errors and on non-zero auth code.
 */
export async function solaxAuthRequest(
  clientId: string,
  clientSecret: string,
): Promise<SolaxAuthResponse["result"]> {
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
 * Solax returns 2591999 sec (~30 days). We subtract a 60s margin to avoid
 * border-case requests racing the actual expiration.
 */
export function computeExpiresAt(expiresInSec: number): Date {
  const safeMs = (expiresInSec - 60) * 1000;
  return new Date(Date.now() + safeMs);
}
