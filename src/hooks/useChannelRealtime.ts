"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/lib/socket/SocketProvider";
import { isContentMentioningCurrentUser } from "@/lib/channels/messageUtils";

export interface UseChannelRealtimeOptions {
  channelId: string;
  currentUsername: string;
  onHighlight: (messageId: string | number) => void;
  onReconnect: () => void;
  onMessageDeleted?: (messageId: string | number) => void;
}

export function useChannelRealtime({
  channelId,
  currentUsername,
  onHighlight,
  onReconnect,
  onMessageDeleted,
}: UseChannelRealtimeOptions) {
  const { socket, joinChannel } = useSocket();
  const channelIdRef = useRef(channelId);

  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);

  useEffect(() => {
    if (!channelId) return;

    joinChannel(channelId);
  }, [channelId, joinChannel]);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingMessage = (saved: any) => {
      const messageId = saved?.id || saved?.messageId;

      if (!messageId) return;

      const messageChannelId = saved?.channel_id || saved?.channelId;
      if (
        messageChannelId &&
        String(messageChannelId) !== String(channelIdRef.current)
      ) {
        return;
      }

      if (isContentMentioningCurrentUser(saved?.content, currentUsername)) {
        onHighlight(messageId);
      }
    };

    const handleMessageDeleted = (payload: any) => {
      const messageId = payload?.message_id ?? payload?.messageId;
      if (!messageId) return;

      const messageChannelId = payload?.channel_id ?? payload?.channelId;
      if (
        messageChannelId &&
        String(messageChannelId) !== String(channelIdRef.current)
      ) {
        return;
      }

      onMessageDeleted?.(messageId);
    };

    const handleReconnect = () => onReconnect();

    socket.on("new_message", handleIncomingMessage);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("reconnect", handleReconnect);

    return () => {
      socket.off("new_message", handleIncomingMessage);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("reconnect", handleReconnect);
    };
  }, [socket, currentUsername, onHighlight, onReconnect, onMessageDeleted]);
}
