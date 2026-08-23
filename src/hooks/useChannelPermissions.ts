"use client";

import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getChannelPermissions } from "@/api/channel.api";
import { queryKeys } from "@/lib/query/keys";
import { policyForQueryKey } from "@/lib/query/cachePolicy";
import { ChannelPermissions } from "@/lib/channels/types";

const DEFAULT_PERMISSIONS: ChannelPermissions = {
  channelType: "normal",
  canView: true,
  canSend: true,
  isAdmin: false,
  isModerator: false,
};

export interface UseChannelPermissionsResult {
  permissions: ChannelPermissions | null;
  permissionError: string | null;
  setPermissionError: (message: string | null) => void;
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

  const { data, isError } = useQuery<ChannelPermissions>({
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

  const permissions = isError
    ? DEFAULT_PERMISSIONS
    : data ?? null;

  const setPermissionErrorSafe = useCallback((message: string | null) => {
    setPermissionError(message);
  }, []);

  return {
    permissions,
    permissionError,
    setPermissionError: setPermissionErrorSafe,
  };
}
