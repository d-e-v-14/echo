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
  channels: ChannelListItem[];
  isLoading: boolean;
  isError: boolean;
}

export function useChannels(serverId?: string): UseChannelsResult {
  const key = serverId
    ? queryKeys.serverChannels(serverId)
    : queryKeys.disabled;
  const policy = policyForQueryKey(key);
  const enabled = Boolean(serverId);

  const {
    data,
    isLoading,
    isError,
  } = useQuery<ChannelListItem[] | null>({
    queryKey: key,
    queryFn: () => fetchChannelsByServer(serverId as string),
    enabled,
    staleTime: policy.staleTimeMs,
    gcTime: policy.gcTimeMs,
  });

  return {
    channels: data ?? EMPTY_ARRAY,
    isLoading: enabled && isLoading,
    isError,
  };
}
