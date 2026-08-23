"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMessages } from "@/api/message.api";
import { ChannelMessage } from "@/lib/channels/types";
import {
  dedupeAndSortByTime,
  mergeIncomingMessage,
  normalizeChannelMessage,
  prependOlderMessages,
  reconcileOptimisticMessage,
  removeOptimisticMessage,
  resolveReplyTargets,
  shouldAddOptimisticMessage,
} from "@/lib/channels/messageUtils";

export interface UseChannelMessagesOptions {
  channelId: string;
  currentUserId: string;
  resolveAvatarUrl: (userId: string, raw?: unknown) => Promise<string>;
}

export interface UseChannelMessagesResult {
  messages: ChannelMessage[];
  loadingMessages: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  isInitialLoadDone: boolean;
  loadMessages: (loadMore?: boolean, signal?: AbortSignal) => Promise<void>;
  appendIncoming: (incoming: ChannelMessage) => void;
  addOptimistic: (optimistic: ChannelMessage) => void;
  reconcileTemp: (
    tempId: string | number,
    replacement: { id: string | number; content?: string; mediaUrl?: string }
  ) => void;
  dropTemp: (tempId: string | number) => void;
  updateMessages: (
    updater: (prev: ChannelMessage[]) => ChannelMessage[]
  ) => void;
}

export function useChannelMessages({
  channelId,
  currentUserId,
  resolveAvatarUrl,
}: UseChannelMessagesOptions): UseChannelMessagesResult {
  const [messages, setMessages] = useState<ChannelMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);

  const offsetRef = useRef(0);
  const channelIdRef = useRef(channelId);

  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);

  const loadMessages = useCallback(
    async (loadMore = false, abortSignal?: AbortSignal) => {
      const targetChannelId = channelIdRef.current;

      try {
        if (loadMore) {
          setLoadingMore(true);
        } else {
          setLoadingMessages(true);
          setIsInitialLoadDone(false);
          offsetRef.current = 0;
        }

        if (abortSignal?.aborted) return;

        const res = await fetchMessages(targetChannelId, offsetRef.current);

        if (abortSignal?.aborted || channelIdRef.current !== targetChannelId) {
          return;
        }

        const rawMessages = res.data ?? [];
        const formatted = await Promise.all(
          rawMessages.map(async (raw: any) => {
            const senderId = raw.sender_id || raw.senderId;
            const avatarUrl = await resolveAvatarUrl(senderId, raw);
            return normalizeChannelMessage(raw, currentUserId, avatarUrl);
          })
        );

        const resolved = resolveReplyTargets(formatted);
        const sorted = dedupeAndSortByTime(resolved);

        if (loadMore) {
          setMessages((prev) => prependOlderMessages(prev, sorted));
          offsetRef.current += rawMessages.length;
        } else {
          setMessages(sorted);
          offsetRef.current = rawMessages.length;
        }

        setHasMore(res.hasMore ?? false);
      } catch {
      } finally {
        if (abortSignal?.aborted || channelIdRef.current !== targetChannelId) {
          return;
        }

        setLoadingMessages(false);
        setLoadingMore(false);
        if (!loadMore) {
          setIsInitialLoadDone(true);
        }
      }
    },
    [currentUserId, resolveAvatarUrl]
  );

  useEffect(() => {
    offsetRef.current = 0;
    setHasMore(true);
    setIsInitialLoadDone(false);

    if (!channelId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    const abortController = new AbortController();
    loadMessages(false, abortController.signal);

    return () => abortController.abort();
  }, [channelId, loadMessages]);

  const appendIncoming = useCallback(
    (incoming: ChannelMessage) => {
      setMessages((prev) =>
        mergeIncomingMessage(prev, incoming, currentUserId)
      );
    },
    [currentUserId]
  );

  const addOptimistic = useCallback(
    (optimistic: ChannelMessage) => {
      setMessages((prev) => {
        if (!shouldAddOptimisticMessage(prev, optimistic, currentUserId)) {
          return prev;
        }
        return [...prev, optimistic];
      });
    },
    [currentUserId]
  );

  const reconcileTemp = useCallback(
    (
      tempId: string | number,
      replacement: { id: string | number; content?: string; mediaUrl?: string }
    ) => {
      setMessages((prev) =>
        reconcileOptimisticMessage(prev, tempId, replacement)
      );
    },
    []
  );

  const dropTemp = useCallback((tempId: string | number) => {
    setMessages((prev) => removeOptimisticMessage(prev, tempId));
  }, []);

  const updateMessages = useCallback(
    (updater: (prev: ChannelMessage[]) => ChannelMessage[]) => {
      setMessages(updater);
    },
    []
  );

  return {
    messages,
    loadingMessages,
    loadingMore,
    hasMore,
    isInitialLoadDone,
    loadMessages,
    appendIncoming,
    addOptimistic,
    reconcileTemp,
    dropTemp,
    updateMessages,
  };
}
