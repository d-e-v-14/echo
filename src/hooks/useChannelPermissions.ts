"use client";

import { useCallback, useEffect, useState } from "react";
import { getChannelPermissions } from "@/api/channel.api";
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
  const [permissions, setPermissions] = useState<ChannelPermissions | null>(
    null
  );
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    if (!channelId || !serverId) return;

    let cancelled = false;

    const load = async () => {
      try {
        const result = await getChannelPermissions(channelId);
        if (cancelled) return;
        setPermissions(result);
        setPermissionError(null);
      } catch {
        if (cancelled) return;
        setPermissions(DEFAULT_PERMISSIONS);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [channelId, serverId]);

  const setPermissionErrorSafe = useCallback((message: string | null) => {
    setPermissionError(message);
  }, []);

  return {
    permissions,
    permissionError,
    setPermissionError: setPermissionErrorSafe,
  };
}
