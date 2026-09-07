import { ROUTES } from "./routes";
import type { RouteName } from "./types";

export interface AuthState {
  hasSession: boolean;
  sessionValid: boolean;
}

export type RouteResolution =
  | { status: "ok" }
  | { status: "redirect"; to: "signin" | "signin-expired" }
  | { status: "notFound" };

export function resolveAuthForRoute(
  name: RouteName,
  auth: AuthState
): RouteResolution {
  const def = ROUTES[name];
  if (!def) return { status: "notFound" };
  if (!def.requiresAuth) return { status: "ok" };
  if (!auth.hasSession) return { status: "redirect", to: "signin" };
  if (!auth.sessionValid) return { status: "redirect", to: "signin-expired" };
  return { status: "ok" };
}