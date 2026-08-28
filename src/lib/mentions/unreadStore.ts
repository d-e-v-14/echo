export interface MentionUnreadEntry {
  id: string;
  messageId: string;
  channelId: string;
  serverId?: string;
  serverName?: string;
  senderId?: string;
  senderUsername?: string;
  mentionType?: "user" | "role" | "everyone" | string;
  timestamp: string;
}

type MentionMap = ReadonlyMap<string, MentionUnreadEntry>;
type ChannelMap = ReadonlyMap<string, MentionMap>;

export interface UnreadSnapshot {
  byChannel: ChannelMap;
  /** Authoritative per-channel unread mention counts. */
  channelCounts: Readonly<Record<string, number>>;
  /** Authoritative per-server unread mention counts. */
  serverCounts: Readonly<Record<string, number>>;
  /** channelId -> serverId for channels that currently have unread mentions. */
  channelServer: Readonly<Record<string, string>>;
  serverUnread: Readonly<Record<string, boolean>>;
  serverChannels: ReadonlyMap<string, ReadonlyArray<string>>;
  channelMentions: ReadonlyMap<string, ReadonlyArray<MentionUnreadEntry>>;
  totalUnread: number;
}

interface CountsState {
  serverCounts: Record<string, number>;
  channelCounts: Record<string, number>;
  channelServer: Record<string, string>;
  totalUnread: number;
}

const EMPTY_MENTIONS: ReadonlyArray<MentionUnreadEntry> = [];

let snapshot: UnreadSnapshot = createEmptySnapshot();
const listeners = new Set<() => void>();

let currentUserId: string | null = null;
let socketRef: { emit: (event: string, ...args: unknown[]) => void } | null =
  null;
let serverIdResolver:
  | ((channelId: string) => string | undefined)
  | null = null;

function createEmptySnapshot(): UnreadSnapshot {
  return {
    byChannel: new Map(),
    channelCounts: {},
    serverCounts: {},
    channelServer: {},
    serverUnread: {},
    serverChannels: new Map(),
    channelMentions: new Map(),
    totalUnread: 0,
  };
}

const readStr = (obj: any, keys: string[]): string | undefined => {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null) {
      if (typeof value === "string" || typeof value === "number") {
        return String(value);
      }
    }
  }
  return undefined;
};

const readNum = (obj: any, keys: string[]): number | undefined => {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
};

const asCount = (value: unknown): number | undefined => {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
    return value;
  }
  return undefined;
};

function emitChange() {
  listeners.forEach((listener) => listener());
}

function cloneChannelMap(
  source: ChannelMap
): Map<string, Map<string, MentionUnreadEntry>> {
  const cloned = new Map<string, Map<string, MentionUnreadEntry>>();
  for (const [channelId, mentions] of source) {
    cloned.set(channelId, new Map(mentions));
  }
  return cloned;
}

function buildSnapshot(
  byChannel: Map<string, Map<string, MentionUnreadEntry>>,
  counts: CountsState
): UnreadSnapshot {
  const channelCounts: Record<string, number> = { ...counts.channelCounts };
  const serverCounts: Record<string, number> = { ...counts.serverCounts };
  const serverUnread: Record<string, boolean> = {};
  const serverChannelSet = new Map<string, Set<string>>();
  const channelMentionsMap = new Map<string, MentionUnreadEntry[]>();

  for (const serverId of Object.keys(serverCounts)) {
    serverUnread[serverId] = (serverCounts[serverId] ?? 0) > 0;
  }

  for (const [channelId, mentions] of byChannel) {
    if ((channelCounts[channelId] ?? 0) <= 0) continue;
    const entries = Array.from(mentions.values()).sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
    );
    channelMentionsMap.set(channelId, entries);
  }

  for (const [channelId, serverId] of Object.entries(counts.channelServer)) {
    if ((channelCounts[channelId] ?? 0) <= 0) continue;
    let channels = serverChannelSet.get(serverId);
    if (!channels) {
      channels = new Set();
      serverChannelSet.set(serverId, channels);
    }
    channels.add(channelId);
  }

  const serverChannels = new Map<string, ReadonlyArray<string>>();
  for (const [serverId, channels] of serverChannelSet) {
    serverChannels.set(serverId, Array.from(channels).sort());
  }

  const channelMentions = new Map<string, ReadonlyArray<MentionUnreadEntry>>();
  for (const [channelId, entries] of channelMentionsMap) {
    channelMentions.set(channelId, entries);
  }

  return {
    byChannel,
    channelCounts,
    serverCounts,
    channelServer: { ...counts.channelServer },
    serverUnread,
    serverChannels,
    channelMentions,
    totalUnread: counts.totalUnread,
  };
}

