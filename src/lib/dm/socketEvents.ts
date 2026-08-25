import { normalizeDmMessage } from "./messageUtils";
import type { DmMessage } from "./types";

export const unwrapSocketPayload = (raw: unknown): unknown => {
  if (raw && typeof raw === "object" && "payload" in raw) {
    return (raw as { payload: unknown }).payload;
  }
  return raw;
};

const readString = (body: any, ...keys: string[]): string => {
  for (const key of keys) {
    const value = body?.[key];
    if (value !== undefined && value !== null) return String(value);
  }
  return "";
};

export const isDmEventBody = (body: unknown): boolean => {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    b.thread_id != null ||
    b.threadId != null ||
    b.receiver_id != null ||
    b.receiverId != null ||
    b.to != null
  );
};

export const resolveDmConversationId = (
  body: unknown,
  currentUserId?: string
): string | null => {
  if (!currentUserId) return null;
  if (!isDmEventBody(body)) return null;
  const b = body as Record<string, unknown>;
  const sender = readString(b, "sender_id", "senderId", "from", "userId");
  const receiver = readString(b, "receiver_id", "receiverId", "to");

  if (sender && sender !== currentUserId) return sender;
  if (receiver && receiver !== currentUserId) return receiver;
  return null;
};

export const toDmMessageFromSocket = (body: unknown): DmMessage | null => {
  if (!body || typeof body !== "object") return null;
  const message = normalizeDmMessage(body);
  if (!message.sender_id && !message.receiver_id && !message.thread_id) {
    return null;
  }
  return message;
};