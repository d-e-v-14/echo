import { apiClient } from "./axios";
import {
  Message,
  MessageReaction,
  MessageSearchResult,
  PinnedMessage,
} from "./types/message.types";
import { getUser } from "./profile.api";

type ReactionTarget = { message_id?: string; dm_message_id?: string };
type PinContext = { channel_id?: string; thread_id?: string };

type PinnedPayload = {
  id?: string | number;
  message_id?: string | number;
  dm_message_id?: string | number;
  pin_id?: string | number;
  content?: string;
  username?: string;
  sender_name?: string;
  timestamp?: string;
  pinned_at?: string;
  channel_id?: string;
  thread_id?: string;
  message?: {
    id?: string | number;
    content?: string;
    message?: string;
    username?: string;
    timestamp?: string;
    channel_id?: string;
    thread_id?: string;
    sender?: { username?: string };
  };
};

const normalizeArray = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const obj = payload as Record<string, unknown>;
    for (const key of ["data", "messages", "results", "pins", "reactions"]) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
};

export const uploadMessage = async (payload: {
  file?: File;
  content?: string;
  sender_id?: string;
  channel_id: string;
  reply_to?: string | number;
}): Promise<Message> => {
  try {
    const formData = new FormData();

    if (payload.sender_id) {
      formData.append("sender_id", payload.sender_id);
    }

    formData.append("channel_id", payload.channel_id);

    if (payload.content?.trim()) {
      formData.append("content", payload.content);
    }

    if (payload.reply_to !== undefined && payload.reply_to !== null) {
      formData.append("reply_to", String(payload.reply_to));
    }

    if (payload.file) {
      formData.append("file", payload.file);
    }

    const response = await apiClient.post("/api/message/upload", formData);

    return response.data;
  } catch (error) {
    console.error("Error uploading message:", error);
    throw error;
  }
};

export const uploaddm = async (payload: {
  mediaurl?: File;
  message?: string;
  sender_id?: string;
  receiver_id: string;
  reply_to?: string | number;
}) => {
  try {
    const formData = new FormData();

    formData.append("receiver_id", payload.receiver_id);

    if (payload.sender_id) {
      formData.append("sender_id", payload.sender_id);
    }

    if (payload.message?.trim()) {
      formData.append("content", payload.message);
    }

    if (payload.reply_to !== undefined && payload.reply_to !== null) {
      formData.append("reply_to", String(payload.reply_to));
    }

    if (payload.mediaurl) {
      formData.append("file", payload.mediaurl);
    }

    const response = await apiClient.post("/api/message/upload_dm", formData);

    return response.data;
  } catch (error) {
    console.error("Error uploading DM:", error);
    throw error;
  }
};

export interface FetchMessagesParams {
  limit?: number;
  before?: string;
  signal?: AbortSignal;
}

export interface FetchMessagesResult {
  messages: Message[];
  hasMore: boolean;
  nextCursor: string | null;
}

export const fetchMessages = async (
  channel_id: string,
  params: FetchMessagesParams = {}
): Promise<FetchMessagesResult> => {
  const { limit = 50, before, signal } = params;
  try {
    const response = await apiClient.get<{
      messages?: Message[];
      data?: Message[];
      nextCursor?: string | null;
      hasMore?: boolean;
    }>("/api/message/fetch", {
      params: {
        channel_id,
        limit,
        before,
      },
      signal,
    });

    return {
      messages: response.data.messages ?? response.data.data ?? [],
      nextCursor: response.data.nextCursor ?? null,
      hasMore: response.data.hasMore ?? false,
    };
  } catch (error) {
    console.error("Error fetching messages:", error);
    throw error;
  }
};

export const getDmThreadMessages = async (threadId: string, offset = 0) => {
  const response = await apiClient.get(`/api/message/dm/${threadId}`, {
    params: { offset },
  });

  return response.data;
};

