// Solax Developer Portal API client — shared by poll-realtime, poll-alarms, refresh-token.
// Spec: docs/context/04-api-spec.md
//
// Status: STUB — implementation lands in Faza 1.
// Will export:
//   - solaxFetch(supabase, endpoint, params)  : Promise<any>  with auto token retrieval & 10402 retry
//   - refreshToken(supabase)                  : Promise<void> calls /openapi/auth/oauth/token
//   - SolaxResponseCode enum                  : 10000 success, 10402 token expired, 10405 rate limit, etc.

export const SOLAX_BASE_URL = "https://openapi-eu.solaxcloud.com";

// Placeholder so Deno doesn't complain about empty module.
export function _notImplemented(): never {
  throw new Error("solax-client not implemented yet — see Faza 1.");
}
