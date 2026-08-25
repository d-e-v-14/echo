"use client";

import { usePathname } from "next/navigation";
import { useTokenRefresh } from "@/hooks/useTokenRefresh";

export function TokenRefreshProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const publicRoutes = [
    "/",
    "/register",
    "/reset-password",
    "/forgot-password",
    "/invite",
  ];
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );

  useTokenRefresh(!isPublicRoute);

  return <>{children}</>;
}
