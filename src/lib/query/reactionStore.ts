import { useSyncExternalStore } from "react";

export type ReactionUsersByEmoji = Record<string, string[]>;
export type ReactionStoreData = Record<string, ReactionUsersByEmoji>;

export interface ReactionDelta {
  messageId: string;
  emoji: string;
  userId?: string;
  added?: boolean;
}

const EMPTY: ReactionStoreData = Object.freeze({});

let state: ReactionStoreData = EMPTY;
const listeners = new Set<() => void>();

function setState(next: ReactionStoreData): void {
  state = next;
  for (const listener of listeners) listener();
}

export function getReactionState(): ReactionStoreData {
  return state;
}

export function subscribeReactions(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useReactionStore(): ReactionStoreData {
  return useSyncExternalStore(subscribeReactions, getReactionState);
}

export function updateReactionStore(
  updater: (prev: ReactionStoreData) => ReactionStoreData
): void {
  const next = updater(state);
  if (next !== state) setState(next);
}

const uniqueIds = (...ids: string[]): string[] =>
  Array.from(new Set(ids.filter(Boolean)));

const withoutKey = (
  obj: ReactionStoreData,
  key: string
): ReactionStoreData => {
  const next: ReactionStoreData = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k !== key) next[k] = v;
  }
  return next;
};

export function applyReactionDelta(
  prev: ReactionStoreData,
  delta: ReactionDelta
): ReactionStoreData {
  const { messageId, emoji, userId, added } = delta;
  if (!userId) return prev;

  const messageReactions = prev[messageId];
  const existing = (messageReactions?.[emoji] ?? []) as string[];
  const hasUser = existing.includes(userId);
  const removing = added === false || (added === undefined && hasUser);
  const adding = added === true || (added === undefined && !hasUser);

  let nextUsers = existing;
  if (removing && hasUser) {
    nextUsers = existing.filter((id) => id !== userId);
  } else if (adding && !hasUser) {
    nextUsers = uniqueIds(...existing, userId);
  }

  const nextMessageReactions: ReactionUsersByEmoji = {
    ...messageReactions,
    [emoji]: nextUsers,
  };
  if (nextUsers.length === 0) delete nextMessageReactions[emoji];

  if (Object.keys(nextMessageReactions).length === 0) {
    return withoutKey(prev, messageId);
  }
  return { ...prev, [messageId]: nextMessageReactions };
}

export function mergeMessageReactions(
  prev: ReactionStoreData,
  messageId: string,
  emoji: string,
  userIds: string[]
): ReactionStoreData {
  const cleaned = uniqueIds(...userIds);
  const messageReactions: ReactionUsersByEmoji = {
    ...prev[messageId],
    [emoji]: cleaned,
  };
  if (cleaned.length === 0) delete messageReactions[emoji];

  if (Object.keys(messageReactions).length === 0) {
    return withoutKey(prev, messageId);
  }
  return { ...prev, [messageId]: messageReactions };
}

export function setMessageReactions(
  prev: ReactionStoreData,
  messageId: string,
  reactions: ReactionUsersByEmoji
): ReactionStoreData {
  const cleaned: ReactionUsersByEmoji = {};
  for (const [emoji, userIds] of Object.entries(reactions)) {
    const ids = uniqueIds(...userIds);
    if (ids.length > 0) cleaned[emoji] = ids;
  }
  if (Object.keys(cleaned).length === 0) {
    return withoutKey(prev, messageId);
  }
  return { ...prev, [messageId]: cleaned };
}

const readString = (body: any, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = body?.[key];
    if (value !== undefined && value !== null) return String(value);
  }
  return undefined;
};

const unwrap = (raw: unknown): unknown =>
  raw && typeof raw === "object" && "payload" in raw
    ? (raw as { payload: unknown }).payload
    : raw;

export function reactionEventToUpdater(
  raw: unknown
): ((prev: ReactionStoreData) => ReactionStoreData) | null {
  const body: any = unwrap(raw);
  if (!body || typeof body !== "object") return null;

  const messageId = readString(
    body,
    "message_id",
    "dm_message_id",
    "entityId",
    "entity_id",
    "messageId"
  );
  if (!messageId) return null;

  const emoji = readString(body, "emoji", "reaction");
  const userIds: string[] = Array.isArray(body.user_ids)
    ? body.user_ids.map(String).filter(Boolean)
    : [];

  if (emoji && userIds.length > 0) {
    return (prev) => mergeMessageReactions(prev, messageId, emoji, userIds);
  }

  if (!emoji) {
    if (body.reactions && typeof body.reactions === "object") {
      const normalized: ReactionUsersByEmoji = {};
      for (const [key, value] of Object.entries(body.reactions)) {
        if (Array.isArray(value)) {
          const ids = uniqueIds(...value.map(String));
          if (ids.length > 0) normalized[key] = ids;
        }
      }
      return (prev) => setMessageReactions(prev, messageId, normalized);
    }
    return null;
  }

  const userId = readString(body, "user_id", "userId", "actor_id", "actorId");
  let added: boolean | undefined;
  if (typeof body.added === "boolean") added = body.added;
  else if (typeof body.removed === "boolean") added = !body.removed;
  else if (body.action !== undefined) added = String(body.action) === "added";
  else if (typeof body.reacted_by_me === "boolean") {
    added = body.reacted_by_me;
  }

  return (prev) => applyReactionDelta(prev, { messageId, emoji, userId, added });
}