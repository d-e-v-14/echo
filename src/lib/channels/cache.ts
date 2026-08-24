import {
  ChannelMessage,
  ChannelMessagesData,
  ChannelMessagesPage,
  ChannelPermissions,
} from "./types";

// ---------------------------------------------------------------------------
// Single cache-mutation utility for channel messages.
//
// Every writer (REST fetch pages, the socket realtime sync, the optimistic
// send mutation) mutates the SAME normalized ChannelMessagesData structure so
// the rules stay in one place: insert, replace-optimistic, update (edit /
// reaction / pin), delete, and status marking.
//
// pages[0] is the oldest window and the last page is the newest window; new
// and optimistic messages always land in the last (newest) page.
// ---------------------------------------------------------------------------

const timestampMs = (timestamp: string): number => {
  const ms = new Date(timestamp).getTime();
  return Number.isNaN(ms) ? 0 : ms;
};

const sortMessages = (messages: ChannelMessage[]): ChannelMessage[] =>
  [...messages].sort(
    (a, b) => timestampMs(a.timestamp) - timestampMs(b.timestamp)
  );

const isOptimisticMessage = (message: ChannelMessage): boolean =>
  String(message.id).startsWith("temp-") ||
  Boolean(message.mediaUrl && String(message.mediaUrl).startsWith("blob:")) ||
  message.status === "pending";

export const createChannelMessagesData = (
  messages: ChannelMessage[],
  hasMore = false,
  nextCursor: string | null = null
): ChannelMessagesData => ({
  pages: [{ messages: sortMessages(messages), hasMore, nextCursor }],
  pageParams: [null],
});

export const flattenChannelMessages = (
  data?: ChannelMessagesData
): ChannelMessage[] => {
  if (!data?.pages) return [];
  return data.pages.flatMap((page) => page.messages);
};

/**
 * Merge a single incoming message into the newest page:
 *  1. Stable-id dedupe keeps the cache unchanged.
 *  2. An optimistic temp message from the same sender with the same content
 *     near in time is replaced by the confirmed message.
 *  3. Otherwise append and re-sort the page chronologically.
 */
const mergeIntoNewestPage = (
  page: ChannelMessagesPage,
  incoming: ChannelMessage
): ChannelMessagesPage => {
  if (page.messages.some((m) => String(m.id) === String(incoming.id))) {
    return page;
  }

  const incomingTime = timestampMs(incoming.timestamp);
  let replaced = false;
  const next = page.messages.map((m) => {
    if (replaced || !isOptimisticMessage(m)) return m;
    const sameSender = String(m.senderId) === String(incoming.senderId);
    const sameContent =
      (m.content || "").trim() === (incoming.content || "").trim();
    const nearInTime = Math.abs(timestampMs(m.timestamp) - incomingTime) < 15_000;
    if (sameSender && sameContent && nearInTime) {
      replaced = true;
      return {
        ...m,
        ...incoming,
        id: incoming.id,
        status: incoming.status ?? "sent",
      };
    }
    return m;
  });

  if (replaced) return { ...page, messages: next };

  return { ...page, messages: sortMessages([...page.messages, incoming]) };
};

/**
 * Insert an incoming (socket or optimistic) message into the whole
 * infinite-query data structure. New messages always land in the newest page.
 */
export const insertIncomingIntoPages = (
  data: ChannelMessagesData | undefined,
  incoming: ChannelMessage
): ChannelMessagesData | undefined => {
  if (!data || !Array.isArray(data.pages) || data.pages.length === 0) {
    return data;
  }

  const knownIds = new Set(
    data.pages.flatMap((page) => page.messages.map((m) => String(m.id)))
  );
  if (knownIds.has(String(incoming.id))) return data;

  const lastIndex = data.pages.length - 1;
  const pages = [...data.pages];
  pages[lastIndex] = mergeIntoNewestPage(pages[lastIndex], incoming);
  return { ...data, pages };
};

export const insertIncomingIntoDataOrCreate = (
  data: ChannelMessagesData | undefined,
  incoming: ChannelMessage
): ChannelMessagesData => {
  if (!data) return createChannelMessagesData([incoming]);
  return insertIncomingIntoPages(data, incoming) ?? data;
};

/**
 * Replace an optimistic temp message by its temp id with the confirmed server
 * message (used by the send mutation's success handler).
 */
export const replaceOptimisticById = (
  data: ChannelMessagesData,
  tempId: string | number,
  replacement: Partial<ChannelMessage> & { id: string | number }
): ChannelMessagesData => {
  let replaced = false;
  const pages = data.pages.map((page) => {
    const messages = page.messages.map((m) => {
      if (replaced || String(m.id) !== String(tempId)) return m;
      replaced = true;
      return {
        ...m,
        ...replacement,
        id: replacement.id,
        status: replacement.status ?? "sent",
      };
    });
    return replaced ? { ...page, messages } : page;
  });
  return replaced ? { ...data, pages } : data;
};

/**
 * Mark the given optimistic messages as failed (used by the send mutation's
 * error handler).
 */
export const markMessagesFailed = (
  data: ChannelMessagesData,
  tempIds: ReadonlySet<string>
): ChannelMessagesData => {
  const pages = data.pages.map((page) => ({
    ...page,
    messages: page.messages.map((m) =>
      tempIds.has(String(m.id)) ? { ...m, status: "failed" as const } : m
    ),
  }));
  return { ...data, pages };
};

