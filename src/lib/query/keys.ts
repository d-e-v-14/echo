import type { PinContext } from "@/lib/query/shared.types";

export const queryKeys = {
  disabled: ["__disabled"] as const,
  me: ["me"] as const,
  servers: ["servers"] as const,
  server: (serverId: string) => ["server", serverId] as const,
  serverDetails: (serverId: string) =>
    [...queryKeys.server(serverId), "details"] as const,
  serverMembers: (serverId: string) =>
    [...queryKeys.server(serverId), "members"] as const,
  serverRoles: (serverId: string) =>
    [...queryKeys.server(serverId), "roles"] as const,
  myServerRoles: (serverId: string) =>
    [...queryKeys.server(serverId), "my-roles"] as const,
  selfAssignableRoles: (serverId: string) =>
    [...queryKeys.server(serverId), "self-assignable-roles"] as const,
  serverChannels: (serverId: string) =>
    [...queryKeys.server(serverId), "channels"] as const,
  serverBans: (serverId: string) =>
    [...queryKeys.server(serverId), "bans"] as const,
  serverInvites: (serverId: string) =>
    [...queryKeys.server(serverId), "invites"] as const,
  channel: (channelId: string) => ["channel", channelId] as const,
  channelPermissions: (channelId: string) =>
    [...queryKeys.channel(channelId), "permissions"] as const,
  channelMessages: (channelId: string) =>
    [...queryKeys.channel(channelId), "messages"] as const,
  dms: ["dms"] as const,
  dmMessages: (conversationId: string) =>
    ["dm", conversationId, "messages"] as const,
  dmSearch: (threadId: string, query: string) =>
    ["search-dm", threadId, query] as const,
  notifications: ["notifications"] as const,
  unreadCounts: ["unread-counts"] as const,
  mentionSearch: (userId: string) => ["mentions", userId] as const,
  friends: ["friends"] as const,
  friendRequests: ["friends", "requests"] as const,
  friendSearch: (query: string) => ["friends", "search", query] as const,
  pinnedMessages: (context: PinContext) =>
    ["pinned", context.channel_id ?? context.thread_id] as const,
  serverSearch: (serverId: string, query: string) =>
    ["search", serverId, query] as const,
  userSearch: (query: string) => ["search-users", query] as const,
  userProfile: (userId: string) => ["user", userId, "profile"] as const,
  userAvatar: (userId: string) => ["user", userId, "avatar"] as const,
} as const;

export type QueryKey = readonly unknown[];
