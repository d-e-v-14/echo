"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/lib/socket/SocketProvider";
import { useUser } from "@/components/UserContext";
import {
  configureMessageUnreadStore,
  applyChannelMessage,
} from "@/lib/messages/messageUnreadStore";
import { useServers } from "@/hooks/query/useServers";

export function resolveChannelServerIdFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  channelId: string
): string | undefined {
  const cache = queryClient.getQueryCache().getAll();
  for (const query of cache) {
    const key = query.queryKey;
    if (
      Array.isArray(key) &&
      key.length === 3 &&
      key[0] === "server" &&
      key[2] === "channels"
    ) {
      const serverId = key[1];
      const data = query.state.data;
      if (
        Array.isArray(data) &&
        data.some((channel: any) => String(channel?.id) === String(channelId))
      ) {
        return String(serverId);
      }
    }
  }
  return undefined;
}

export function MessageUnreadProvider({ children }: { children?: ReactNode }) {
  const { socket } = useSocket();
  const { user } = useUser();
  const { servers } = useServers();
  const userId = user?.id ?? null;
  const username = user?.username ?? null;
  const queryClient = useQueryClient();
  const userIdRef = useRef(userId);

  const knownServerIds = useMemo(
    () => new Set((servers ?? []).map((s) => String(s?.id)).filter(Boolean)),
    [servers]
  );

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    configureMessageUnreadStore({
      userId,
      username,
      knownServerIds,
      resolveServerId: (channelId) =>
        resolveChannelServerIdFromCache(queryClient, channelId),
    });
  }, [userId, username, queryClient, knownServerIds]);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (payload: unknown) => {
      const currentUserId = userIdRef.current;
      if (!currentUserId) return;
      applyChannelMessage(payload, currentUserId);
    };
    socket.on("new_message", onNewMessage as any);
    return () => {
      socket.off("new_message", onNewMessage as any);
    };
  }, [socket]);

  return <>{children}</>;
}