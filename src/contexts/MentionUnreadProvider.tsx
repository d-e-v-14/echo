"use client";

import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/lib/socket/SocketProvider";
import { useUser } from "@/components/UserContext";
import { useServers } from "@/hooks/query/useServers";
import { apiClient } from "@/utils/apiClient";
import {
  configureUnreadStore,
  applyMentionCreated,
  applyMentionRead,
  setAuthoritativeCounts,
  deriveCountsFromEntries,
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

  const refreshCountsRef = useRef<() => void>(() => {});

  refreshCountsRef.current = useCallback(() => {
    if (!userId) return;
    let active = true;

    const applyUnreadState = (
      state: {
        serverCounts?: Record<string, number>;
        channelCounts?:
          | Record<string, number>
          | Record<string, { serverId?: string | null; count?: number }>;
        totalUnread?: number;
        serverId?: string;
      } | null
    ) => {
      if (active && state && typeof state === "object") {
        setAuthoritativeCounts(state);
      }
    };

    const hydrateList = () => {
      apiClient
        .get(`/api/mentions?unreadOnly=true`)
        .then((response) => {
          if (!active) return;
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
          // Best-effort; socket events keep state fresh.
        });
    };

    // New backend: authoritative counts endpoint.
    apiClient
      .get("/api/mentions/unread-counts")
      .then((response) => {
        if (active && response?.data && typeof response.data === "object") {
          setAuthoritativeCounts(response.data);
        }
      })
      .catch(() => {
        // Older backend without the counts endpoint: derive from hydrated
        // entries so the sidebar/counter still work.
        deriveCountsFromEntries();
      });

    // Entry-level list (both backends) for jump-to / highlight.
    hydrateList();

    // Socket-based authoritative counts (new backend).
    if (socket?.emit) {
      socket.emit("mentions:get_unread", applyUnreadState);
    }

    return () => {
      active = false;
    };
  }, [userId, socket]);

  // Hydrate on login/user change: full authoritative sync.
  useEffect(() => {
    if (!userId) return;
    const cleanup = refreshCountsRef.current();
    return cleanup;
  }, [userId]);

  // Sync authoritative counts whenever the socket (re)connects, so a
  // reconnect can never leave a stale count on screen.
  useEffect(() => {
    if (!socket) return;
    const onConnect = () => {
      refreshCountsRef.current();
    };
    socket.on("connect", onConnect);
    return () => {
      socket.off("connect", onConnect);
    };
  }, [socket]);

  // Light refetch on window focus so returning to the tab shows fresh counts.
  useEffect(() => {
    if (!userId) return;
    const onFocus = () => {
      refreshCountsRef.current();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
    };
  }, [userId, socket]);

  useEffect(() => {
    if (!socket) return;

    const onMention = (payload: unknown) => {
      applyMentionCreated(payload, userId);
    };
    const onMentionRead = (payload: unknown) => {
      applyMentionRead(payload);
    };
    const onUnreadState = (payload: unknown) => {
      if (payload && typeof payload === "object") {
        setAuthoritativeCounts(payload as any);
      }
    };
    const onMentionMarkedRead = (payload: unknown) => {
      removeUnreadMention(payload);
    };

    socket.on("mention_notification", onMention as any);
    socket.on("mention_read", onMentionRead as any);
    socket.on("mentions:unread_state", onUnreadState as any);
    socket.on("mention_marked_read", onMentionMarkedRead as any);

    return () => {
      socket.off("mention_notification", onMention as any);
      socket.off("mention_read", onMentionRead as any);
      socket.off("mentions:unread_state", onUnreadState as any);
      socket.off("mention_marked_read", onMentionMarkedRead as any);
    };
  }, [socket, userId]);

  return <>{children}</>;
}