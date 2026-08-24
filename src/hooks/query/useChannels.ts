"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchChannelsByServer } from "@/api/channel.api";
import { queryKeys } from "@/lib/query/keys";
import { policyForQueryKey } from "@/lib/query/cachePolicy";
import { EMPTY_ARRAY } from "@/lib/query/constants";

export interface ChannelListItem {
  id: string;
  name: string;
  type: string;
  is_private: boolean;
}

export interface UseChannelsResult {
  /** Cached channels (stable empty array while no data has loaded). */
  channels: ChannelListItem[];
  /** True only when there is no cached data yet and a fetch is running. */
  isLoading: boolean;
  isError: boolean;
  /** True when cached data exists and a background refetch is running. */
  isRefetching: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
}

export function useChannels(serverId?: string): UseChannelsResult {
  const key = serverId
    ? queryKeys.serverChannels(serverId)
    : queryKeys.disabled;
  const policy = policyForQueryKey(key);
  const enabled = Boolean(serverId);

  const { data, isLoading, isError, isRefetching, error, refetch } = useQuery<
    ChannelListItem[]
  >({
    queryKey: key,
    queryFn: () => fetchChannelsByServer(serverId as string),
    enabled,
    staleTime: policy.staleTimeMs,
    gcTime: policy.gcTimeMs,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  return {
    channels: data ?? EMPTY_ARRAY,
    isLoading: enabled && isLoading,
    isError,
    isRefetching: enabled && isRefetching,
    error: error as Error | null,
    refetch,
  };
}