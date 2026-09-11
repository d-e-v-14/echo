"use client";

import { useSyncExternalStore } from "react";
import {
  subscribeMessageUnread,
  getMessageUnreadSnapshot,
  setActiveMessageChannel,
} from "@/lib/messages/messageUnreadStore";

export function useServerMessageUnreadCounts(): Readonly<Record<string, number>> {
  return useSyncExternalStore(
    subscribeMessageUnread,
    () => getMessageUnreadSnapshot().serverCounts,
    () => getMessageUnreadSnapshot().serverCounts
  );
}

export function useChannelMessageUnreadCount(channelId: string): number {
  return useSyncExternalStore(
    subscribeMessageUnread,
    () => getMessageUnreadSnapshot().channelCounts[channelId] ?? 0,
    () => getMessageUnreadSnapshot().channelCounts[channelId] ?? 0
  );
}

export { setActiveMessageChannel };