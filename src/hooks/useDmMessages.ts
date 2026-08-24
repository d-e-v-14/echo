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

/**
 * The single source of truth for a DM conversation's messages.
 *
 * pages[0] is the newest batch on first load; `fetchPreviousPage` prepends
 * older batches, so flattening `data.pages` in order yields oldest → newest.
 * New/optimistic/socket messages are inserted into the newest (last) page via
 * setQueryData elsewhere, so the cache is updated directly rather than by
 * refetching the whole conversation.
 */
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
    // Older messages are fetched by scrolling up: the offset is the total
    // number of messages already loaded.
    getPreviousPageParam: (firstPage, allPages) => {
      if (!firstPage?.hasMore) return undefined;
      return allPages.reduce(
        (sum, page) => sum + (page?.messages?.length ?? 0),
        0
      );
    },
    getNextPageParam: () => undefined,
    // Discord-like: cached conversations survive navigation (gcTime) and
    // reconcile in the background (refetchOnMount / staleTime). Do NOT rely on
    // a long refetchInterval to make new messages appear — they are inserted
    // into the cache directly by the socket sync and the send mutation.
    staleTime: DM_MESSAGES_STALE_TIME_MS,
    gcTime: DM_MESSAGES_GC_TIME_MS,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });
}