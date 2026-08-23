import {
  ChannelMessage,
  MessageReply,
  MessageSection,
  DEFAULT_AVATAR,
} from "./types";

const timestampMs = (value: string | undefined): number => {
  const ms = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(ms) ? 0 : ms;
};

export const isNonEmptyTimestamp = (value?: string): boolean => {
  if (!value) return false;
  const ms = new Date(value).getTime();
  return !Number.isNaN(ms);
};

export const formatDayLabel = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "Recent";

  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const formatMessageTime = (timestamp: string): string => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
};

export const extractAvatarFromRaw = (raw: unknown): string | undefined => {
  const source = raw as any;
  return (
    source?.avatar_url ||
    source?.users?.avatar_url ||
    source?.sender?.avatar_url ||
    source?.sender?.users?.avatar_url ||
    source?.sender?.profile?.avatar_url
  );
};

export const extractReplyFromRaw = (raw: any): MessageReply | null => {
  const primary = raw?.reply_to_message ?? raw?.reply_to;
  const secondary = raw?.replyTo;

  const mapReply = (src: any): MessageReply | null => {
    if (src && typeof src === "object") {
      return {
        id: String(src.id ?? src.message_id ?? ""),
        content: String(src.content ?? src.message ?? ""),
        author:
          src.users?.username || src.user?.username || src.author || "Unknown",
        avatarUrl:
          src.users?.avatar_url || src.user?.avatar_url || DEFAULT_AVATAR,
        mediaUrl: src.media_url || src.mediaUrl || null,
        mediaType: src.media_type,
      };
    }
    if (typeof src === "string" || typeof src === "number") {
      return { id: String(src), content: "Loading...", author: "Unknown" };
    }
    return null;
  };

  return mapReply(primary) ?? mapReply(secondary) ?? null;
};

export const normalizeChannelMessage = (
  raw: any,
  currentUserId: string,
  avatarUrl?: string
): ChannelMessage => {
  const senderId = raw?.sender_id || raw?.senderId || "";
  const replyTo = extractReplyFromRaw(raw);

  return {
    id: raw?.id,
    content: raw?.content || raw?.message || "",
    senderId,
    timestamp: raw?.timestamp || new Date().toISOString(),
    avatarUrl,
    username:
      senderId === currentUserId
        ? "You"
        : raw?.username ||
          raw?.sender?.username ||
          raw?.sender?.fullname ||
          raw?.sender_name ||
          "Unknown",
    mediaUrl: raw?.media_url || raw?.mediaUrl,
    mediaType: raw?.media_type,
    replyTo,
  };
};

export const resolveReplyTargets = (
  messages: ChannelMessage[]
): ChannelMessage[] => {
  const messageMap = new Map(messages.map((m) => [String(m.id), m]));

  return messages.map((msg) => {
    if (!msg.replyTo) return msg;

    const parent = messageMap.get(String(msg.replyTo.id));

    if (parent) {
      return {
        ...msg,
        replyTo: {
          ...msg.replyTo,
          content:
            msg.replyTo.content === "Loading..." || !msg.replyTo.content
              ? parent.content
              : msg.replyTo.content,
          author:
            msg.replyTo.author === "Unknown"
              ? parent.username || "User"
              : msg.replyTo.author,
          mediaUrl: msg.replyTo.mediaUrl || parent.mediaUrl,
          mediaType: msg.replyTo.mediaType || parent.mediaType,
          avatarUrl:
            msg.replyTo.avatarUrl === DEFAULT_AVATAR
              ? parent.avatarUrl
              : msg.replyTo.avatarUrl,
        },
      };
    }

    if (msg.replyTo.content === "Loading...") {
      return {
        ...msg,
        replyTo: { ...msg.replyTo, content: "Original message unavailable" },
      };
    }

    return msg;
  });
};

export const dedupeAndSortByTime = (
  messages: ChannelMessage[]
): ChannelMessage[] => {
  const seen = new Set<string | number>();
  const unique: ChannelMessage[] = [];

  for (const msg of messages) {
    if (msg.id === undefined || msg.id === null || seen.has(msg.id)) continue;
    seen.add(msg.id);
    unique.push(msg);
  }

  return unique.sort(
    (a, b) => timestampMs(a.timestamp) - timestampMs(b.timestamp)
  );
};

export const prependOlderMessages = (
  current: ChannelMessage[],
  older: ChannelMessage[]
): ChannelMessage[] => {
  const existingIds = new Set(current.map((msg) => msg.id));
  const fresh = older.filter((msg) => !existingIds.has(msg.id));
  return [...fresh, ...current];
};

export const mergeIncomingMessage = (
  current: ChannelMessage[],
  incoming: ChannelMessage,
  currentUserId: string
): ChannelMessage[] => {
  if (current.some((msg) => msg.id === incoming.id)) return current;

  let tempReplyToFallback: MessageReply | null = null;

  const filtered = current.filter((msg) => {
    const isDuplicate =
      msg.senderId === currentUserId &&
      msg.content === incoming.content &&
      Math.abs(timestampMs(msg.timestamp) - timestampMs(incoming.timestamp)) <
        5000;

    if (isDuplicate && msg.replyTo) tempReplyToFallback = msg.replyTo;
    return !isDuplicate;
  });

  const merged: ChannelMessage = {
    ...incoming,
    replyTo: mergeReplyFallback(incoming.replyTo ?? null, tempReplyToFallback),
  };

  return [...filtered, merged].sort(
    (a, b) => timestampMs(a.timestamp) - timestampMs(b.timestamp)
  );
};

