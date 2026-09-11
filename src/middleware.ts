import { NextResponse, type NextRequest } from "next/server";

/**
 * Cheap edge gate: bounces signed-out users off admin pages before they render.
 * The real authorization checks live in the API routes — this only removes the
 * flash of an empty dashboard.
 */
const PROTECTED = ["/dashboard", "/certificates", "/candidates", "/templates", "/settings"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

  const hasSession =
    request.cookies.has("authjs.session-token") ||
    request.cookies.has("__Secure-authjs.session-token");

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|verify).*)"],
};