function mutate(
  mutator: (
    byChannel: Map<string, Map<string, MentionUnreadEntry>>,
    counts: CountsState
  ) => void
) {
  const next = cloneChannelMap(snapshot.byChannel);
  const counts = {
    serverCounts: { ...snapshot.serverCounts },
    channelCounts: { ...snapshot.channelCounts },
    channelServer: { ...snapshot.channelServer },
    totalUnread: snapshot.totalUnread,
  };
  mutator(next, counts);
  snapshot = buildSnapshot(next, counts);
  emitChange();
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): UnreadSnapshot {
  return snapshot;
}

export function getSocketRef() {
  return socketRef;
}

export function resetUnreadStore(): void {
  currentUserId = null;
  socketRef = null;
  serverIdResolver = null;
  snapshot = createEmptySnapshot();
  emitChange();
}

export function configureUnreadStore(options: {
  userId: string | null;
  socket: { emit: (event: string, ...args: unknown[]) => void } | null;
  resolveServerId?: (channelId: string) => string | undefined;
}): void {
  if (currentUserId !== options.userId) {
    currentUserId = options.userId;
    if (options.userId) {
      snapshot = createEmptySnapshot();
      emitChange();
    }
  }
  socketRef = options.socket;
  serverIdResolver = options.resolveServerId ?? null;
}

export function normalizeMentionEntry(
  raw: unknown,
  userId?: string | null
): MentionUnreadEntry | null {
  const body = (raw as any)?.payload ?? raw;
  if (!body || typeof body !== "object") return null;

  const message = (body as any).message;
  const channels = (body as any).channels;

  const channelId =
    readStr(body, ["channel_id", "channelId"]) ??
    readStr(message, ["channel_id", "channelId"]) ??
    readStr(channels, ["id", "channel_id"]);
  if (!channelId) return null;

  const senderId =
    readStr(body, ["sender_id", "senderId"]) ??
    readStr(message, ["sender_id", "senderId"]);
  if (userId && senderId && String(senderId) === String(userId)) {
    return null;
  }

  const messageId =
    readStr(body, ["message_id", "messageId"]) ??
    readStr(message, ["id", "message_id"]) ??
    "";
  const id =
    readStr(body, ["id", "mention_id", "mentionId", "notification_id"]) ??
    `${channelId}:${messageId || "unknown"}`;

  const serverId =
    readStr(body, ["server_id", "serverId"]) ??
    readStr(channels, ["server_id", "serverId"]) ??
    readStr(message?.channels, ["server_id", "serverId"]) ??
    readStr(body?.server, ["id", "server_id"]) ??
    serverIdResolver?.(channelId);

  const senderUsername =
    readStr(body, [
      "sender_username",
      "senderUsername",
      "sender_name",
      "senderName",
    ]) ??
    readStr(body?.users, ["username"]) ??
    readStr(message?.users, ["username"]);

  const serverName =
    readStr(body, ["server_name", "serverName"]) ??
    readStr(channels, ["server_name", "serverName"]) ??
    readStr(message?.channels, ["server_name", "serverName"]) ??
    readStr(body?.server, ["name"]);

  const mentionType = readStr(body, ["mention_type", "mentionType"]);

  const timestamp =
    readStr(body, ["timestamp", "created_at", "createdAt", "occurredAt"]) ??
    readStr(message, ["created_at", "timestamp"]) ??
    new Date().toISOString();

  return {
    id,
    messageId,
    channelId,
    serverId,
    serverName,
    senderId,
    senderUsername,
    mentionType,
    timestamp,
  };
}

function trimChannelEntriesToCount(
  byChannel: Map<string, Map<string, MentionUnreadEntry>>,
  channelId: string,
  maxCount: number
): void {
  const channelMap = byChannel.get(channelId);
  if (!channelMap || channelMap.size <= maxCount) return;
  const entries = Array.from(channelMap.values()).sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
  );
  const toDrop = entries.slice(0, entries.length - maxCount);
  const next = new Map(channelMap);
  for (const entry of toDrop) {
    next.delete(entry.id);
  }
  byChannel.set(channelId, next);
}

