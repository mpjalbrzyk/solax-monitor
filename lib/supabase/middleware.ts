import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/error"];

// Phase 3 step 1: scaffold only. Step 2 will flip to true when /login exists.
const AUTH_GATE_ENABLED = false;

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Defensive: if Supabase env vars aren't configured for this Vercel scope
  // (e.g. Preview without env mirror from Production), don't crash with 500 —
  // pass through. Auth gate is off in step 1 anyway. Step 2 hard-requires
  // env vars in Preview scope before flipping AUTH_GATE_ENABLED to true.
  if (!url || !key) {
    if (process.env.VERCEL_ENV !== "production") {
      console.warn(
        "[supabase/middleware] NEXT_PUBLIC_SUPABASE_URL or _ANON_KEY missing; skipping session refresh.",
      );
    }
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // IMPORTANT: getUser must be called between createServerClient and the
  // returned response, otherwise tokens won't refresh in cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!AUTH_GATE_ENABLED) {
    return response;
  }

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/overview";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
