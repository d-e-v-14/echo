import { unwrapSocketPayload } from "@/lib/dm/socketEvents";
import { normalizeChannelMessage } from "./messageUtils";
import type { ChannelMessage } from "./types";

const readString = (body: any, ...keys: string[]): string => {
  for (const key of keys) {
    const value = body?.[key];
    if (value !== undefined && value !== null) return String(value);
  }
  return "";
};

/**
 * Returns true when the event body looks like a channel message (it carries a
 * channel id). DM bodies only have a thread/receiver, so they are excluded.
 */
export const isChannelEventBody = (body: unknown): boolean => {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return b.channel_id != null || b.channelId != null;
};

/**
 * Resolve the channel a socket event belongs to.
 */
export const resolveChannelId = (body: unknown): string | null => {
  if (!isChannelEventBody(body)) return null;
  return readString(body, "channel_id", "channelId") || null;
};

/**
 * Convert an unwrapped socket event body into a ChannelMessage, or null when
 * the body does not represent a message.
 */
export const toChannelMessageFromSocket = (
  body: unknown,
  currentUserId: string
): ChannelMessage | null => {
  const raw = unwrapSocketPayload(body);
  if (!raw || typeof raw !== "object") return null;

  const message = normalizeChannelMessage(raw, currentUserId);
  if (message.id === undefined || message.id === null || !message.senderId) {
    return null;
  }
  return message;
};