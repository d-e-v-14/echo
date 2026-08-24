"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/lib/socket/SocketProvider";
import { useUser } from "@/components/UserContext";
import {
  REALTIME_CACHE_EVENTS,
  realtimeEventToCommands,
} from "@/lib/query/realtimeCache";
import type { CacheCommand } from "@/lib/query/cacheCommand.types";
import type { DmMessagesData } from "@/lib/dm/types";
import type { ChannelMessagesData } from "@/lib/channels/types";
import { queryKeys } from "@/lib/query/keys";
import {
  insertIncomingIntoDataOrCreate,
} from "@/lib/dm/messageUtils";
import {
  resolveDmConversationId,
  toDmMessageFromSocket,
  unwrapSocketPayload,
} from "@/lib/dm/socketEvents";
import {
  insertIncomingIntoDataOrCreate as insertChannelIncomingIntoDataOrCreate,
} from "@/lib/channels/cache";
import {
  resolveChannelId,
  toChannelMessageFromSocket,
} from "@/lib/channels/socketEvents";

const DEBOUNCE_MS = 250;

const DM_MESSAGE_EVENTS = ["receive_dm", "dm_sent_confirmation", "new_message"] as const;
const CHANNEL_MESSAGE_EVENTS = ["new_message", "message_confirmed"] as const;

export function RealtimeCacheSync() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();
  const { user } = useUser();
  const currentUserId = user?.id ?? undefined;

  const pendingInvalidate = useRef<Set<string>>(new Set());
  const pendingRemove = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket) return;

    const flush = () => {
      for (const key of pendingInvalidate.current) {
        queryClient.invalidateQueries({ queryKey: JSON.parse(key) });
      }
      for (const key of pendingRemove.current) {
        queryClient.removeQueries({ queryKey: JSON.parse(key) });
      }
      pendingInvalidate.current.clear();
      pendingRemove.current.clear();
    };

    const schedule = (commands: CacheCommand[]) => {
      for (const command of commands) {
        if (command.type === "invalidate") {
          for (const key of command.queryKeys) {
            pendingInvalidate.current.add(JSON.stringify(key));
          }
        } else {
          for (const key of command.queryKeys) {
            pendingRemove.current.add(JSON.stringify(key));
          }
        }
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, DEBOUNCE_MS);
    };

    const handlers = REALTIME_CACHE_EVENTS.map<{
      name: string;
      handler: (...args: any[]) => void;
    }>((name) => {
      const handler = (payload: unknown) => {
        const commands = realtimeEventToCommands(name, payload);
        if (commands.length > 0) {
          schedule(commands);
        }
      };
      socket.on(name, handler as any);
      return { name, handler };
    });

    return () => {
      for (const { name, handler } of handlers) {
        socket.off(name, handler as any);
      }
      if (timer.current) clearTimeout(timer.current);
      pendingInvalidate.current.clear();
      pendingRemove.current.clear();
    };
  }, [socket, queryClient]);

  // DM messages: insert incoming socket messages straight into the TanStack
  // Query cache so the UI updates immediately and conversations keep their
  // messages after navigating away and back. Deduplication happens inside
  // insertIncomingIntoDataOrCreate (stable server message id).
  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handlers = DM_MESSAGE_EVENTS.map<{
      name: string;
      handler: (payload: unknown) => void;
    }>((name) => {
      const handler = (payload: unknown) => {
        const body = unwrapSocketPayload(payload);
        const conversationId = resolveDmConversationId(body, currentUserId);
        if (!conversationId) return;
        const incoming = toDmMessageFromSocket(body);
        if (!incoming) return;

        queryClient.setQueryData<DmMessagesData>(
          queryKeys.dmMessages(conversationId),
          (old) => insertIncomingIntoDataOrCreate(old, incoming)
        );
      };
      socket.on(name, handler as any);
      return { name, handler };
    });

    return () => {
      for (const { name, handler } of handlers) {
        socket.off(name, handler as any);
      }
    };
  }, [socket, queryClient, currentUserId]);

  // Channel messages: same direct-cache-patch model as DMs. The message is
  // inserted into the newest page of the channel's cached window so the UI
  // updates immediately and the window survives navigation. We only patch a
  // window that has already been materialized — a channel the user has never
  // opened is left empty and fetched fresh on first open, avoiding a
  // one-message orphan page.
  useEffect(() => {
    if (!socket || !currentUserId) return;

    const handlers = CHANNEL_MESSAGE_EVENTS.map<{
      name: string;
      handler: (payload: unknown) => void;
    }>((name) => {
      const handler = (payload: unknown) => {
        const body = unwrapSocketPayload(payload);
        const channelId = resolveChannelId(body);
        if (!channelId) return;
        const incoming = toChannelMessageFromSocket(body, currentUserId);
        if (!incoming) return;

        const key = queryKeys.channelMessages(channelId);
        if (!queryClient.getQueryData(key)) return;

        queryClient.setQueryData<ChannelMessagesData>(
          key,
          (old) => insertChannelIncomingIntoDataOrCreate(old, incoming)
        );
      };
      socket.on(name, handler as any);
      return { name, handler };
    });

    return () => {
      for (const { name, handler } of handlers) {
        socket.off(name, handler as any);
      }
    };
  }, [socket, queryClient, currentUserId]);

  return null;
}