/**
 * Apply a `mention_notification` create event. The event payload carries
 * authoritative unread counts for the touched server/channel (computed by the
 * backend right after the notification rows are written), so applying it
 * verbatim can never cause counters to drift or to be double-incremented.
 *
 * Legacy payloads (without counts) are still supported: counts increment by
 * the number of newly-inserted entries.
 */
export function applyMentionCreated(raw: unknown, userId?: string | null): void {
  const entry = normalizeMentionEntry(raw, userId);
  if (!entry) return;

  const body = (raw as any)?.payload ?? raw;
  const channelUnreadCount = asCount(
    readNum(body, ["channelUnreadCount", "channel_unread_count"])
  );
  const serverUnreadCount = asCount(
    readNum(body, ["serverUnreadCount", "server_unread_count"])
  );
  const totalUnreadCount = asCount(
    readNum(body, ["totalUnreadCount", "total_unread_count"])
  );

  mutate((byChannel, counts) => {
    let channelMap = byChannel.get(entry.channelId);
    if (!channelMap) {
      channelMap = new Map();
      byChannel.set(entry.channelId, channelMap);
    }
    const isNew = !channelMap.has(entry.id);
    channelMap.set(entry.id, entry);

    if (channelUnreadCount !== undefined) {
      counts.channelCounts[entry.channelId] = channelUnreadCount;
    } else if (isNew) {
      counts.channelCounts[entry.channelId] =
        (counts.channelCounts[entry.channelId] ?? 0) + 1;
    }

    if (entry.serverId) {
      counts.channelServer[entry.channelId] = entry.serverId;
      if (serverUnreadCount !== undefined) {
        counts.serverCounts[entry.serverId] = serverUnreadCount;
      } else if (isNew) {
        counts.serverCounts[entry.serverId] =
          (counts.serverCounts[entry.serverId] ?? 0) + 1;
      }
    }

    if (totalUnreadCount !== undefined) {
      counts.totalUnread = totalUnreadCount;
    } else if (isNew) {
      counts.totalUnread += 1;
    }

    if (channelUnreadCount !== undefined) {
      trimChannelEntriesToCount(byChannel, entry.channelId, channelUnreadCount);
    }
  });
}

/** @deprecated kept for callers/tests using the pre-counts entry API. */
export function addUnreadMention(raw: unknown, userId?: string | null): void {
  applyMentionCreated(raw, userId);
}

/**
 * Apply a `mention_read` event: notification ids were deleted (read) and the
 * payload carries the authoritative post-read counts for the affected
 * server/channel.
 */
export function applyMentionRead(raw: unknown): void {
  const body = (raw as any)?.payload ?? raw;
  if (!body || typeof body !== "object") return;

  const rawIds = Array.isArray(body.notificationIds) ? body.notificationIds : [];
  const notificationIds = new Set(rawIds.map(String));
  const channelId = readStr(body, ["channel_id", "channelId"]);
  const serverId = readStr(body, ["server_id", "serverId"]);
  const channelUnreadCount = asCount(
    readNum(body, ["channelUnreadCount", "channel_unread_count"])
  );
  const serverUnreadCount = asCount(
    readNum(body, ["serverUnreadCount", "server_unread_count"])
  );
  const totalUnreadCount = asCount(
    readNum(body, ["totalUnreadCount", "total_unread_count"])
  );

  mutate((byChannel, counts) => {
    // Remove read entries.
    const removedChannelCounts: Record<string, number> = {};
    if (notificationIds.size > 0) {
      for (const [cid, channelMap] of byChannel) {
        let dropped = 0;
        const next = new Map(channelMap);
        for (const [id] of channelMap) {
          if (notificationIds.has(id)) {
            next.delete(id);
            dropped += 1;
          }
        }
        if (dropped > 0) {
          removedChannelCounts[cid] = (removedChannelCounts[cid] ?? 0) + dropped;
          if (next.size === 0) {
            byChannel.delete(cid);
          } else {
            byChannel.set(cid, next);
          }
        }
      }
    }

    const serverAllRead = Boolean(serverId) && !channelId;

    if (serverId && channelId) {
      // Channel-level read.
      if (channelUnreadCount !== undefined) {
        counts.channelCounts[channelId] = channelUnreadCount;
      } else {
        counts.channelCounts[channelId] = Math.max(
          0,
          (counts.channelCounts[channelId] ?? 0) -
            (removedChannelCounts[channelId] ?? 0)
        );
      }
      if (serverUnreadCount !== undefined) {
        counts.serverCounts[serverId] = serverUnreadCount;
      }
    } else if (serverAllRead) {
      // Server-level read clears every channel under the server.
      counts.serverCounts[serverId as string] =
        serverUnreadCount !== undefined
          ? serverUnreadCount
          : Math.max(
              0,
              (counts.serverCounts[serverId as string] ?? 0) -
                Object.values(removedChannelCounts).reduce(
                  (sum, count) => sum + count,
                  0
                )
            );
      for (const [cid, sid] of Object.entries(counts.channelServer)) {
        if (sid === serverId) {
          delete counts.channelCounts[cid];
        }
      }
    } else if (!serverId && !channelId) {
      // Global "mark all read": clear everything.
      counts.serverCounts = {};
      counts.channelCounts = {};
      counts.channelServer = {};
      byChannel.clear();
    } else if (channelId) {
      // Channel read event without serverId: recompute from entries.
      counts.channelCounts[channelId] = Math.max(
        0,
        (counts.channelCounts[channelId] ?? 0) -
          (removedChannelCounts[channelId] ?? 0)
      );
    }

    if (totalUnreadCount !== undefined) {
      counts.totalUnread = totalUnreadCount;
    } else {
      counts.totalUnread = Math.max(
        0,
        counts.totalUnread -
          Object.values(removedChannelCounts).reduce(
            (sum, count) => sum + count,
            0
          )
      );
    }
  });
}

