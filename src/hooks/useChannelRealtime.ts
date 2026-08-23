"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/lib/socket/SocketProvider";
import { ChannelMessage } from "@/lib/channels/types";
import {
  isContentMentioningCurrentUser,
  normalizeChannelMessage,
} from "@/lib/channels/messageUtils";

export interface UseChannelRealtimeOptions {
  channelId: string;
  currentUserId: string;
  currentUsername: string;
  resolveAvatarUrl: (userId: string, raw?: unknown) => Promise<string>;
  onIncoming: (message: ChannelMessage) => void;
  onHighlight: (messageId: string | number) => void;
  onReconnect: () => void;
}

export function useChannelRealtime({
  channelId,
  currentUserId,
  currentUsername,
  resolveAvatarUrl,
  onIncoming,
  onHighlight,
  onReconnect,
}: UseChannelRealtimeOptions) {
  const { socket, joinChannel, leaveChannel } = useSocket();
  const channelIdRef = useRef(channelId);
  const receivedIdsRef = useRef<Set<string | number>>(new Set());
  const usernamesRef = useRef<Record<string, string>>({});

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

    const handleIncomingMessage = async (saved: any) => {
      const messageId = saved?.id || saved?.messageId;

      if (!messageId) return;

      if (saved?.channel_id && saved.channel_id !== channelIdRef.current) {
        return;
      }

      if (receivedIdsRef.current.has(messageId)) {
        return;
      }

      if (isContentMentioningCurrentUser(saved?.content, currentUsername)) {
        onHighlight(messageId);
      }

      const senderId = saved?.sender_id || saved?.senderId || "";
      const resolvedUsername =
        senderId === currentUserId
          ? "You"
          : saved?.username ||
            (saved?.sender &&
              (saved.sender.username ||
                saved.sender.fullname ||
                saved.sender.name)) ||
            saved?.sender_name ||
            saved?.senderName ||
            saved?.name ||
            usernamesRef.current[senderId] ||
            "Unknown";

      const avatarUrl = await resolveAvatarUrl(senderId, saved);

      const message = normalizeChannelMessage(
        { ...saved, username: resolvedUsername },
        currentUserId,
        avatarUrl
      );

      if (senderId && resolvedUsername && resolvedUsername !== "Unknown") {
        usernamesRef.current[senderId] = resolvedUsername;
      }

      onIncoming(message);
      receivedIdsRef.current.add(messageId);

      setTimeout(
        () => {
          receivedIdsRef.current.delete(messageId);
        },
        10 * 60 * 1000
      );
    };

    const handleReconnect = () => onReconnect();

    socket.on("new_message", handleIncomingMessage);
    socket.on("reconnect", handleReconnect);

    return () => {
      socket.off("new_message", handleIncomingMessage);
      socket.off("reconnect", handleReconnect);
    };
  }, [
    socket,
    currentUserId,
    currentUsername,
    resolveAvatarUrl,
    onIncoming,
    onHighlight,
    onReconnect,
  ]);
}
