export interface MentionUnreadEntry {
  id: string;
  messageId: string;
  channelId: string;
  serverId?: string;
  serverName?: string;
  senderId?: string;
  senderUsername?: string;
  timestamp: string;
}

type MentionMap = ReadonlyMap<string, MentionUnreadEntry>;
type ChannelMap = ReadonlyMap<string, MentionMap>;

export interface UnreadSnapshot {
  byChannel: ChannelMap;
  channelCounts: Readonly<Record<string, number>>;
  serverCounts: Readonly<Record<string, number>>;
  serverUnread: Readonly<Record<string, boolean>>;
  serverChannels: ReadonlyMap<string, ReadonlyArray<string>>;
  channelMentions: ReadonlyMap<string, ReadonlyArray<MentionUnreadEntry>>;
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
    serverUnread: {},
    serverChannels: new Map(),
    channelMentions: new Map(),
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

function emitChange() {
  listeners.forEach((listener) => listener());
}

function cloneChannelMap(source: ChannelMap): Map<string, Map<string, MentionUnreadEntry>> {
  const cloned = new Map<string, Map<string, MentionUnreadEntry>>();
  for (const [channelId, mentions] of source) {
    cloned.set(channelId, new Map(mentions));
  }
  return cloned;
}

function buildSnapshot(
  byChannel: Map<string, Map<string, MentionUnreadEntry>>
): UnreadSnapshot {
  const channelCounts: Record<string, number> = {};
  const serverCounts: Record<string, number> = {};
  const serverUnread: Record<string, boolean> = {};
  const serverChannelSet = new Map<string, Set<string>>();
  const channelMentionsMap = new Map<string, MentionUnreadEntry[]>();

  for (const [channelId, mentions] of byChannel) {
    const entries = Array.from(mentions.values()).sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
    );
    channelCounts[channelId] = entries.length;
    channelMentionsMap.set(channelId, entries);

    for (const entry of entries) {
      if (!entry.serverId) continue;
      serverCounts[entry.serverId] = (serverCounts[entry.serverId] ?? 0) + 1;
      let channels = serverChannelSet.get(entry.serverId);
      if (!channels) {
        channels = new Set();
        serverChannelSet.set(entry.serverId, channels);
      }
      channels.add(channelId);
    }
  }

  for (const serverId of Object.keys(serverCounts)) {
    serverUnread[serverId] = (serverCounts[serverId] ?? 0) > 0;
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
    serverUnread,
    serverChannels,
    channelMentions,
  };
}

function mutate(
  mutator: (byChannel: Map<string, Map<string, MentionUnreadEntry>>) => void
) {
  const next = cloneChannelMap(snapshot.byChannel);
  mutator(next);
  snapshot = buildSnapshot(next);
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

  const timestamp =
    readStr(body, ["timestamp", "created_at", "occurredAt"]) ??
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
    timestamp,
  };
}

export function addUnreadMention(raw: unknown, userId?: string | null): void {
  const entry = normalizeMentionEntry(raw, userId);
  if (!entry) return;

  mutate((byChannel) => {
    let channelMap = byChannel.get(entry.channelId);
    if (!channelMap) {
      channelMap = new Map();
      byChannel.set(entry.channelId, channelMap);
    }
    if (!channelMap.has(entry.id)) {
      channelMap.set(entry.id, entry);
    }
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

  mutate((byChannel) => {
    for (const entry of filtered) {
      let channelMap = byChannel.get(entry.channelId);
      if (!channelMap) {
        channelMap = new Map();
        byChannel.set(entry.channelId, channelMap);
      }
      channelMap.set(entry.id, entry);
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

  mutate((byChannel) => {
    for (const channelMap of byChannel.values()) {
      for (const [id, entry] of channelMap) {
        const serverId = resolvedIds.get(id);
        if (!serverId || entry.serverId === serverId) continue;
        channelMap.set(id, { ...entry, serverId });
      }
    }
  });
}

export function removeUnreadMention(raw: unknown): void {
  const id = readMentionId(raw);
  if (!id) return;

  mutate((byChannel) => {
    for (const [channelId, channelMap] of byChannel) {
      if (!channelMap.has(id)) continue;
      const next = new Map(channelMap);
      next.delete(id);
      if (next.size === 0) {
        byChannel.delete(channelId);
      } else {
        byChannel.set(channelId, next);
      }
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
  mutate((byChannel) => {
    byChannel.delete(channelId);
  });
  return removed;
}

export function pruneServerChannels(
  serverId: string,
  knownChannelIds: ReadonlySet<string>
): void {
  mutate((byChannel) => {
    for (const [channelId, channelMap] of byChannel) {
      const first = Array.from(channelMap.values())[0];
      if (first?.serverId === serverId && !knownChannelIds.has(channelId)) {
        byChannel.delete(channelId);
      }
    }
  });
}

export function pruneServers(knownServerIds: ReadonlySet<string>): void {
  mutate((byChannel) => {
    for (const [channelId, channelMap] of byChannel) {
      const first = Array.from(channelMap.values())[0];
      if (first?.serverId && !knownServerIds.has(first.serverId)) {
        byChannel.delete(channelId);
      }
    }
  });
}

export const EMPTY_UNREAD_MENTIONS = EMPTY_MENTIONS;