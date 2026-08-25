"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/lib/socket/SocketProvider";
import { isContentMentioningCurrentUser } from "@/lib/channels/messageUtils";

export interface UseChannelRealtimeOptions {
  channelId: string;
  currentUsername: string;
  onHighlight: (messageId: string | number) => void;
  onReconnect: () => void;
}

export function useChannelRealtime({
  channelId,
  currentUsername,
  onHighlight,
  onReconnect,
}: UseChannelRealtimeOptions) {
  const { socket, joinChannel, leaveChannel } = useSocket();
  const channelIdRef = useRef(channelId);

  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);

  useEffect(() => {
    if (!channelId) return;

    joinChannel(channelId);
    return () => {
      leaveChannel(channelId);
    };
  }, [channelId, joinChannel, leaveChannel]);

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

    const handleReconnect = () => onReconnect();

    socket.on("new_message", handleIncomingMessage);
    socket.on("reconnect", handleReconnect);

    return () => {
      socket.off("new_message", handleIncomingMessage);
      socket.off("reconnect", handleReconnect);
    };
  }, [socket, currentUsername, onHighlight, onReconnect]);
}
