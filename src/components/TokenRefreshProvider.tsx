"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";
import { tokenStore } from "@/lib/auth/tokenStore";

export function TokenRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [hasSession, setHasSession] = useState(() =>
    typeof window === "undefined" ? false : tokenStore.hasRefreshToken()
  );

  useEffect(() => {
    const update = () => setHasSession(tokenStore.hasRefreshToken());
    update();
    return tokenStore.subscribe(update);
  }, []);

  const publicRoutes = [
    "/",
    "/register",
    "/reset-password",
    "/forgot-password",
    "/invite",
    "/oauth-callback",
    "/auth/callback",
  ];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  // Gate on the session flag too: the refresh token may appear after mount
  // (e.g. right after OAuth), and appears once on a cold load. This flips
  // `enabled` false -> true so the scheduler arms for OAuth sessions, and
  // true -> false on logout so its timers are cancelled.
  useTokenRefresh(!isPublicRoute && hasSession);

  return <>{children}</>;
}
