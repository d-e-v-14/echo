import {
  DmMessage,
  DmMessagesData,
  DmMessagesPage,
  DmReplyTarget,
  DmSummary,
} from "./types";

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

export const mergeDmSummaries = (
  remote: Map<string, DmSummary>,
  local: Map<string, DmSummary>
): Map<string, DmSummary> => {
  const next = new Map(remote);
  let changed = false;
  for (const [id, localSummary] of local) {
    const remoteSummary = next.get(id);
    const localTs = Date.parse(localSummary.timestamp) || 0;
    const remoteTs = remoteSummary ? Date.parse(remoteSummary.timestamp) || 0 : 0;
    if (!remoteSummary || localTs > remoteTs) {
      next.set(id, localSummary);
      changed = true;
    }
  }
  return changed ? next : remote;
};

export const sortDmConversationsByLatest = <
  T extends { timestamp: string; user: { id: string } }
>(
  conversations: T[]
): T[] =>
  [...conversations].sort((a, b) => {
    const timeA = Date.parse(a.timestamp) || 0;
    const timeB = Date.parse(b.timestamp) || 0;
    return timeB - timeA;
  });