import type { CachePolicy } from "@/lib/query/shared.types";

const MINUTE = 60_000;

export const DEFAULT_POLICY: CachePolicy = {
  staleTimeMs: 0,
  gcTimeMs: 5 * MINUTE,
};

export const STABLE_POLICY: CachePolicy = {
  staleTimeMs: 10 * MINUTE,
  gcTimeMs: 30 * MINUTE,
};

export const MEDIUM_POLICY: CachePolicy = {
  staleTimeMs: 3 * MINUTE,
  gcTimeMs: 15 * MINUTE,
};

export const MEMBER_POLICY: CachePolicy = {
  staleTimeMs: 60_000,
  gcTimeMs: 5 * MINUTE,
};

export const DM_POLICY: CachePolicy = {
  staleTimeMs: 90_000,
  gcTimeMs: 10 * MINUTE,
};

export const SEARCH_POLICY: CachePolicy = {
  staleTimeMs: 20_000,
  gcTimeMs: MINUTE,
};

export const REALTIME_POLICY: CachePolicy = {
  staleTimeMs: 0,
  gcTimeMs: MINUTE,
};

export const EPHEMERAL_POLICY: CachePolicy = {
  staleTimeMs: 0,
  gcTimeMs: 0,
};

export function policyForQueryKey(key: readonly unknown[]): CachePolicy {
  const [segment] = key;

  switch (segment) {
    case "me":
      return STABLE_POLICY;
    case "servers":
    case "server":
      return serverCachePolicy(key);
    case "channel":
      return channelCachePolicy(key);
    case "dm":
      return key[2] === "messages" ? MEDIUM_POLICY : DM_POLICY;
    case "dms":
      return DM_POLICY;
    case "search":
    case "search-dm":
    case "search-users":
      return SEARCH_POLICY;
    case "notifications":
    case "unread-counts":
    case "mentions":
      return REALTIME_POLICY;
    case "friends":
      return MEDIUM_POLICY;
    case "pinned":
      return MEDIUM_POLICY;
    case "user":
      return STABLE_POLICY;
    case "voice":
    case "presence":
      return EPHEMERAL_POLICY;
    default:
      return DEFAULT_POLICY;
  }
}

function serverCachePolicy(key: readonly unknown[]): CachePolicy {
  const branch = key[2];

  switch (branch) {
    case "members":
      return MEMBER_POLICY;
    case "details":
    case "channels":
    case "invites":
    case "bans":
      return MEDIUM_POLICY;
    case "roles":
    case "my-roles":
    case "self-assignable-roles":
      return STABLE_POLICY;
    default:
      return MEDIUM_POLICY;
  }
}

function channelCachePolicy(key: readonly unknown[]): CachePolicy {
  const branch = key[2];

  switch (branch) {
    case "messages":
      return { staleTimeMs: 30 * MINUTE, gcTimeMs: 30 * MINUTE };
    case "permissions":
      return MEDIUM_POLICY;
    default:
      return MEDIUM_POLICY;
  }
}
