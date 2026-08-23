"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchServers } from "@/api/server.api";
import { queryKeys } from "@/lib/query/keys";
import { policyForQueryKey } from "@/lib/query/cachePolicy";
import { EMPTY_ARRAY } from "@/lib/query/constants";
import type { Server } from "@/api/types/server.types";

export interface UseServersResult {
  servers: Server[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => Promise<unknown>;
}

export function useServers(): UseServersResult {
  const key = queryKeys.servers;
  const policy = policyForQueryKey(key);

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useQuery<Server[]>({
    queryKey: key,
    queryFn: fetchServers,
    staleTime: policy.staleTimeMs,
    gcTime: policy.gcTimeMs,
  });

  return { servers: data ?? EMPTY_ARRAY, isLoading, isError, refetch };
}
