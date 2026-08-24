import { queryKeys } from "@/lib/query/keys";
import type { CacheCommand } from "@/lib/query/cacheCommand.types";

export { type CacheCommand } from "@/lib/query/cacheCommand.types";

export const REALTIME_CACHE_EVENTS = [
  "new_message",
  "message_confirmed",
  "message_error",
  "reaction_updated",
  "channel_updated",
  "permissions_updated",
  "receive_dm",
  "new_notification",
  "notification_created",
  "mention_notification",
  "mention_marked_read",
  "mention_read",
  "friend_request",
  "friend_request_accepted",
  "presence_updated",
  "voice_state_update",
  "voice_channel_roster",
  "voice_invite_sent",
  "voice_invite_received",
  "voice_invite_error",
  "join_voice_channel",
  "leave_voice_channel",
] as const;

function unwrapEnvelope(payload: any): any {
  return payload && typeof payload === "object" && "payload" in payload
    ? payload.payload
    : payload;
}

function firstValue(...values: any[]): string | undefined {
  for (const value of values) {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return String(value);
    }
  }
  return undefined;
}

function readString(payload: any, ...keys: string[]): string | undefined {
  const body = unwrapEnvelope(payload);
  for (const key of keys) {
    if (body?.[key] !== undefined && body?.[key] !== null) {
      return firstValue(body[key]);
    }
  }
  return undefined;
}

function invalidate(...queryKeysArg: readonly (readonly unknown[])[]) {
  return { type: "invalidate" as const, queryKeys: queryKeysArg };
}

function remove(...queryKeysArg: readonly (readonly unknown[])[]) {
  return { type: "remove" as const, queryKeys: queryKeysArg };
}

export function realtimeEventToCommands(
  eventName: string,
  payload?: unknown
): CacheCommand[] {
  switch (eventName) {
    case "channel_updated": {
      const serverId = readString(payload, "server_id", "serverId");
      const channelId = readString(
        payload,
        "channel_id",
        "channelId",
        "entityId"
      );
      const commands: CacheCommand[] = serverId
        ? [invalidate(queryKeys.server(serverId), queryKeys.serverChannels(serverId))]
        : [invalidate(["server"])];

      if (channelId) {
        commands.push(
          invalidate(queryKeys.channelPermissions(channelId), queryKeys.channelMessages(channelId))
        );
      }

      return commands;
    }

    case "new_message":
    case "message_confirmed":
    case "message_error": {
      const channelId = readString(payload, "channel_id", "channelId");
      const threadId = readString(payload, "thread_id", "threadId", "thread");

      // DM messages are inserted into the conversation cache directly by the
      // realtime sync (setQueryData). Only reconcile the DM list preview here;
      // do not refetch an entire conversation on every socket event.
      if (threadId) {
        return [invalidate(queryKeys.dms)];
      }
      if (channelId) {
        return [invalidate(queryKeys.channelMessages(channelId))];
      }
      return [];
    }

    case "reaction_updated": {
      const channelId = readString(payload, "channel_id", "channelId");
      const threadId = readString(payload, "thread_id", "threadId");
      // DM message caches are keyed by the other user's id, which is not
      // present in reaction payloads, so reconcile the whole DM family.
      if (threadId) return [invalidate(["dm"])];
      if (channelId) return [invalidate(queryKeys.channelMessages(channelId))];
      return [];
    }

    case "receive_dm": {
      const channelId = readString(payload, "channel_id", "channelId");
      const keys: (readonly unknown[])[] = [queryKeys.dms];
      if (channelId) keys.push(queryKeys.channelMessages(channelId));
      return [invalidate(...keys)];
    }

    case "new_notification":
    case "notification_created":
    case "mention_notification":
    case "mention_marked_read":
    case "mention_read":
      return [invalidate(queryKeys.notifications, queryKeys.unreadCounts)];

    case "friend_request":
    case "friend_request_accepted":
    case "presence_updated":
      return [invalidate(queryKeys.friends, queryKeys.friendRequests)];

    case "voice_state_update":
    case "voice_channel_roster":
    case "voice_invite_sent":
    case "voice_invite_received":
    case "voice_invite_error":
    case "join_voice_channel":
    case "leave_voice_channel":
      return [remove(["voice"], ["presence"])];

    case "permissions_updated": {
      const channelId = readString(payload, "channel_id", "channelId");
      return [
        channelId
          ? invalidate(queryKeys.channelPermissions(channelId))
          : invalidate(["channel"]),
      ];
    }

    default:
      return [];
  }
}
