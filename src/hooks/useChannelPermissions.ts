"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChannelPermissions } from "@/api/channel.api";
import { queryKeys } from "@/lib/query/keys";
import { policyForQueryKey } from "@/lib/query/cachePolicy";
import { ChannelPermissions } from "@/lib/channels/types";

export interface UseChannelPermissionsResult {
  permissions: ChannelPermissions | null;
  permissionError: string | null;
  setPermissionError: (message: string | null) => void;
  permissionsError: boolean;
  retryPermissions: () => void;
}

export function useChannelPermissions(
  channelId: string,
  serverId?: string
): UseChannelPermissionsResult {
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const key = channelId
    ? queryKeys.channelPermissions(channelId)
    : queryKeys.disabled;
  const policy = policyForQueryKey(key);
  const enabled = Boolean(channelId && serverId);

  const { data, isError, refetch } = useQuery<ChannelPermissions>({
    queryKey: key,
    queryFn: () => getChannelPermissions(channelId),
    enabled,
    staleTime: policy.staleTimeMs,
    gcTime: policy.gcTimeMs,
  });

  useEffect(() => {
    if (data && !isError) {
      setPermissionError(null);
    }
  }, [data, isError]);

  // On load failure, keep permissions null (unknown) instead of fail-closed
  // read-only so the composer still lets the user attempt a send; a real 403
  // from the backend is handled separately.
  const permissions = isError ? null : data ?? null;

  const setPermissionErrorSafe = useCallback((message: string | null) => {
    setPermissionError(message);
  }, []);

  const retryPermissions = useCallback(() => {
    setPermissionError(null);
    void refetch();
  }, [refetch]);

  return {
    permissions,
    permissionError,
    setPermissionError: setPermissionErrorSafe,
    permissionsError: isError,
    retryPermissions,
  };
}
