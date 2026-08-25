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
import type { ChannelPermissions } from "@/lib/channels/types";
import { queryKeys } from "@/lib/query/keys";
import {
  insertIncomingIntoDataOrCreate,
  markMessageFailedById,
  reconcileConfirmedMessage,
} from "@/lib/dm/messageUtils";
import {
  resolveDmConversationId,
  toDmMessageFromSocket,
  unwrapSocketPayload,
} from "@/lib/dm/socketEvents";
import {
  insertIncomingIntoDataOrCreate as insertChannelIncomingIntoDataOrCreate,
  markMessageFailedById as markChannelMessageFailedById,
  reconcileConfirmedMessage as reconcileChannelConfirmedMessage,
  upsertChannelInList,
  channelListItemFromPayload,
  channelPermissionsFromPayload,
} from "@/lib/channels/cache";
import {
  resolveChannelId,
  toChannelMessageFromSocket,
} from "@/lib/channels/socketEvents";
import {
  reactionEventToUpdater,
  updateReactionStore,
} from "@/lib/query/reactionStore";

const DEBOUNCE_MS = 250;

const DM_MESSAGE_EVENTS = [
  "receive_dm",
  "dm_sent_confirmation",
  "new_message",
  "message_confirmed",
  "message_error",
] as const;
const CHANNEL_MESSAGE_EVENTS = [
  "new_message",
  "message_confirmed",
  "message_error",
] as const;

type ChannelListItem = {
  id: string;
  name: string;
  type: string;
  is_private: boolean;
};

const readString = (body: any, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = body?.[key];
    if (value !== undefined && value !== null) return String(value);
  }
  return undefined;
};

const readMessageId = (body: any): string | undefined =>
  readString(body, "message_id", "id", "entityId", "messageId");

const readTempId = (body: any): string | undefined =>
  readString(
    body,
    "temp_id",
    "tempId",
    "client_message_id",
    "clientMessageId",
    "local_id",
    "clientId"
  );

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
        const key = queryKeys.dmMessages(conversationId);

        if (name === "message_error") {
          const messageId = readMessageId(body) ?? readTempId(body);
          if (!messageId) return;
          queryClient.setQueryData<DmMessagesData>(key, (old) =>
            old ? markMessageFailedById(old, messageId) : old
          );
          return;
        }

        const incoming = toDmMessageFromSocket(body);
        if (!incoming) return;

        if (name === "message_confirmed") {
          queryClient.setQueryData<DmMessagesData>(key, (old) =>
            reconcileConfirmedMessage(old, readTempId(body), incoming)
          );
          return;
        }

        queryClient.setQueryData<DmMessagesData>(key, (old) =>
          insertIncomingIntoDataOrCreate(old, incoming)
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
        const key = queryKeys.channelMessages(channelId);
        if (!queryClient.getQueryData(key)) return;

        if (name === "message_error") {
          const messageId = readMessageId(body) ?? readTempId(body);
          if (!messageId) return;
          queryClient.setQueryData<ChannelMessagesData>(key, (old) =>
            old ? markChannelMessageFailedById(old, messageId) : old
          );
          return;
        }

        const incoming = toChannelMessageFromSocket(body, currentUserId);
        if (!incoming) return;

        if (name === "message_confirmed") {
          queryClient.setQueryData<ChannelMessagesData>(key, (old) =>
            reconcileChannelConfirmedMessage(old, readTempId(body), incoming)
          );
          return;
        }

        queryClient.setQueryData<ChannelMessagesData>(key, (old) =>
          insertChannelIncomingIntoDataOrCreate(old, incoming)
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

  useEffect(() => {
    if (!socket) return;

    const handler = (payload: unknown) => {
      const updater = reactionEventToUpdater(payload);
      if (updater) updateReactionStore(updater);
    };
    socket.on("reaction_updated", handler as any);

    return () => {
      socket.off("reaction_updated", handler as any);
    };
  }, [socket]);

  useEffect(() => {
    if (!socket) return;

    const handler = (payload: unknown) => {
      const body = unwrapSocketPayload(payload);
      const channelId = readString(body, "channel_id", "channelId", "entityId");
      if (!channelId) return;

      const channelItem = channelListItemFromPayload(payload);
      if (channelItem) {
        const serverId = readString(body, "server_id", "serverId");
        if (serverId) {
          queryClient.setQueryData(
            queryKeys.serverChannels(serverId),
            (old: ChannelListItem[] | undefined) =>
              upsertChannelInList(old, channelItem)
          );
        }
      }

      const permissions = channelPermissionsFromPayload(payload);
      if (permissions) {
        queryClient.setQueryData<ChannelPermissions>(
          queryKeys.channelPermissions(channelId),
          () => permissions
        );
      }
    };
    socket.on("channel_updated", handler as any);

    return () => {
      socket.off("channel_updated", handler as any);
    };
  }, [socket, queryClient]);

  useEffect(() => {
    if (!socket) return;

    const handler = (payload: unknown) => {
      const body = unwrapSocketPayload(payload);
      const channelId = readString(body, "channel_id", "channelId");
      if (!channelId) return;

      const permissions = channelPermissionsFromPayload(payload);
      if (!permissions) return;

      queryClient.setQueryData<ChannelPermissions>(
        queryKeys.channelPermissions(channelId),
        () => permissions
      );
    };
    socket.on("permissions_updated", handler as any);

    return () => {
      socket.off("permissions_updated", handler as any);
    };
  }, [socket, queryClient]);

  return null;
}