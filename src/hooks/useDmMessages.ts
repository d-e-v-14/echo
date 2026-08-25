"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getDmThreadMessages } from "@/api/message.api";
import {
  normalizeDmMessage,
  sortDmMessages,
} from "@/lib/dm/messageUtils";
import type { DmMessagesPage } from "@/lib/dm/types";
import { queryKeys } from "@/lib/query/keys";

const DM_MESSAGES_STALE_TIME_MS = 60_000;
const DM_MESSAGES_GC_TIME_MS = 30 * 60_000;

export function useDmMessages(
  conversationId: string | null,
  threadId: string | null
) {
  return useInfiniteQuery({
    queryKey: queryKeys.dmMessages(conversationId ?? "__none__"),
    enabled: Boolean(conversationId && threadId),
    initialPageParam: 0,
    queryFn: async ({ pageParam }): Promise<DmMessagesPage> => {
      const result = await getDmThreadMessages(threadId!, pageParam);
      const raw = Array.isArray(result?.data) ? result.data : [];
      return {
        messages: sortDmMessages(raw.map(normalizeDmMessage)),
        hasMore: Boolean(result?.hasMore),
      };
    },
    getPreviousPageParam: (firstPage, allPages) => {
      if (!firstPage?.hasMore) return undefined;
      return allPages.reduce(
        (sum, page) => sum + (page?.messages?.length ?? 0),
        0
      );
    },
    getNextPageParam: () => undefined,
    staleTime: DM_MESSAGES_STALE_TIME_MS,
    gcTime: DM_MESSAGES_GC_TIME_MS,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}