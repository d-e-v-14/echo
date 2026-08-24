import {
  DmMessage,
  DmMessagesData,
  DmMessagesPage,
  DmReplyTarget,
} from "./types";

// ---------------------------------------------------------------------------
// Pure helpers for the DM message cache. These functions are shared by the
// DM chat UI (ChatPage), the send-message mutation and the socket realtime
// sync so that every writer merges messages through the same rules.
// ---------------------------------------------------------------------------

const isTempId = (id: string | number | undefined): boolean =>
  typeof id !== "undefined" && String(id).startsWith("temp-");

const isBlobUrl = (url?: string | null): boolean =>
  Boolean(url && String(url).startsWith("blob:"));

const isOptimisticMessage = (message: DmMessage): boolean =>
  isTempId(message.id) || isBlobUrl(message.media_url) || message.status === "pending";

const timestampMs = (timestamp: string): number => {
  const parsed = Date.parse(timestamp);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sortDmMessages = (messages: DmMessage[]): DmMessage[] =>
  [...messages].sort(
    (a, b) => timestampMs(a.timestamp) - timestampMs(b.timestamp)
  );

/**
 * Normalize a raw message coming from the REST API or a socket event into the
 * canonical DmMessage shape used by the cache.
 */
export const normalizeDmMessage = (message: any): DmMessage => ({
  id: String(
    message.id ??
      message.message_id ??
      `dm-${Math.random().toString(36).slice(2)}`
  ),
  content: String(message.content ?? message.message ?? ""),
  sender_id: String(message.sender_id ?? message.senderId ?? message.from ?? ""),
  receiver_id: String(
    message.receiver_id ?? message.receiverId ?? message.to ?? ""
  ),
  status: "sent",
  timestamp: String(message.timestamp ?? new Date(0).toISOString()),
  thread_id: message.thread_id ? String(message.thread_id) : undefined,
  media_url: message.media_url ?? message.mediaUrl ?? null,
  media_type: message.media_type,
  replyTo: normalizeReply(message),
});

const normalizeReply = (message: any): DmReplyTarget | null => {
  const source =
    message.reply_to_message ??
    message.reply_to ??
    message.replyTo;
  if (!source) return null;

  if (typeof source === "object") {
    return {
      id: String(source.id ?? source.message_id ?? ""),
      content: String(source.content ?? source.message ?? ""),
      author:
        source.users?.username ??
        source.user?.username ??
        source.author ??
        "User",
      mediaUrl: source.media_url ?? source.mediaUrl ?? null,
      mediaType: source.media_type,
    };
  }
  if (typeof source === "string" || typeof source === "number") {
    return { id: String(source), content: "Loading...", author: "User" };
  }
  return null;
};

/**
 * Resolve "Loading..." reply previews against the messages that are already
 * loaded in the current page so authors/contents are filled in client-side.
 */
export const resolveRepliesForThread = (
  threadMessages: DmMessage[],
  allUsers: Array<{ id: string; fullname?: string; username?: string }>,
  currentUserId?: string
): DmMessage[] => {
  if (!threadMessages || threadMessages.length === 0) return [];
  const messageMap = new Map(threadMessages.map((m) => [String(m.id), m]));

  return threadMessages.map((msg) => {
    if (!msg.replyTo || msg.replyTo.content !== "Loading...") return msg;

    const parent = messageMap.get(String(msg.replyTo.id));
    if (!parent) {
      return {
        ...msg,
        replyTo: { ...msg.replyTo, content: "Original message unavailable" },
      };
    }

    const isCurrentUser = parent.sender_id === currentUserId;
    const authorObj = allUsers.find((u) => u.id === parent.sender_id);
    const authorName = isCurrentUser
      ? "You"
      : authorObj?.fullname || authorObj?.username || "User";

    return {
      ...msg,
      replyTo: {
        ...msg.replyTo,
        content: parent.content,
        author: authorName,
        mediaUrl: parent.media_url,
        mediaType: parent.media_type,
      },
    };
  });
};

export const createDmMessagesData = (
  messages: DmMessage[],
  hasMore = false
): DmMessagesData => ({
  pages: [{ messages: sortDmMessages(messages), hasMore }],
  pageParams: [0],
});

export const flattenDmMessages = (data?: DmMessagesData): DmMessage[] => {
  if (!data?.pages) return [];
  return data.pages.flatMap((page) => page.messages);
};

/**
 * Merge a single incoming message into the newest page.
 *
 * Rules (in order):
 *  1. If a message with the same stable id already exists, keep the cache
 *     unchanged (deduplication across POST responses + socket events).
 *  2. If an optimistic temp message from the same sender with the same
 *     content was inserted recently, replace it with the real message.
 *  3. Otherwise append the message and re-sort the page by timestamp.
 */
export const mergeIntoPage = (
  page: DmMessagesPage,
  incoming: DmMessage
): DmMessagesPage => {
  if (page.messages.some((m) => String(m.id) === String(incoming.id))) {
    return page;
  }

  const incomingTime = timestampMs(incoming.timestamp);
  let replaced = false;
  const next = page.messages.map((m) => {
    if (replaced || !isOptimisticMessage(m)) return m;
    const sameSender = String(m.sender_id) === String(incoming.sender_id);
    const sameContent =
      (m.content || "").trim() === (incoming.content || "").trim();
    const nearInTime =
      Math.abs(timestampMs(m.timestamp) - incomingTime) < 15_000;
    if (sameSender && sameContent && nearInTime) {
      replaced = true;
      return {
        ...m,
        ...incoming,
        id: String(incoming.id),
        status: incoming.status ?? "sent",
        thread_id: incoming.thread_id ?? m.thread_id,
        media_url: incoming.media_url ?? m.media_url,
        content: incoming.content || m.content,
      };
    }
    return m;
  });

  if (replaced) return { ...page, messages: next };

  return { ...page, messages: sortDmMessages([...page.messages, incoming]) };
};

/**
 * Insert an incoming message into the whole infinite-query data structure.
 * New messages always land in the newest page (the last page).
 */
export const insertIncomingIntoPages = (
  data: DmMessagesData | undefined,
  incoming: DmMessage
): DmMessagesData | undefined => {
  if (!data || !Array.isArray(data.pages) || data.pages.length === 0) {
    return data;
  }

  const knownIds = new Set(
    data.pages.flatMap((page) => page.messages.map((m) => String(m.id)))
  );
  if (knownIds.has(String(incoming.id))) return data;

  const lastIndex = data.pages.length - 1;
  const pages = [...data.pages];
  pages[lastIndex] = mergeIntoPage(pages[lastIndex], incoming);
  return { ...data, pages };
};

export const insertIncomingIntoDataOrCreate = (
  data: DmMessagesData | undefined,
  incoming: DmMessage
): DmMessagesData => {
  if (!data) return createDmMessagesData([incoming]);
  return insertIncomingIntoPages(data, incoming) ?? data;
};

/**
 * Replace an optimistic temp message by its temp id with the confirmed
 * server message (used by the send mutation's success handler).
 */
export const replaceOptimisticById = (
  data: DmMessagesData,
  tempId: string,
  replacement: Partial<DmMessage> & { id: string }
): DmMessagesData => {
  let replaced = false;
  const pages = data.pages.map((page) => {
    const messages = page.messages.map((m) => {
      if (replaced || String(m.id) !== tempId) return m;
      replaced = true;
      return {
        ...m,
        ...replacement,
        id: String(replacement.id),
        status: replacement.status ?? "sent",
      };
    });
    return replaced ? { ...page, messages } : page;
  });
  return replaced ? { ...data, pages } : data;
};

export const markMessagesFailed = (
  data: DmMessagesData,
  tempIds: ReadonlySet<string>
): DmMessagesData => {
  const pages = data.pages.map((page) => ({
    ...page,
    messages: page.messages.map((m) =>
      tempIds.has(String(m.id)) ? { ...m, status: "failed" as const } : m
    ),
  }));
  return { ...data, pages };
};

/**
 * Mark a single message (optimistic temp id or confirmed id) as failed. Used
 * by the realtime sync on `message_error` so the optimistic bubble is flagged
 * without refetching the conversation.
 */
export const markMessageFailedById = (
  data: DmMessagesData,
  messageId: string
): DmMessagesData => {
  const id = String(messageId);
  const present = data.pages.some((page) =>
    page.messages.some((m) => String(m.id) === id)
  );
  if (!present) return data;
  return markMessagesFailed(data, new Set([id]));
};

/**
 * Reconcile a `message_confirmed` socket payload against the conversation:
 *  1. When the payload echoes a client temp id, swap that optimistic message
 *     for the confirmed server message.
 *  2. Otherwise fall back to insertIncomingIntoDataOrCreate, which dedupes by
 *     stable id and replaces matching optimistic messages by content.
 */
export const reconcileConfirmedMessage = (
  data: DmMessagesData | undefined,
  tempId: string | undefined,
  incoming: DmMessage
): DmMessagesData | undefined => {
  if (!data) return insertIncomingIntoDataOrCreate(data, incoming);

  if (tempId) {
    const replaced = replaceOptimisticById(data, tempId, incoming);
    if (replaced !== data) return replaced;
    return insertIncomingIntoPages(replaced, incoming) ?? replaced;
  }

  return insertIncomingIntoDataOrCreate(data, incoming);
};