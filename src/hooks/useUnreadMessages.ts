"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotifications } from "@/hooks/useNotifications";
import { ChannelMessage } from "@/lib/channels/types";
import { findUnreadDividerIndex } from "@/lib/channels/messageUtils";

export interface UseUnreadMessagesOptions {
  channelId: string;
  currentUserId: string;
  messages: ChannelMessage[];
}

export interface UseUnreadMessagesResult {
  lastReadTimestamp: string | null;
  unreadMentions: Array<{
    id: string;
    messageId: string;
    channelId: string;
    isRead?: boolean;
  }>;
  unreadMentionCount: number;
  unreadDividerIndex: number;
  markUnreadMentionsAsRead: () => Promise<void>;
  updateLastRead: (timestamp: string) => void;
}

const storageKey = (channelId: string, userId: string): string =>
  `channel_last_read_${channelId}_${userId}`;

export function useUnreadMessages({
  channelId,
  currentUserId,
  messages,
}: UseUnreadMessagesOptions): UseUnreadMessagesResult {
  const { notifications: mentionNotifications, markAsRead } =
    useNotifications();
  const [lastReadTimestamp, setLastReadTimestamp] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (!channelId || !currentUserId) {
      setLastReadTimestamp(null);
      return;
    }

    try {
      setLastReadTimestamp(
        localStorage.getItem(storageKey(channelId, currentUserId)) || null
      );
    } catch {
      setLastReadTimestamp(null);
    }
  }, [channelId, currentUserId]);

  const unreadMentions = useMemo(
    () =>
      mentionNotifications.filter(
        (notification) =>
          notification.channelId === channelId && !notification.isRead
      ),
    [mentionNotifications, channelId]
  );

  const unreadMentionCount = unreadMentions.length;

  const unreadDividerIndex = useMemo(
    () => findUnreadDividerIndex(messages, lastReadTimestamp, currentUserId),
    [messages, lastReadTimestamp, currentUserId]
  );

  const markUnreadMentionsAsRead = useCallback(async () => {
    if (unreadMentions.length === 0) return;

    await Promise.all(
      unreadMentions.map((notification) => markAsRead(notification.id))
    );
  }, [unreadMentions, markAsRead]);

  const updateLastRead = useCallback(
    (timestamp: string) => {
      setLastReadTimestamp(timestamp);
      try {
        localStorage.setItem(storageKey(channelId, currentUserId), timestamp);
      } catch {}
    },
    [channelId, currentUserId]
  );

  return {
    lastReadTimestamp,
    unreadMentions,
    unreadMentionCount,
    unreadDividerIndex,
    markUnreadMentionsAsRead,
    updateLastRead,
  };
}
