import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  const chMobile = req.headers.get("sec-ch-ua-mobile");

  const isMobile =
    chMobile === "?1" ||
    /Android|iPhone|iPad|iPod/i.test(ua);

  if (isMobile && req.nextUrl.pathname !== "/mobile-blocked") {
    return NextResponse.redirect(
      new URL("/mobile-blocked", req.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|mobile-blocked).*)",
  ],
};
