import { NextResponse, type NextRequest } from "next/server";

// App routes that require authentication. Authentication is enforced by the
// client-side RouteGuard plus the backend's `authenticate` middleware on every
// protected endpoint. The web origin holds no session cookie — the httpOnly
// session cookies are host-only on the API subdomain (echo-api.*), so a
// middleware cookie check here would break every authenticated session.
// Instead, middleware only adds defensive caching headers so authenticated
// shells are never cached/shared to other users.
const PROTECTED_ROUTES = [
  "/servers",
  "/messages",
  "/friends",
  "/server-settings",
  "/create-server",
  "/profile-settings",
  "/delete-account",
  "/dashboard",
  "/profile",
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );

  if (!isProtected) return NextResponse.next();

  const response = NextResponse.next();
  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate"
  );
  return response;
}

export const config = {
  matcher: [
    "/servers/:path*",
    "/messages/:path*",
    "/friends/:path*",
    "/server-settings/:path*",
    "/create-server/:path*",
    "/profile-settings/:path*",
    "/delete-account/:path*",
    "/dashboard/:path*",
    "/profile/:path*",
  ],
};