/**
 * Replace the entire counts state with an authoritative snapshot (from
 * `GET /api/mentions/unread-counts` or the socket `mentions:unread_state`
 * / `mentions:get_unread` callback). Local per-mention entries are reconciled
 * against the authoritative counts so a stale snapshot can never resurrect a
 * count that was already read elsewhere, and a freshly-arriving socket event
 * can never be overridden by an older snapshot computed before it.
 */
export function setAuthoritativeCounts(
  state: {
    serverCounts?: Record<string, number> | null;
    channelCounts?:
      | Record<string, number>
      | Record<string, { serverId?: string | null; count?: number }>
      | null;
    totalUnread?: number | null;
    serverId?: string | null;
    serverCount?: number | null;
  } | null
): void {
  if (!state || typeof state !== "object") return;

  const serverRequested = readStr({ serverId: state.serverId }, ["serverId"]);

  const serverCounts: Record<string, number> = {};
  for (const [serverId, count] of Object.entries(state.serverCounts ?? {})) {
    const value = asCount(count);
    if (value !== undefined) serverCounts[serverId] = value;
  }
  // Per-server variant: `{ serverId, serverCount, channelCounts: numbers }`.
  const serverCountValue = asCount((state as any).serverCount);
  if (
    serverRequested &&
    serverCountValue !== undefined &&
    serverCounts[serverRequested] === undefined
  ) {
    serverCounts[serverRequested] = serverCountValue;
  }

  const channelCounts: Record<string, number> = {};
  const channelServer: Record<string, string> = {};
  for (const [channelId, raw] of Object.entries(state.channelCounts ?? {})) {
    let count: number | undefined;
    let serverIdValue: string | undefined;
    if (typeof raw === "number") {
      count = asCount(raw);
      serverIdValue = serverRequested ?? undefined;
    } else if (raw && typeof raw === "object") {
      count = asCount((raw as any).count);
      serverIdValue = readStr(raw, ["server_id", "serverId"]);
    }
    if (count === undefined) continue;
    channelCounts[channelId] = count;
    if (serverIdValue) channelServer[channelId] = serverIdValue;
  }

  const totalUnread =
    asCount(state.totalUnread) ??
    Object.values(channelCounts).reduce((sum, count) => sum + count, 0);

  mutate((byChannel, counts) => {
    counts.serverCounts = serverCounts;
    counts.channelCounts = channelCounts;
    counts.channelServer = channelServer;
    counts.totalUnread = totalUnread;

    // Reconcile local entries to the authoritative counts: drop entries for
    // channels that now have zero unread, and trim channels holding more
    // entries than the authoritative count reports.
    const knownChannels = new Set(Object.keys(channelCounts).filter((c) => channelCounts[c] > 0));
    for (const channelId of byChannel.keys()) {
      if (!knownChannels.has(channelId)) {
        byChannel.delete(channelId);
        continue;
      }
      trimChannelEntriesToCount(byChannel, channelId, channelCounts[channelId]);
    }
  });
}

