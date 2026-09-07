import type { RouteName } from "./types";

export type SearchParamsLike = Pick<URLSearchParams, "get">;

export interface RouteDef<N extends RouteName = RouteName> {
  name: N;
  requiresAuth: boolean;
  virtual: boolean;
  build: (params?: Record<string, string>) => string;
  parse: (
    pathname: string,
    searchParams: SearchParamsLike
  ) => Record<string, string> | null;
}

const staticRoute = <N extends RouteName>(
  name: N,
  path: string,
  requiresAuth: boolean,
  options: { virtual?: boolean } = {}
): RouteDef<N> => ({
  name,
  requiresAuth,
  virtual: options.virtual ?? false,
  build: () => path,
  parse: (pathname) => (pathname === path ? {} : null),
});

export const ROUTES: Record<RouteName, RouteDef> = {
  HOME: staticRoute("HOME", "/", false),
  LOGIN: staticRoute("LOGIN", "/", false),

  SERVERS: staticRoute("SERVERS", "/servers", true),
  MESSAGES_DM: {
    name: "MESSAGES_DM",
    requiresAuth: true,
    virtual: false,
    build: (params) =>
      `/messages?dm=${encodeURIComponent(params?.userId ?? "")}`,
    parse: (pathname, searchParams) => {
      if (pathname !== "/messages") return null;
      const userId = searchParams.get("dm");
      return userId ? { userId } : null;
    },
  },
  MESSAGES: staticRoute("MESSAGES", "/messages", true),
  FRIENDS: staticRoute("FRIENDS", "/friends", true),

  SERVER_SETTINGS: {
    name: "SERVER_SETTINGS",
    requiresAuth: true,
    virtual: false,
    build: (params) =>
      `/server-settings?serverId=${encodeURIComponent(params?.serverId ?? "")}`,
    parse: (pathname, searchParams) => {
      if (pathname !== "/server-settings") return null;
      const serverId = searchParams.get("serverId");
      return serverId ? { serverId } : null;
    },
  },

  INVITE: {
    name: "INVITE",
    requiresAuth: false,
    virtual: false,
    build: (params) => `/invite/${encodeURIComponent(params?.code ?? "")}`,
    parse: (pathname) => {
      const match = /^\/invite\/([^/]+)\/?$/.exec(pathname);
      return match ? { code: decodeURIComponent(match[1]) } : null;
    },
  },

  CREATE_SERVER: staticRoute("CREATE_SERVER", "/create-server", true),
  PROFILE_SETTINGS: staticRoute("PROFILE_SETTINGS", "/profile-settings", true),
  DELETE_ACCOUNT: staticRoute("DELETE_ACCOUNT", "/delete-account", true),
  DASHBOARD: staticRoute("DASHBOARD", "/dashboard", true),

  RESET_PASSWORD: staticRoute("RESET_PASSWORD", "/reset-password", false),
  FORGOT_PASSWORD: staticRoute("FORGOT_PASSWORD", "/forgot-password", false),

  NOT_FOUND: staticRoute("NOT_FOUND", "/404", false, { virtual: true }),
};

export const ROUTE_ORDER: RouteName[] = [
  "HOME",
  "LOGIN",
  "SERVERS",
  "MESSAGES_DM",
  "MESSAGES",
  "FRIENDS",
  "SERVER_SETTINGS",
  "INVITE",
  "CREATE_SERVER",
  "PROFILE_SETTINGS",
  "DELETE_ACCOUNT",
  "DASHBOARD",
  "RESET_PASSWORD",
  "FORGOT_PASSWORD",
];

export const isVirtualRoute = (name: RouteName): boolean =>
  ROUTES[name].virtual;