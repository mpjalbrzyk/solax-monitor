import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/config";
import { verifySessionCookie } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/logout"];

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = verifySessionCookie(cookieValue);

  if (!session && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    if (pathname !== "/") {
      url.searchParams.set("redirectTo", pathname + request.nextUrl.search);
    }
    return NextResponse.redirect(url);
  }

  if (session && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/overview";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