export const getUserDMs = async (): Promise<{ data: any; success: boolean }> => {
  try {
    const user = await getUser();
    if (!user || !user.id) {
      throw new Error("User not authenticated");
    }

    const response = await apiClient.get(`/api/message/${user.id}/getDms`);

    return {
      data: response.data,
      success: true,
    };
  } catch (error: any) {
    if (error?.code === "ECONNABORTED") {
      console.error(" Request timed out");
      throw new Error("Request timed out. Please try again.");
    }

    if (error.message === "User not authenticated") {
      console.error(" Authentication error:", error.message);
      throw new Error("Please login to view messages");
    }

    console.error("Error fetching DMs:", error.message || error);
    throw new Error("Failed to fetch messages. Please try again later.");
  }
};

export const getUnreadMessageCounts = async (): Promise<{
  unreadCounts: Record<string, number>;
  totalUnread: number;
}> => {
  try {
    const user = await getUser();
    if (!user || !user.id) {
      throw new Error("User not authenticated");
    }

    const response = await apiClient.get(
      `/api/message/${user.id}/unread-counts`
    );
    return response.data;
  } catch (error: any) {
    console.error("Error fetching unread counts:", error.message || error);
    return { unreadCounts: {}, totalUnread: 0 };
  }
};

export const markThreadAsRead = async (threadId: string): Promise<void> => {
  try {
    const user = await getUser();
    if (!user || !user.id) {
      throw new Error("User not authenticated");
    }

    await apiClient.post(`/api/message/thread/${threadId}/mark-read`, {
      userId: user.id,
    });
  } catch (error: any) {
    console.error("Error marking thread as read:", error.message || error);
  }
};

export const getMessageReactions = async (
  target: ReactionTarget
): Promise<MessageReaction[]> => {
  const response = await apiClient.get("/api/message/reactions", {
    params: target,
  });
  return normalizeArray<MessageReaction>(response.data);
};

export const addMessageReaction = async (
  body: ReactionTarget & { emoji: string }
): Promise<void> => {
  await apiClient.post("/api/message/reactions", body);
};

export const removeMessageReaction = async (
  body: ReactionTarget & { emoji: string }
): Promise<void> => {
  await apiClient.delete("/api/message/reactions", { data: body });
};

export const searchServerMessages = async (
  serverId: string,
  query: string
): Promise<MessageSearchResult[]> => {
  const response = await apiClient.get(
    `/api/message/search/server/${serverId}`,
    { params: { q: query } }
  );
  return normalizeArray<MessageSearchResult>(response.data).map((item) => ({
    ...item,
    id: String(item.id ?? (item as any).message_id ?? ""),
  }));
};

export const searchDmMessages = async (
  threadId: string,
  query: string
): Promise<MessageSearchResult[]> => {
  const response = await apiClient.get(`/api/message/search/dm/${threadId}`, {
    params: { q: query },
  });
  return normalizeArray<MessageSearchResult>(response.data).map((item) => ({
    ...item,
    id: String(item.id ?? (item as any).dm_message_id ?? ""),
  }));
};

export const getPinnedMessages = async (
  context: PinContext
): Promise<PinnedMessage[]> => {
  const response = await apiClient.get("/api/message/pins", {
    params: context,
  });
  return normalizeArray<PinnedPayload>(response.data).map((pin) => ({
    id: String(
      pin.id ?? pin.message_id ?? pin.dm_message_id ?? pin.pin_id ?? ""
    ),
    message_id: pin.message_id ? String(pin.message_id) : undefined,
    dm_message_id: pin.dm_message_id ? String(pin.dm_message_id) : undefined,
    content: pin.content ?? pin.message?.content ?? pin.message?.message ?? "",
    username:
      pin.username ??
      pin.sender_name ??
      pin.message?.username ??
      pin.message?.sender?.username,
    timestamp: pin.timestamp ?? pin.message?.timestamp ?? pin.pinned_at,
    channel_id: pin.channel_id ?? pin.message?.channel_id,
    thread_id: pin.thread_id ?? pin.message?.thread_id,
  }));
};

export const pinMessage = async (body: {
  message_id?: string;
  dm_message_id?: string;
}): Promise<void> => {
  await apiClient.post("/api/message/pins", body);
};

export const unpinMessage = async (body: {
  message_id?: string;
  dm_message_id?: string;
}): Promise<void> => {
  await apiClient.delete("/api/message/pins", { data: body });
};
