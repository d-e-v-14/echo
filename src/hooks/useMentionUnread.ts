"use client";

import { useSyncExternalStore } from "react";
import { apiClient } from "@/utils/apiClient";
import {
  subscribe,
  getSnapshot,
  getSocketRef,
  removeChannelUnreadLocal,
  EMPTY_UNREAD_MENTIONS,
  type MentionUnreadEntry,
} from "@/lib/mentions/unreadStore";

export function useMentionUnreadCount(channelId: string): number {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().channelCounts[channelId] ?? 0,
    () => getSnapshot().channelCounts[channelId] ?? 0
  );
}

export function useServerUnreadCounts(): Readonly<Record<string, number>> {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().serverCounts,
    () => getSnapshot().serverCounts
  );
}

export function useChannelUnreadMentions(
  channelId: string
): ReadonlyArray<MentionUnreadEntry> {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().channelMentions.get(channelId) ?? EMPTY_UNREAD_MENTIONS,
    () => getSnapshot().channelMentions.get(channelId) ?? EMPTY_UNREAD_MENTIONS
  );
}

export async function markChannelRead(channelId: string): Promise<void> {
  if (!channelId) return;
  const removed = removeChannelUnreadLocal(channelId);
  if (removed.length === 0) return;

  const socket = getSocketRef();
  const ids = removed
    .map((entry) => entry.id)
    .filter((id) => Boolean(id));

  await Promise.all(
    ids.map((id) =>
      apiClient
        .patch(`/api/mentions/${encodeURIComponent(id)}/read`)
        .catch((error) =>
          console.error("Failed to mark mention as read:", error)
        )
    )
  );

  ids.forEach((id) => socket?.emit("mention_read", id));
}