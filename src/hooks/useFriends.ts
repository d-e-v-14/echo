"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchAllFriends } from "@/api";
import type { Friend } from "@/api/types/friend.types";
import { useSocket } from "@/lib/socket/SocketProvider";
import { queryKeys } from "@/lib/query/keys";

const FRIENDS_STALE_TIME_MS = 30_000;
const FRIENDS_GC_TIME_MS = 5 * 60_000;

export interface UseFriendsOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export function useFriends({
  enabled = true,
  refetchInterval = 0,
}: UseFriendsOptions = {}) {
  return useQuery<Friend[]>({
    queryKey: queryKeys.friends,
    queryFn: async () => {
      const data = await fetchAllFriends();
      return Array.isArray(data) ? data : [];
    },
    enabled,
    staleTime: FRIENDS_STALE_TIME_MS,
    gcTime: FRIENDS_GC_TIME_MS,
    refetchOnWindowFocus: true,
    refetchInterval: refetchInterval > 0 ? refetchInterval : false,
  });
}

export function useIsFriend(
  userId?: string | null,
  options?: UseFriendsOptions
) {
  const query = useFriends(options);

  const isFriend = useMemo(() => {
    if (!userId) return false;
    const id = String(userId);
    return (query.data ?? []).some((friend) => String(friend.id) === id);
  }, [query.data, userId]);

  return {
    isFriend,
    isLoaded: query.isSuccess,
  };
}

const FRIEND_SOCKET_EVENTS = [
  "friend_request",
  "friend_request_accepted",
  "friend_removed",
  "friend_removed_event",
  "friend_removal",
  "unfriended",
  "friends_updated",
  "relationship_changed",
] as const;

export function useFriendsRealtime() {
  const queryClient = useQueryClient();
  const { socket, connected } = useSocket();

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.friends });
  }, [queryClient]);

  useEffect(() => {
    if (connected) refresh();
  }, [connected, refresh]);

  useEffect(() => {
    if (!socket) return;

    const handlers = FRIEND_SOCKET_EVENTS.map((name) => {
      const handler = () => refresh();
      socket.on(name, handler as never);
      return { name, handler };
    });

    return () => {
      handlers.forEach(({ name, handler }) => socket.off(name, handler as never));
    };
  }, [socket, refresh]);

  return refresh;
}