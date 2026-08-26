"use client";

import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/lib/socket/SocketProvider";
import { useUser } from "@/components/UserContext";
import { useServers } from "@/hooks/query/useServers";
import { apiClient } from "@/utils/apiClient";
import {
  configureUnreadStore,
  addUnreadMention,
  hydrateUnread,
  normalizeMentionEntry,
  removeUnreadMention,
  resolvePendingServerIds,
} from "@/lib/mentions/unreadStore";

function resolveServerIdFromCache(
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

export function MentionUnreadProvider({
  children,
}: {
  children?: ReactNode;
}) {
  const { socket } = useSocket();
  const { user } = useUser();
  const userId = user?.id ?? null;
  const queryClient = useQueryClient();
  const { servers } = useServers();

  const serverIdByName = useMemo(() => {
    const map = new Map<string, string>();
    for (const server of servers ?? []) {
      if (server?.id && server?.name) {
        map.set(String(server.name).toLowerCase(), String(server.id));
      }
    }
    return map;
  }, [servers]);

  const resolveServerId = useCallback(
    (channelId: string, serverName?: string): string | undefined => {
      const fromCache = resolveServerIdFromCache(queryClient, channelId);
      if (fromCache) return fromCache;
      if (!serverName) return undefined;
      return serverIdByName.get(serverName.toLowerCase());
    },
    [queryClient, serverIdByName]
  );

  useEffect(() => {
    configureUnreadStore({
      userId,
      socket,
      resolveServerId: (channelId) => resolveServerId(channelId),
    });
  }, [userId, socket, queryClient, resolveServerId]);

  useEffect(() => {
    resolvePendingServerIds(resolveServerId);
  }, [resolveServerId]);

  useEffect(() => {
    const unsubscribe = queryClient
      .getQueryCache()
      .subscribe((event) => {
        if (event.type !== "updated" && event.type !== "added") return;
        resolvePendingServerIds(resolveServerId);
      });
    return unsubscribe;
  }, [queryClient, resolveServerId]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    apiClient
      .get(`/api/mentions?userId=${encodeURIComponent(userId)}&unreadOnly=true`)
      .then((response) => {
        if (cancelled) return;
        const data = response.data;
        if (!Array.isArray(data)) return;
        const entries = data
          .map((raw: unknown) => normalizeMentionEntry(raw, userId))
          .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
        if (entries.length > 0) {
          hydrateUnread(entries, userId);
        }
      })
      .catch(() => {
        // Initial hydration is best-effort; realtime events keep state fresh.
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!socket) return;

    const onMention = (payload: unknown) => addUnreadMention(payload, userId);
    const onMentionMarkedRead = (payload: unknown) =>
      removeUnreadMention(payload);

    socket.on("mention_notification", onMention as any);
    socket.on("mention_marked_read", onMentionMarkedRead as any);

    return () => {
      socket.off("mention_notification", onMention as any);
      socket.off("mention_marked_read", onMentionMarkedRead as any);
    };
  }, [socket, userId]);

  return <>{children}</>;
}