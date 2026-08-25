import {
  ChannelMessage,
  ChannelMessagesData,
  ChannelMessagesPage,
  ChannelPermissions,
} from "./types";

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

export const reconcileConfirmedMessage = (
  data: ChannelMessagesData | undefined,
  tempId: string | undefined,
  incoming: ChannelMessage
): ChannelMessagesData | undefined => {
  if (!data) return insertIncomingIntoDataOrCreate(data, incoming);

  if (tempId) {
    const replaced = replaceOptimisticById(data, tempId, incoming);
    if (replaced !== data) return replaced;
    return insertIncomingIntoPages(replaced, incoming) ?? replaced;
  }

  return insertIncomingIntoDataOrCreate(data, incoming);
};

export const upsertChannelInList = <T extends { id: string | number }>(
  list: T[] | undefined,
  channel: T
): T[] | undefined => {
  if (!Array.isArray(list)) return list;
  const index = list.findIndex((c) => String(c.id) === String(channel.id));
  if (index === -1) return [...list, channel];
  return list.map((c, i) => (i === index ? { ...c, ...channel } : c));
};

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