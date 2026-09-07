import { ROUTES, ROUTE_ORDER, isVirtualRoute } from "./routes";
import type { RouteName } from "./types";
import type { SearchParamsLike } from "./routes";

export function buildPath(
  name: RouteName,
  params?: Record<string, string>
): string {
  const def = ROUTES[name];
  if (!def) throw new Error(`Unknown route: ${name}`);
  if (isVirtualRoute(name)) {
    throw new Error(`Route ${name} is virtual and not directly navigable`);
  }
  return def.build(params);
}

export function parsePath(
  pathname: string,
  searchParams: SearchParamsLike
): { name: RouteName; params: Record<string, string> } | null {
  for (const name of ROUTE_ORDER) {
    const def = ROUTES[name];
    if (def.virtual) continue;
    const params = def.parse(pathname, searchParams);
    if (params !== null) return { name, params };
  }
  return null;
}

export function canonicalize(
  pathname: string,
  searchParams: SearchParamsLike
): string {
  const parsed = parsePath(pathname, searchParams);
  if (!parsed) return pathname;
  return buildPath(parsed.name, parsed.params);
}

export function isSafePath(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  if (!value.startsWith("/")) return false;
  if (value.startsWith("//")) return false;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(value)) return false;
  if (/[\u0000-\u001f\u007f]/.test(value)) return false;
  return true;
}