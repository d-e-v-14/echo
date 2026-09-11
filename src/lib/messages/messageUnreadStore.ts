export interface MessageUnreadSnapshot {
  channelCounts: Readonly<Record<string, number>>;
  serverCounts: Readonly<Record<string, number>>;
  channelServer: Readonly<Record<string, string>>;
  totalUnread: number;
}

export interface MessageUnreadOptions {
  userId: string | null;
  username?: string | null;
  resolveServerId?: (channelId: string) => string | undefined;
  knownServerIds?: ReadonlySet<string> | null;
}

interface State {
  channelCounts: Record<string, number>;
  serverCounts: Record<string, number>;
  channelServer: Record<string, string>;
  totalUnread: number;
}

let snapshot: MessageUnreadSnapshot = createEmptySnapshot();
const listeners = new Set<() => void>();

let currentUserId: string | null = null;
let currentUsername: string | null = null;
let serverIdResolver: ((channelId: string) => string | undefined) | null = null;
let knownServerIds: ReadonlySet<string> | null = null;
let activeChannelId: string | null = null;

const STORAGE_PREFIX = "echo:message-unread:";
const seenMessageIds = new Set<string>();

export function resetSeenMessageIds(): void {
  seenMessageIds.clear();
}

function createEmptySnapshot(): MessageUnreadSnapshot {
  return {
    channelCounts: {},
    serverCounts: {},
    channelServer: {},
    totalUnread: 0,
  };
}

function cloneState(): State {
  return {
    channelCounts: { ...snapshot.channelCounts },
    serverCounts: { ...snapshot.serverCounts },
    channelServer: { ...snapshot.channelServer },
    totalUnread: snapshot.totalUnread,
  };
}

function commit(state: State) {
  snapshot = {
    channelCounts: { ...state.channelCounts },
    serverCounts: { ...state.serverCounts },
    channelServer: { ...state.channelServer },
    totalUnread: state.totalUnread,
  };
  persistMessageUnread();
  listeners.forEach((listener) => listener());
}

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function subscribeMessageUnread(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getMessageUnreadSnapshot(): MessageUnreadSnapshot {
  return snapshot;
}

const readStr = (obj: any, keys: string[]): string | undefined => {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (value !== undefined && value !== null && typeof value === "string") {
      return value;
    }
    if (value !== undefined && value !== null && typeof value === "number") {
      return String(value);
    }
  }
  return undefined;
};

function unwrapEnvelope(payload: unknown): any {
  if (payload && typeof payload === "object" && "payload" in payload) {
    return (payload as any).payload;
  }
  return payload;
}

export function resetMessageUnreadStore(): void {
  currentUserId = null;
  currentUsername = null;
  serverIdResolver = null;
  knownServerIds = null;
  activeChannelId = null;
  seenMessageIds.clear();
  snapshot = createEmptySnapshot();
  emitChange();
}

export function configureMessageUnreadStore(options: MessageUnreadOptions): void {
  const userChanged = currentUserId !== options.userId;
  serverIdResolver = options.resolveServerId ?? null;
  currentUsername = options.username ?? null;
  knownServerIds = options.knownServerIds ?? null;

  if (!options.userId) {
    currentUserId = null;
    activeChannelId = null;
    seenMessageIds.clear();
    snapshot = createEmptySnapshot();
    emitChange();
    return;
  }

  if (userChanged) {
    currentUserId = options.userId;
    activeChannelId = null;
    seenMessageIds.clear();
    hydrateMessageUnread();
  }
}

export function markChannelMessageRead(channelId: string): void {
  if (!channelId) return;
  const state = cloneState();
  const count = state.channelCounts[channelId] ?? 0;
  if (count <= 0) return;

  delete state.channelCounts[channelId];
  const serverId = state.channelServer[channelId];
  delete state.channelServer[channelId];
  if (serverId) {
    state.serverCounts[serverId] = Math.max(0, (state.serverCounts[serverId] ?? 0) - count);
    if ((state.serverCounts[serverId] ?? 0) === 0) delete state.serverCounts[serverId];
  }
  state.totalUnread = Math.max(0, state.totalUnread - count);
  commit(state);
}

export function markServerMessageRead(serverId: string): void {
  if (!serverId) return;
  const state = cloneState();
  let removed = 0;
  for (const [channelId, sid] of Object.entries(state.channelServer)) {
    if (sid !== serverId) continue;
    removed += state.channelCounts[channelId] ?? 0;
    delete state.channelCounts[channelId];
    delete state.channelServer[channelId];
  }
  if (removed === 0) return;
  delete state.serverCounts[serverId];
  state.totalUnread = Math.max(0, state.totalUnread - removed);
  commit(state);
}

export function setActiveMessageChannel(channelId: string | null): void {
  const previous = activeChannelId;
  activeChannelId = channelId;
  if (channelId && channelId !== previous) {
    markChannelMessageRead(channelId);
  }
  emitChange();
}

