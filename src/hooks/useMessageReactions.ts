"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addMessageReaction,
  getMessageReactions,
  removeMessageReaction,
} from "@/api/message.api";
import {
  ReactionStoreData,
  setMessageReactions,
  updateReactionStore,
  useReactionStore,
} from "@/lib/query/reactionStore";

export type MessageReactionSummary = {
  emoji: string;
  count: number;
  reactedByMe?: boolean;
};

type UseMessageReactionsOptions = {
  mode: "channel" | "dm";
  currentUserId?: string | null;
  messageIds?: Array<string | number>;
};

const normalizeReactions = (
  raw: Array<{
    emoji: string;
    count?: number;
    user_ids?: string[];
    reacted_by_me?: boolean;
  }>,
  currentUserId?: string | null
): Record<string, string[]> => {
  const result: Record<string, string[]> = {};

  for (const reaction of raw) {
    const emoji = reaction.emoji?.trim();
    if (!emoji) continue;

    const userIds = Array.isArray(reaction.user_ids)
      ? reaction.user_ids.map(String).filter(Boolean)
      : reaction.count && reaction.count > 0
        ? Array.from({ length: reaction.count }, (_, i) => `user-${i}`)
        : [];

    if (
      reaction.reacted_by_me &&
      currentUserId &&
      !userIds.includes(currentUserId)
    ) {
      userIds.push(currentUserId);
    }

    if (userIds.length > 0) {
      result[emoji] = Array.from(new Set(userIds));
    }
  }

  return result;
};

export const useMessageReactions = ({
  mode,
  currentUserId,
  messageIds = [],
}: UseMessageReactionsOptions) => {
  const reactionsByMessageId = useReactionStore();
  const [loading, setLoading] = useState(false);
  const fetchedIdsRef = useRef<Set<string>>(new Set());

  const buildTarget = useCallback(
    (messageId: string | number) => {
      const id = String(messageId);
      return mode === "dm" ? { dm_message_id: id } : { message_id: id };
    },
    [mode]
  );

  const fetchReactionsForMessage = useCallback(
    async (messageId: string | number) => {
      const key = String(messageId);
      if (!key || key.startsWith("temp-")) return;

      try {
        const raw = await getMessageReactions(buildTarget(messageId));
        const normalized = normalizeReactions(raw, currentUserId);
        updateReactionStore((prev) =>
          setMessageReactions(prev, key, normalized as ReactionStoreData[string])
        );
        fetchedIdsRef.current.add(key);
      } catch (error) {
        console.error(`Failed to fetch reactions for message ${key}`, error);
      }
    },
    [buildTarget, currentUserId]
  );

  useEffect(() => {
    fetchedIdsRef.current.clear();
  }, [mode]);

  useEffect(() => {
    const ids = messageIds
      .map(String)
      .filter((id) => id && !id.startsWith("temp-"));

    const missing = ids.filter((id) => !fetchedIdsRef.current.has(id));
    if (missing.length === 0) return;

    let cancelled = false;

    const loadReactions = async () => {
      setLoading(true);
      await Promise.all(
        missing.map(async (id) => {
          if (cancelled) return;
          await fetchReactionsForMessage(id);
        })
      );
      if (!cancelled) setLoading(false);
    };

    loadReactions();

    return () => {
      cancelled = true;
    };
  }, [messageIds, fetchReactionsForMessage]);

  const toggleReaction = useCallback(
    async (messageId: string | number, emoji: string, userId: string) => {
      const key = String(messageId);
      const normalizedEmoji = emoji.trim();
      const normalizedUserId = userId.trim();
      if (!normalizedEmoji || !normalizedUserId || key.startsWith("temp-")) {
        return;
      }

      const existingUsers = new Set(
        reactionsByMessageId[key]?.[normalizedEmoji] ?? []
      );
      const isRemoving = existingUsers.has(normalizedUserId);

      updateReactionStore((prev) =>
        setMessageReactions(
          prev,
          key,
          {
            ...(prev[key] ?? {}),
            [normalizedEmoji]: isRemoving
              ? Array.from(existingUsers).filter((id) => id !== normalizedUserId)
              : Array.from(new Set([...existingUsers, normalizedUserId])),
          }
        )
      );

      try {
        const target = buildTarget(messageId);
        if (isRemoving) {
          await removeMessageReaction({ ...target, emoji: normalizedEmoji });
        } else {
          await addMessageReaction({ ...target, emoji: normalizedEmoji });
        }
        fetchedIdsRef.current.add(key);
      } catch (error) {
        console.error("Failed to toggle reaction", error);
        await fetchReactionsForMessage(messageId);
      }
    },
    [reactionsByMessageId, buildTarget, fetchReactionsForMessage]
  );

  const getReactionsForMessage = useCallback(
    (messageId: string | number): MessageReactionSummary[] => {
      const messageReactions = reactionsByMessageId[String(messageId)] ?? {};

      return Object.entries(messageReactions).map(([emoji, userIds]) => ({
        emoji,
        count: userIds.length,
        reactedByMe: !!currentUserId && userIds.includes(currentUserId.trim()),
      }));
    },
    [currentUserId, reactionsByMessageId]
  );

  return {
    reactionsByMessageId,
    getReactionsForMessage,
    toggleReaction,
    loading,
    refreshReactions: fetchReactionsForMessage,
  };
};