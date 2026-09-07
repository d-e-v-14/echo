"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  addMessageReaction,
  getMessageReactions,
  removeMessageReaction,
} from "@/api/message.api";
import {
  ReactionStoreData,
  removeMessageReactions,
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
  conversationId?: string;
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
  conversationId,
}: UseMessageReactionsOptions) => {
  const reactionsByMessageId = useReactionStore();
  const [loading, setLoading] = useState(false);
  const scope = conversationId ?? mode;

  const fetchedByScopeRef = useRef<Map<string, Set<string>>>(new Map());
  const previousScopeRef = useRef(scope);

  const getFetchedForScope = useCallback((key: string): Set<string> => {
    let set = fetchedByScopeRef.current.get(key);
    if (!set) {
      set = new Set();
      fetchedByScopeRef.current.set(key, set);
    }
    return set;
  }, []);

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
        getFetchedForScope(scope).add(key);
      } catch (error) {
        console.error(`Failed to fetch reactions for message ${key}`, error);
      }
    },
    [buildTarget, currentUserId, getFetchedForScope, scope]
  );

  // On conversation change, drop the previous conversation's reactions from
  // the store and its fetch flags so no stale cross-channel data is shown.
useEffect(() => {
    if (previousScopeRef.current === scope) return;
    const previousScope = previousScopeRef.current;
    previousScopeRef.current = scope;

    const previousFetched = fetchedByScopeRef.current.get(previousScope);
    fetchedByScopeRef.current.delete(previousScope);
    if (previousFetched && previousFetched.size > 0) {
      updateReactionStore((prev) =>
        removeMessageReactions(prev, previousFetched)
      );
    }
  }, [scope]);

  useEffect(() => {
    const ids = messageIds
      .map(String)
      .filter((id) => id && !id.startsWith("temp-"));

    const fetched = getFetchedForScope(scope);
    const missing = ids.filter((id) => !fetched.has(id));
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
  }, [messageIds, fetchReactionsForMessage, getFetchedForScope, scope]);

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
        getFetchedForScope(scope).add(key);
      } catch (error) {
        console.error("Failed to toggle reaction", error);
        await fetchReactionsForMessage(messageId);
      }
    },
    [
      reactionsByMessageId,
      buildTarget,
      fetchReactionsForMessage,
      getFetchedForScope,
      scope,
    ]
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