/**
 * Recompute counts from local entries. Used as a fallback when the backend
 * does not expose the authoritative `unread-counts` endpoints (older deploy).
 */
export function deriveCountsFromEntries(): void {
  mutate((byChannel, counts) => {
    const serverCounts: Record<string, number> = {};
    const channelCounts: Record<string, number> = {};
    const channelServer: Record<string, string> = {};
    let totalUnread = 0;

    for (const [channelId, channelMap] of byChannel) {
      const count = channelMap.size;
      if (count === 0) continue;
      channelCounts[channelId] = count;
      totalUnread += count;
      const first = Array.from(channelMap.values())[0];
      if (first?.serverId) {
        serverCounts[first.serverId] =
          (serverCounts[first.serverId] ?? 0) + count;
        channelServer[channelId] = first.serverId;
      }
    }

    counts.serverCounts = serverCounts;
    counts.channelCounts = channelCounts;
    counts.channelServer = channelServer;
    counts.totalUnread = totalUnread;
  });
}

export function hydrateUnread(
  entries: MentionUnreadEntry[],
  userId?: string | null
): void {
  const filtered = entries.filter(
    (entry) =>
      !(userId && entry.senderId && String(entry.senderId) === String(userId))
  );
  if (filtered.length === 0) return;

  mutate((byChannel, counts) => {
    for (const entry of filtered) {
      let channelMap = byChannel.get(entry.channelId);
      if (!channelMap) {
        channelMap = new Map();
        byChannel.set(entry.channelId, channelMap);
      }
      const isNew = !channelMap.has(entry.id);
      channelMap.set(entry.id, entry);

      // On backends without authoritative counts, hydrate must also seed the
      // derived counts (only for channels the snapshot has not counted yet,
      // so it can never override authoritative values).
      if (isNew && counts.channelCounts[entry.channelId] === undefined) {
        counts.channelCounts[entry.channelId] =
          (counts.channelCounts[entry.channelId] ?? 0) + 1;
        counts.totalUnread += 1;
        if (entry.serverId) {
          counts.channelServer[entry.channelId] = entry.serverId;
          counts.serverCounts[entry.serverId] =
            (counts.serverCounts[entry.serverId] ?? 0) + 1;
        }
      }
    }
  });
}

export function resolvePendingServerIds(
  resolve: (channelId: string, serverName?: string) => string | undefined
): void {
  const pending: MentionUnreadEntry[] = [];
  for (const channelMap of snapshot.byChannel.values()) {
    for (const entry of channelMap.values()) {
      if (!entry.serverId) pending.push(entry);
    }
  }
  if (pending.length === 0) return;

  const resolvedIds = new Map<string, string>();
  for (const entry of pending) {
    const resolved = resolve(entry.channelId, entry.serverName);
    if (resolved) resolvedIds.set(entry.id, resolved);
  }
  if (resolvedIds.size === 0) return;

  mutate((byChannel, counts) => {
    for (const channelMap of byChannel.values()) {
      for (const [id, entry] of channelMap) {
        const serverId = resolvedIds.get(id);
        if (!serverId || entry.serverId === serverId) continue;
        channelMap.set(id, { ...entry, serverId });
        const alreadyCounted = counts.channelServer[entry.channelId] === serverId;
        if (!alreadyCounted) {
          counts.channelServer[entry.channelId] = serverId;
          counts.serverCounts[serverId] = (counts.serverCounts[serverId] ?? 0) + 1;
        }
      }
    }
  });
}

export function removeUnreadMention(raw: unknown): void {
  const id = readMentionId(raw);
  if (!id) return;

  mutate((byChannel, counts) => {
    for (const [channelId, channelMap] of byChannel) {
      if (!channelMap.has(id)) continue;
      const next = new Map(channelMap);
      next.delete(id);
      if (next.size === 0) {
        byChannel.delete(channelId);
      } else {
        byChannel.set(channelId, next);
      }
      const channelCount = Math.max(0, (counts.channelCounts[channelId] ?? 0) - 1);
      if (channelCount === 0) {
        delete counts.channelCounts[channelId];
        delete counts.channelServer[channelId];
      } else {
        counts.channelCounts[channelId] = channelCount;
      }
      counts.totalUnread = Math.max(0, counts.totalUnread - 1);
      return;
    }
  });
}