export function getActiveMessageChannel(): string | null {
  return activeChannelId;
}

export function resolveChannelMessageServerId(channelId: string): string | undefined {
  return snapshot.channelServer[channelId] ?? serverIdResolver?.(channelId);
}

function isMentionContent(content: string | undefined): boolean {
  if (!content) return false;
  if (content.includes("@everyone")) return true;
  if (!currentUsername) return false;
  return content.includes(`@${currentUsername}`);
}

export function applyChannelMessage(
  raw: unknown,
  currentUserIdValue: string
): void {
  if (!currentUserIdValue) return;
  const body = unwrapEnvelope(raw);
  if (!body || typeof body !== "object") return;

  const channelId = readStr(body, ["channel_id", "channelId"]);
  if (!channelId) return;
  if (activeChannelId && channelId === activeChannelId) return;

  const senderId = readStr(body, ["sender_id", "senderId"]);
  if (senderId && String(senderId) === String(currentUserIdValue)) return;

  const messageId = readStr(body, ["id", "message_id", "messageId"]);
  if (messageId) {
    const dedupeKey = `${channelId}:${messageId}`;
    if (seenMessageIds.has(dedupeKey)) return;
    seenMessageIds.add(dedupeKey);
  }

  const content = readStr(body, ["content"]);
  if (isMentionContent(content)) return;

  const serverId = snapshot.channelServer[channelId] ?? serverIdResolver?.(channelId);
  if (knownServerIds && serverId && !knownServerIds.has(serverId)) return;

  const state = cloneState();
  state.channelCounts[channelId] = (state.channelCounts[channelId] ?? 0) + 1;
  state.totalUnread += 1;
  if (serverId) {
    state.channelServer[channelId] = serverId;
    state.serverCounts[serverId] = (state.serverCounts[serverId] ?? 0) + 1;
  }
  commit(state);
}

export function pruneMessageServers(knownServerIds: ReadonlySet<string>): void {
  const state = cloneState();
  let removed = 0;
  for (const [channelId, sid] of Object.entries(state.channelServer)) {
    if (knownServerIds.has(sid)) continue;
    removed += state.channelCounts[channelId] ?? 0;
    delete state.channelCounts[channelId];
    delete state.channelServer[channelId];
  }
  for (const serverId of Object.keys(state.serverCounts)) {
    if (knownServerIds.has(serverId)) continue;
    delete state.serverCounts[serverId];
  }
  if (removed === 0 && Object.keys(state.serverCounts).length === 0) return;
  state.totalUnread = Math.max(0, state.totalUnread - removed);
  commit(state);
}

export function pruneMessageChannels(
  serverId: string,
  knownChannelIds: ReadonlySet<string>
): void {
  if (!serverId) return;
  const state = cloneState();
  let removed = 0;
  for (const [channelId, sid] of Object.entries(state.channelServer)) {
    if (sid !== serverId) continue;
    if (knownChannelIds.has(channelId)) continue;
    removed += state.channelCounts[channelId] ?? 0;
    delete state.channelCounts[channelId];
    delete state.channelServer[channelId];
  }
  if (removed === 0) return;
  state.serverCounts[serverId] = Math.max(0, (state.serverCounts[serverId] ?? 0) - removed);
  if ((state.serverCounts[serverId] ?? 0) === 0) delete state.serverCounts[serverId];
  state.totalUnread = Math.max(0, state.totalUnread - removed);
  commit(state);
}

function storageKey(): string {
  return `${STORAGE_PREFIX}${currentUserId ?? "none"}`;
}

function persistMessageUnread(): void {
  if (!currentUserId || typeof window === "undefined") return;
  try {
    localStorage.setItem(
      storageKey(),
      JSON.stringify({
        channelCounts: snapshot.channelCounts,
        serverCounts: snapshot.serverCounts,
        channelServer: snapshot.channelServer,
        totalUnread: snapshot.totalUnread,
      })
    );
  } catch {}
}

function hydrateMessageUnread(): void {
  snapshot = createEmptySnapshot();
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return;
    const parsed = JSON.parse(raw);
    const state: State = {
      channelCounts:
        parsed?.channelCounts && typeof parsed.channelCounts === "object"
          ? { ...parsed.channelCounts }
          : {},
      serverCounts:
        parsed?.serverCounts && typeof parsed.serverCounts === "object"
          ? { ...parsed.serverCounts }
          : {},
      channelServer:
        parsed?.channelServer && typeof parsed.channelServer === "object"
          ? { ...parsed.channelServer }
          : {},
      totalUnread:
        typeof parsed?.totalUnread === "number" && parsed.totalUnread > 0
          ? parsed.totalUnread
          : 0,
    };
    snapshot = {
      channelCounts: { ...state.channelCounts },
      serverCounts: { ...state.serverCounts },
      channelServer: { ...state.channelServer },
      totalUnread: state.totalUnread,
    };
  } catch {
    snapshot = createEmptySnapshot();
  }
}