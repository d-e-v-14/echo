"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { fetchMessages } from "@/api/message.api";
import { ChannelMessage, ChannelMessagesData } from "@/lib/channels/types";
import {
  dedupeAndSortByTime,
  normalizeChannelMessage,
  resolveReplyTargets,
} from "@/lib/channels/messageUtils";
import {
  createChannelMessagesData,
  deleteMessageById,
  flattenChannelMessages,
  insertIncomingIntoDataOrCreate,
  markMessagesFailed,
  replaceOptimisticById,
} from "@/lib/channels/cache";
import { queryKeys } from "@/lib/query/keys";

const CHANNEL_MESSAGES_LIMIT = 50;
const CHANNEL_MESSAGES_STALE_TIME_MS = 60_000;
const CHANNEL_MESSAGES_GC_TIME_MS = 30 * 60_000;

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
  loadMessages: (loadMore?: boolean) => Promise<boolean>;
  addOptimistic: (optimistic: ChannelMessage) => void;
  reconcileTemp: (
    tempId: string | number,
    replacement: { id: string | number; content?: string; mediaUrl?: string }
  ) => void;
  dropTemp: (tempId: string | number) => void;
  markFailed: (tempIds: ReadonlySet<string>) => void;
  updateMessages: (
    updater: (prev: ChannelMessage[]) => ChannelMessage[]
  ) => void;
}

export function useChannelMessages({
  channelId,
  currentUserId,
  resolveAvatarUrl,
}: UseChannelMessagesOptions): UseChannelMessagesResult {
  const queryClient = useQueryClient();
  const channelIdRef = useRef(channelId);

  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);

  const normalizeMessages = useCallback(
    async (rawMessages: any[]): Promise<ChannelMessage[]> => {
      const formatted = await Promise.all(
        rawMessages.map(async (raw) => {
          const senderId = raw.sender_id || raw.senderId;
          const avatarUrl = await resolveAvatarUrl(senderId, raw);
          return normalizeChannelMessage(raw, currentUserId, avatarUrl);
        })
      );
      return dedupeAndSortByTime(formatted);
    },
    [currentUserId, resolveAvatarUrl]
  );

  const infiniteQuery = useInfiniteQuery({
    queryKey: queryKeys.channelMessages(channelId),
    enabled: Boolean(channelId),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }) => {
      const result = await fetchMessages(channelId, {
        limit: CHANNEL_MESSAGES_LIMIT,
        before: pageParam ?? undefined,
        signal,
      });

      return {
        messages: await normalizeMessages(result.messages),
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      };
    },
    getPreviousPageParam: (firstPage) => {
      if (!firstPage?.hasMore) return undefined;
      return firstPage.nextCursor ?? undefined;
    },
    getNextPageParam: () => undefined,
    staleTime: CHANNEL_MESSAGES_STALE_TIME_MS,
    gcTime: CHANNEL_MESSAGES_GC_TIME_MS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const messages = useMemo(() => {
    if (!infiniteQuery.data?.pages) return [];
    return resolveReplyTargets(
      dedupeAndSortByTime(flattenChannelMessages(infiniteQuery.data))
    );
  }, [infiniteQuery.data]);

  const refreshNewestPage = useCallback(async (): Promise<boolean> => {
    const targetChannelId = channelIdRef.current;
    try {
      const result = await fetchMessages(targetChannelId, {
        limit: CHANNEL_MESSAGES_LIMIT,
      });
      const messages = await normalizeMessages(result.messages);
      const page = {
        messages,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
      };

      queryClient.setQueryData<ChannelMessagesData>(
        queryKeys.channelMessages(targetChannelId),
        (old) => {
          if (!old?.pages?.length) {
            return createChannelMessagesData(
              messages,
              result.hasMore,
              result.nextCursor
            );
          }
          const pages = [...old.pages];
          pages[pages.length - 1] = page;
          return { ...old, pages };
        }
      );
      return true;
    } catch {
      return false;
    }
  }, [normalizeMessages, queryClient]);

  const lastRefreshedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!channelId) return;
    const alreadyVisited = lastRefreshedRef.current === channelId;
    lastRefreshedRef.current = channelId;
    if (
      !alreadyVisited &&
      infiniteQuery.isStale &&
      infiniteQuery.data?.pages?.length
    ) {
      void refreshNewestPage();
    }
  }, [channelId, infiniteQuery.isStale, infiniteQuery.data, refreshNewestPage]);

  const loadMessages = useCallback(
    async (loadMore = false): Promise<boolean> => {
      if (loadMore) {
        if (!infiniteQuery.hasPreviousPage) return false;
        try {
          await infiniteQuery.fetchPreviousPage();
          return true;
        } catch {
          return false;
        }
      }
      return refreshNewestPage();
    },
    [
      infiniteQuery.hasPreviousPage,
      infiniteQuery.fetchPreviousPage,
      refreshNewestPage,
    ]
  );

  const addOptimistic = useCallback(
    (optimistic: ChannelMessage) => {
      queryClient.setQueryData<ChannelMessagesData>(
        queryKeys.channelMessages(channelIdRef.current),
        (old) => insertIncomingIntoDataOrCreate(old, optimistic)
      );
    },
    [queryClient]
  );

  const reconcileTemp = useCallback(
    (
      tempId: string | number,
      replacement: { id: string | number; content?: string; mediaUrl?: string }
    ) => {
      queryClient.setQueryData<ChannelMessagesData>(
        queryKeys.channelMessages(channelIdRef.current),
        (old) =>
          old ? replaceOptimisticById(old, tempId, replacement) : old
      );
    },
    [queryClient]
  );

  const dropTemp = useCallback((tempId: string | number) => {
    queryClient.setQueryData<ChannelMessagesData>(
      queryKeys.channelMessages(channelIdRef.current),
      (old) => (old ? deleteMessageById(old, tempId) : old)
    );
  }, [queryClient]);

  const markFailed = useCallback((tempIds: ReadonlySet<string>) => {
    queryClient.setQueryData<ChannelMessagesData>(
      queryKeys.channelMessages(channelIdRef.current),
      (old) => (old ? markMessagesFailed(old, tempIds) : old)
    );
  }, [queryClient]);

  const updateMessages = useCallback(
    (updater: (prev: ChannelMessage[]) => ChannelMessage[]) => {
      queryClient.setQueryData<ChannelMessagesData>(
        queryKeys.channelMessages(channelIdRef.current),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: updater(page.messages),
            })),
          };
        }
      );
    },
    [queryClient]
  );

  return {
    messages,
    loadingMessages: infiniteQuery.isLoading,
    loadingMore: infiniteQuery.isFetchingPreviousPage,
    hasMore: infiniteQuery.hasPreviousPage,
    isInitialLoadDone: infiniteQuery.isSuccess,
    loadMessages,
    addOptimistic,
    reconcileTemp,
    dropTemp,
    markFailed,
    updateMessages,
  };
}