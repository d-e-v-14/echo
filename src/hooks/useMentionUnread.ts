"use client";

import { useSyncExternalStore } from "react";
import { apiClient } from "@/utils/apiClient";
import {
  subscribe,
  getSnapshot,
  getSocketRef,
  removeChannelUnreadLocal,
  restoreUnreadEntries,
  resolveChannelServerId,
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

export function useTotalUnreadCount(): number {
  return useSyncExternalStore(
    subscribe,
    () => getSnapshot().totalUnread,
    () => getSnapshot().totalUnread
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

function emitSocketRead(payload: {
  notificationIds: string[];
  channelId?: string;
  serverId?: string;
}): void {
  const socket = getSocketRef();
  if (socket?.emit) {
    socket.emit("mention_read", payload as any);
  }
}

async function patchPerId(ids: string[]): Promise<string[]> {
  const failed: string[] = [];
  await Promise.all(
    ids.map((id) =>
      apiClient
        .patch(`/api/mentions/${encodeURIComponent(id)}/read`)
        .catch(() => {
          failed.push(id);
        })
    )
  );
  return failed;
}

/**
 * Mark every mention in a channel as read.
 *
 * Optimistically clears the local state first, then confirms with the
 * server. On the new backend a single `PATCH /api/mentions/channel/:id/read`
 * clears the whole channel; on older deploys (or when serverId is unknown)
 * it falls back to per-mention updates. Any entry the server did not
 * acknowledge is rolled back so counters never go silently stale.
 */
export async function markChannelRead(
  channelId: string,
  serverId?: string
): Promise<void> {
  if (!channelId) return;

  const resolvedServerId = serverId ?? resolveChannelServerId(channelId);
  const removed = removeChannelUnreadLocal(channelId);

  const ids = removed
    .map((entry) => entry.id)
    .filter((id) => Boolean(id));

  const rollback = () => {
    if (removed.length > 0) restoreUnreadEntries(removed);
  };

  if (resolvedServerId) {
    try {
      await apiClient.patch(
        `/api/mentions/channel/${encodeURIComponent(channelId)}/read`,
        { serverId: resolvedServerId }
      );
      emitSocketRead({
        notificationIds: ids,
        channelId,
        serverId: resolvedServerId,
      });
      return;
    } catch {
      // Fall through to per-mention updates for older backends.
    }
  }

  if (ids.length > 0) {
    const failed = await patchPerId(ids);
    if (failed.length > 0) {
      rollback();
      return;
    }
    emitSocketRead({ notificationIds: ids, channelId });
  }
}

/**
 * Mark every unread mention in a server as read (clears all its channels).
 */
export async function markServerRead(serverId: string): Promise<void> {
  if (!serverId) return;

  const snapshot = getSnapshot();
  const channels = snapshot.serverChannels.get(serverId) ?? [];
  const removed: MentionUnreadEntry[] = [];
  for (const channelId of channels) {
    removed.push(...removeChannelUnreadLocal(channelId));
  }

  const ids = removed.map((entry) => entry.id).filter((id) => Boolean(id));

  if (ids.length === 0) return;

  try {
    await apiClient.patch(
      `/api/mentions/server/${encodeURIComponent(serverId)}/read`
    );
    emitSocketRead({ notificationIds: ids, serverId });
  } catch {
    const failed = await patchPerId(ids);
    if (failed.length > 0) {
      restoreUnreadEntries(removed);
    } else {
      emitSocketRead({ notificationIds: ids, serverId });
    }
  }
}

/**
 * Mark every unread mention across all servers as read.
 */
export async function markAllMentionsRead(): Promise<void> {
  const snapshot = getSnapshot();
  const channels = Array.from(snapshot.byChannel.keys());
  const removed: MentionUnreadEntry[] = [];
  for (const channelId of channels) {
    removed.push(...removeChannelUnreadLocal(channelId));
  }

  const ids = removed.map((entry) => entry.id).filter((id) => Boolean(id));

  if (ids.length === 0) return;

  try {
    await apiClient.patch("/api/mentions/mark-all-read");
    emitSocketRead({ notificationIds: ids });
  } catch {
    const failed = await patchPerId(ids);
    if (failed.length > 0) {
      restoreUnreadEntries(removed);
    } else {
      emitSocketRead({ notificationIds: ids });
    }
  }
}