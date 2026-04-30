import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client for server components and route handlers. Bypasses RLS,
// so callers must scope queries by user_inverter explicitly. On MVP we have
// one inverter (Michał's), multi-tenant scoping arrives in Phase 7.
//
// Returns null if env vars aren't configured (so pages can render an empty
// state instead of crashing the whole route).

let cached: ReturnType<typeof createClient> | null | undefined;

export function getServiceClient() {
  if (cached !== undefined) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    if (process.env.VERCEL_ENV !== "production") {
      console.warn(
        "[lib/data] NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing; data layer disabled.",
      );
    }
    cached = null;
    return cached;
  }

  cached = createClient(url, key, {
    auth: { persistSession: false },
  });
  return cached;
}
