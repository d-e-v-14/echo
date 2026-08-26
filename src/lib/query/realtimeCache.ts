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

function hasMessagePayload(payload: any): boolean {
  const body = unwrapEnvelope(payload);
  return Boolean(
    body?.id != null ||
      body?.message_id != null ||
      body?.temp_id != null ||
      body?.tempId != null ||
      body?.client_message_id != null ||
      body?.content != null ||
      body?.message != null ||
      body?.sender_id != null ||
      body?.senderId != null
  );
}

function hasChannelObject(payload: any): boolean {
  const body = unwrapEnvelope(payload);
  return Boolean(
    body?.name != null || body?.type != null || body?.is_private != null
  );
}

function hasPermissionFields(payload: any): boolean {
  const body = unwrapEnvelope(payload);
  return Boolean(
    body?.canView != null ||
      body?.canSend != null ||
      body?.isAdmin != null ||
      body?.isModerator != null ||
      body?.channelType != null ||
      body?.channel_type != null
  );
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
    case "new_message":
    case "message_confirmed":
    case "message_error": {
      const channelId = readString(payload, "channel_id", "channelId");
      const threadId = readString(payload, "thread_id", "threadId", "thread");

      if ((channelId || threadId) && hasMessagePayload(payload)) return [];

      if (channelId) {
        return [invalidate(queryKeys.channelMessages(channelId))];
      }
      return [];
    }

    case "reaction_updated":
      return [];

    case "receive_dm":
      return [];

    case "channel_updated": {
      const serverId = readString(payload, "server_id", "serverId");
      const channelId = readString(
        payload,
        "channel_id",
        "channelId",
        "entityId"
      );

      if (channelId && hasChannelObject(payload)) return [];

      const commands: CacheCommand[] = [];
      if (serverId) {
        commands.push(invalidate(queryKeys.serverChannels(serverId)));
      }
      if (channelId) {
        commands.push(invalidate(queryKeys.channelPermissions(channelId)));
      }
      return commands.length > 0 ? commands : [invalidate(["server"])];
    }

    case "permissions_updated": {
      const channelId = readString(payload, "channel_id", "channelId");
      if (channelId && hasPermissionFields(payload)) return [];
      return channelId
        ? [invalidate(queryKeys.channelPermissions(channelId))]
        : [invalidate(["channel"])];
    }

    case "mention_notification":
    case "mention_marked_read":
    case "mention_read":
      return [];

    case "friend_request":
    case "friend_request_accepted":
    case "presence_updated":
      return [];

    case "voice_state_update":
    case "voice_channel_roster":
    case "voice_invite_sent":
    case "voice_invite_received":
    case "voice_invite_error":
    case "join_voice_channel":
    case "leave_voice_channel":
      return [remove(["voice"], ["presence"])];

    default:
      return [];
  }
}