/**
 * Generic in-place patch for a message by stable id. Used for edits, reaction
 * updates and pin/unpin toggles without rebuilding the window.
 */
export const updateMessageById = (
  data: ChannelMessagesData,
  messageId: string | number,
  updater: (message: ChannelMessage) => ChannelMessage
): ChannelMessagesData => {
  let changed = false;
  const pages = data.pages.map((page) => {
    const messages = page.messages.map((m) => {
      if (changed || String(m.id) !== String(messageId)) return m;
      changed = true;
      return updater(m);
    });
    return changed ? { ...page, messages } : page;
  });
  return changed ? { ...data, pages } : data;
};

/**
 * Mark a single message (optimistic temp id or confirmed id) as failed. Used
 * by the realtime sync on `message_error` so the optimistic bubble is flagged
 * without refetching the window.
 */
export const markMessageFailedById = (
  data: ChannelMessagesData,
  messageId: string | number
): ChannelMessagesData => {
  const id = String(messageId);
  const present = data.pages.some((page) =>
    page.messages.some((m) => String(m.id) === id)
  );
  if (!present) return data;
  return markMessagesFailed(data, new Set([id]));
};

/**
 * Reconcile a `message_confirmed` socket payload against the cached window:
 *  1. When the payload echoes a client temp id, swap that optimistic message
 *     for the confirmed server message.
 *  2. Otherwise fall back to insertIncomingIntoDataOrCreate, which dedupes by
 *     stable id and replaces matching optimistic messages by content.
 */
export const reconcileConfirmedMessage = (
  data: ChannelMessagesData | undefined,
  tempId: string | undefined,
  incoming: ChannelMessage
): ChannelMessagesData | undefined => {
  if (!data) return insertIncomingIntoDataOrCreate(data, incoming);

  if (tempId) {
    const replaced = replaceOptimisticById(data, tempId, incoming);
    if (replaced !== data) return replaced;
    // The optimistic bubble is already gone (replaced by a previous event or
    // the POST response); insert the confirmed message only if it is new.
    return insertIncomingIntoPages(replaced, incoming) ?? replaced;
  }

  return insertIncomingIntoDataOrCreate(data, incoming);
};

/**
 * Merge a channel object into a server's channel list, replacing the entry
 * with the same id or appending when it is new (channel_updated patch).
 * Works on any list whose entries carry an `id`.
 */
export const upsertChannelInList = <T extends { id: string | number }>(
  list: T[] | undefined,
  channel: T
): T[] | undefined => {
  if (!Array.isArray(list)) return list;
  const index = list.findIndex((c) => String(c.id) === String(channel.id));
  if (index === -1) return [...list, channel];
  return list.map((c, i) => (i === index ? { ...c, ...channel } : c));
};

/**
 * Build a server-channel list entry from a `channel_updated` socket payload.
 * Returns null when the payload does not carry a channel object.
 */
export const channelListItemFromPayload = (
  payload: unknown
): { id: string; name: string; type: string; is_private: boolean } | null => {
  const body: any =
    payload && typeof payload === "object" && "payload" in payload
      ? (payload as { payload: unknown }).payload
      : payload;
  if (!body || typeof body !== "object") return null;

  const channelId = readString(body, "channel_id", "channelId", "entityId");
  if (!channelId) return null;
  if (
    body?.name == null &&
    body?.type == null &&
    body?.is_private == null
  ) {
    return null;
  }

  return {
    id: channelId,
    name: String(body.name ?? ""),
    type: String(body.type ?? "text"),
    is_private: Boolean(body.is_private ?? false),
  };
};

/**
 * Build a ChannelPermissions object from a `channel_updated` /
 * `permissions_updated` socket payload. Returns null when the payload does not
 * carry any permission fields.
 */
export const channelPermissionsFromPayload = (
  payload: unknown
): ChannelPermissions | null => {
  const body: any =
    payload && typeof payload === "object" && "payload" in payload
      ? (payload as { payload: unknown }).payload
      : payload;
  if (!body || typeof body !== "object") return null;

  const hasAny =
    body?.canView != null ||
    body?.canSend != null ||
    body?.isAdmin != null ||
    body?.isModerator != null ||
    body?.channelType != null ||
    body?.channel_type != null;
  if (!hasAny) return null;

  return {
    channelType: String(body.channelType ?? body.channel_type ?? "normal"),
    canView: Boolean(body.canView ?? true),
    canSend: Boolean(body.canSend ?? true),
    isAdmin: Boolean(body.isAdmin ?? false),
    isModerator: Boolean(body.isModerator ?? false),
  };
};

function readString(body: any, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = body?.[key];
    if (value !== undefined && value !== null) return String(value);
  }
  return undefined;
}

/**
 * Delete a message by stable id across every loaded page.
 */
export const deleteMessageById = (
  data: ChannelMessagesData,
  messageId: string | number
): ChannelMessagesData => {
  let changed = false;
  const pages = data.pages.map((page) => {
    const messages = page.messages.filter((m) => {
      if (String(m.id) === String(messageId)) {
        changed = true;
        return false;
      }
      return true;
    });
    return changed ? { ...page, messages } : page;
  });
  return changed ? { ...data, pages } : data;
};