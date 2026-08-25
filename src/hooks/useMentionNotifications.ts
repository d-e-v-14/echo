"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSocket } from "@/lib/socket/SocketProvider";

export function useMentionNotifications() {
  const { socket } = useSocket();
  const [unreadMentionsCount, setUnreadMentionsCount] = useState(0);

  useEffect(() => {
    if (!socket) return;

    socket.on("mention_notification", (data) => {
      console.log("Received mention notification:", data);
      setUnreadMentionsCount((prev) => prev + 1);

      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("New Mention", {
          body: `You were mentioned in a message`,
          icon: "/echo-logo.png",
        });
      }
    });

    return () => {
      socket.off("mention_notification");
    };
  }, [socket]);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const response = await fetch("/api/mentions?unreadOnly=true", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadMentionsCount(data.length);
      }
    } catch (error) {
      console.error("Failed to fetch unread mentions count:", error);
    }
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        const permission = await Notification.requestPermission();
        return permission === "granted";
      }
      return Notification.permission === "granted";
    }
    return false;
  }, []);

  const markMentionAsRead = useCallback(() => {
    setUnreadMentionsCount((prev) => Math.max(0, prev - 1));
  }, []);

  const markAllMentionsAsRead = useCallback(() => {
    setUnreadMentionsCount(0);
  }, []);

  return useMemo(
    () => ({
      unreadMentionsCount,
      fetchUnreadCount,
      requestNotificationPermission,
      markMentionAsRead,
      markAllMentionsAsRead,
      socket,
    }),
    [
      unreadMentionsCount,
      fetchUnreadCount,
      requestNotificationPermission,
      markMentionAsRead,
      markAllMentionsAsRead,
      socket,
    ]
  );
}