function readMentionId(raw: unknown): string | undefined {
  if (typeof raw === "string") return raw;
  if (!raw || typeof raw !== "object") return undefined;
  const body = (raw as any).payload ?? raw;
  return (
    readStr(body, ["id", "mention_id", "mentionId", "notification_id"]) ??
    readStr(body?.mention, ["id", "mention_id", "mentionId"]) ??
    readStr(body, ["message_id", "messageId"])
  );
}

export function removeChannelUnreadLocal(
  channelId: string
): MentionUnreadEntry[] {
  const channelMap = snapshot.byChannel.get(channelId);
  if (!channelMap || channelMap.size === 0) return [];

  const removed = Array.from(channelMap.values());
  mutate((byChannel, counts) => {
    byChannel.delete(channelId);
    const removedCount = removed.length;
    const channelCount = Math.max(
      0,
      (counts.channelCounts[channelId] ?? 0) - removedCount
    );
    if (channelCount === 0) {
      delete counts.channelCounts[channelId];
    } else {
      counts.channelCounts[channelId] = channelCount;
    }
    const serverId = counts.channelServer[channelId];
    if (serverId) {
      const serverCount = Math.max(
        0,
        (counts.serverCounts[serverId] ?? 0) - removedCount
      );
      if (serverCount === 0) {
        delete counts.serverCounts[serverId];
      } else {
        counts.serverCounts[serverId] = serverCount;
      }
    }
    delete counts.channelServer[channelId];
    counts.totalUnread = Math.max(0, counts.totalUnread - removedCount);
  });
  return removed;
}

/** Roll back an optimistic read: restore entries and counts for them. */
export function restoreUnreadEntries(entries: MentionUnreadEntry[]): void {
  if (entries.length === 0) return;

  mutate((byChannel, counts) => {
    for (const entry of entries) {
      let channelMap = byChannel.get(entry.channelId);
      if (!channelMap) {
        channelMap = new Map();
        byChannel.set(entry.channelId, channelMap);
      }
      if (channelMap.has(entry.id)) continue;
      channelMap.set(entry.id, entry);
      counts.channelCounts[entry.channelId] =
        (counts.channelCounts[entry.channelId] ?? 0) + 1;
      counts.totalUnread += 1;
      if (entry.serverId) {
        counts.channelServer[entry.channelId] = entry.serverId;
        counts.serverCounts[entry.serverId] =
          (counts.serverCounts[entry.serverId] ?? 0) + 1;
      }
    }
  });
}

/** Resolve a channel's server id from authoritative data when known. */
export function resolveChannelServerId(channelId: string): string | undefined {
  return snapshot.channelServer[channelId];
}

export function pruneServerChannels(
  serverId: string,
  knownChannelIds: ReadonlySet<string>
): void {
  mutate((byChannel, counts) => {
    for (const [channelId, channelMap] of byChannel) {
      const first = Array.from(channelMap.values())[0];
      if (first?.serverId === serverId && !knownChannelIds.has(channelId)) {
        const removed = channelMap.size;
        byChannel.delete(channelId);
        delete counts.channelCounts[channelId];
        delete counts.channelServer[channelId];
        counts.totalUnread = Math.max(0, counts.totalUnread - removed);
      }
    }
    for (const [channelId, sid] of Object.entries(counts.channelServer)) {
      if (sid === serverId && !knownChannelIds.has(channelId)) {
        delete counts.channelCounts[channelId];
      }
    }
  });
}

export function pruneServers(knownServerIds: ReadonlySet<string>): void {
  mutate((byChannel, counts) => {
    for (const [channelId, channelMap] of byChannel) {
      const first = Array.from(channelMap.values())[0];
      if (first?.serverId && !knownServerIds.has(first.serverId)) {
        const removed = channelMap.size;
        byChannel.delete(channelId);
        delete counts.channelCounts[channelId];
        delete counts.channelServer[channelId];
        counts.totalUnread = Math.max(0, counts.totalUnread - removed);
      }
    }
    for (const serverId of Object.keys(counts.serverCounts)) {
      if (!knownServerIds.has(serverId)) {
        delete counts.serverCounts[serverId];
      }
    }
  });
}

export const EMPTY_UNREAD_MENTIONS = EMPTY_MENTIONS;