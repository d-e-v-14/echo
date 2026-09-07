export type RouteName =
  | "HOME"
  | "LOGIN"
  | "SERVERS"
  | "MESSAGES"
  | "MESSAGES_DM"
  | "FRIENDS"
  | "SERVER_SETTINGS"
  | "INVITE"
  | "CREATE_SERVER"
  | "PROFILE_SETTINGS"
  | "DELETE_ACCOUNT"
  | "DASHBOARD"
  | "RESET_PASSWORD"
  | "FORGOT_PASSWORD"
  | "NOT_FOUND";

export type RouteParams = {
  MESSAGES_DM: { userId: string };
  SERVER_SETTINGS: { serverId: string };
  INVITE: { code: string };
};

export type RouteParamsFor<N extends RouteName> = N extends keyof RouteParams
  ? RouteParams[N]
  : Record<string, never>;