const mergeReplyFallback = (
  replyTo: MessageReply | null,
  fallback: MessageReply | null
): MessageReply | null => {
  if (fallback && replyTo) {
    return {
      ...replyTo,
      mediaUrl: replyTo.mediaUrl || fallback.mediaUrl,
      mediaType: replyTo.mediaType || fallback.mediaType,
    };
  }
  return fallback || replyTo;
};

export const shouldAddOptimisticMessage = (
  current: ChannelMessage[],
  optimistic: ChannelMessage,
  currentUserId: string
): boolean => {
  return !current.some(
    (msg) =>
      msg.senderId === currentUserId &&
      msg.content === optimistic.content &&
      Math.abs(timestampMs(msg.timestamp) - timestampMs(optimistic.timestamp)) <
        2000
  );
};

export const reconcileOptimisticMessage = (
  current: ChannelMessage[],
  tempId: string | number,
  replacement: { id: string | number; content?: string; mediaUrl?: string }
): ChannelMessage[] => {
  if (current.some((m) => String(m.id) === String(replacement.id))) {
    return current.filter((m) => m.id !== tempId);
  }

  const idx = current.findIndex((m) => m.id === tempId);
  if (idx === -1) return current;

  const next = [...current];
  next[idx] = {
    ...next[idx],
    id: replacement.id,
    content: replacement.content ?? next[idx].content,
    mediaUrl: replacement.mediaUrl ?? next[idx].mediaUrl,
    status: "sent",
    replyTo: next[idx].replyTo,
  };

  return next;
};

export const removeOptimisticMessage = (
  current: ChannelMessage[],
  tempId: string | number
): ChannelMessage[] => current.filter((m) => m.id !== tempId);

export const findUnreadDividerIndex = (
  messages: ChannelMessage[],
  lastReadTimestamp: string | null,
  currentUserId: string
): number => {
  if (!lastReadTimestamp) return -1;
  const lastReadMs = timestampMs(lastReadTimestamp);

  for (let i = 0; i < messages.length; i++) {
    const isDivider =
      messages[i].senderId !== currentUserId &&
      timestampMs(messages[i].timestamp) > lastReadMs &&
      (i === 0 || timestampMs(messages[i - 1].timestamp) <= lastReadMs);

    if (isDivider) return i;
  }

  return -1;
};

export const isContentMentioningCurrentUser = (
  content: string | undefined,
  currentUsername: string
): boolean => {
  if (!currentUsername) return false;
  return !!content?.includes(`@${currentUsername}`);
};

export const isCodeBlock = (content?: string): boolean => {
  if (!content) return false;
  return /```(?:\w+)?\n?[\s\S]*?```/.test(content);
};

export const isReplyImage = (
  mediaUrl?: string | null,
  mediaType?: string
): boolean => {
  if (!mediaUrl) return false;
  const ext = mediaUrl.split("?")[0].split(".").pop()?.toLowerCase() || "";
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
  return (
    mediaUrl.startsWith("blob:") ||
    imageExts.includes(ext) ||
    Boolean(mediaType?.startsWith("image/"))
  );
};

export const groupMessagesForDisplay = (
  messages: ChannelMessage[],
  currentUserId: string,
  options: { timeWindowMs?: number } = {}
): MessageSection[] => {
  const timeWindowMs = options.timeWindowMs ?? 5 * 60 * 1000;
  const sections: MessageSection[] = [];

  for (const msg of messages) {
    const timestamp = new Date(msg.timestamp);
    const dayLabel = formatDayLabel(msg.timestamp);

    let section = sections[sections.length - 1];
    if (!section || section.dayLabel !== dayLabel) {
      section = { dayLabel, groups: [] };
      sections.push(section);
    }

    const isSender = msg.senderId === currentUserId;
    let group = section.groups[section.groups.length - 1];

    const lastInGroup = group?.messages[group.messages.length - 1];
    const isSameSender = group?.senderId === msg.senderId;
    const isCloseInTime = lastInGroup
      ? timestamp.getTime() - timestampMs(lastInGroup.timestamp) <= timeWindowMs
      : true;

    if (!group || !isSameSender || !isCloseInTime) {
      group = {
        key: `${dayLabel}-${msg.senderId}-${msg.id}`,
        senderId: msg.senderId,
        name: msg.username ?? (isSender ? "You" : "Unknown"),
        isSender,
        avatarUrl: msg.avatarUrl,
        messages: [],
      };
      section.groups.push(group);
    }

    group.messages.push({
      ...msg,
      timeLabel: formatMessageTime(msg.timestamp),
    });
  }

  return sections;
};
