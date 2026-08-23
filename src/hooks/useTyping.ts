"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSocket } from "@/lib/socket/SocketProvider";
import {
  TypingMap,
  pruneTyping,
  removeTyping,
  typingUsers,
  updateTyping,
} from "@/lib/channels/typing";

export interface UseTypingOptions {
  channelId: string;
  currentUserId: string;
}

export interface UseTypingResult {
  typingUsers: string[];
  sendTyping: () => void;
}

const TYPING_EMIT_DEBOUNCE_MS = 1200;

export function useTyping({
  channelId,
  currentUserId,
}: UseTypingOptions): UseTypingResult {
  const { socket, connected } = useSocket();
  const [typing, setTyping] = useState<TypingMap>({});
  const channelIdRef = useRef(channelId);
  const typingSendTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    channelIdRef.current = channelId;
  }, [channelId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTyping((prev) => pruneTyping(prev, Date.now()));
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleUserTyping = (payload: any) => {
      const userId =
        payload?.userId ||
        payload?.user_id ||
        payload?.senderId ||
        payload?.sender_id;
      const payloadChannel =
        payload?.channelId || payload?.channel_id || payload?.room;
      if (!userId) return;
      if (payloadChannel && payloadChannel !== channelIdRef.current) return;
      if (userId === currentUserId) return;

      setTyping((prev) => updateTyping(prev, String(userId), Date.now()));
    };

    const handleUserStopped = (payload: any) => {
      const userId =
        payload?.userId ||
        payload?.user_id ||
        payload?.senderId ||
        payload?.sender_id;
      if (!userId) return;

      setTyping((prev) => removeTyping(prev, String(userId)));
    };

    socket.on("user_typing", handleUserTyping);
    socket.on("user_stopped_typing", handleUserStopped);

    return () => {
      socket.off("user_typing", handleUserTyping);
      socket.off("user_stopped_typing", handleUserStopped);
    };
  }, [socket, currentUserId]);

  const sendTyping = useCallback(() => {
    if (!connected || !channelIdRef.current) return;

    if (typingSendTimerRef.current) {
      clearTimeout(typingSendTimerRef.current);
    }

    socket?.emit("typing", {
      channelId: channelIdRef.current,
      senderId: currentUserId,
    });

    typingSendTimerRef.current = setTimeout(() => {
      socket?.emit("typing_stopped", {
        channelId: channelIdRef.current,
        senderId: currentUserId,
      });
      typingSendTimerRef.current = null;
    }, TYPING_EMIT_DEBOUNCE_MS);
  }, [connected, socket, currentUserId]);

  useEffect(() => {
    return () => {
      if (typingSendTimerRef.current) {
        clearTimeout(typingSendTimerRef.current);
      }
    };
  }, []);

  return {
    typingUsers: typingUsers(typing, Date.now(), currentUserId),
    sendTyping,
  };
}
