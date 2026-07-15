import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Optimistic auth gate (Next.js 16 renamed Middleware -> Proxy). This only checks
 * for the *presence* of a session cookie to avoid an obvious unauthenticated hit
 * to protected routes. The authoritative check happens server-side in
 * `requireUser()` on every protected page and action.
 */
function hasSessionCookie(request: NextRequest): boolean {
  if (request.cookies.get("listingai_dev_session")) return true;
  // Supabase auth cookies look like `sb-<ref>-auth-token`.
  return request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
}

export function proxy(request: NextRequest) {
  if (!hasSessionCookie(request)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = "";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*"],
};
