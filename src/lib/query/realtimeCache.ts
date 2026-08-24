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

// ---------------------------------------------------------------------------
// Realtime reconciliation policy.
//
// The realtime sync patches the cache DIRECTLY for every event whose payload
// is complete enough to reconcile (messages, reactions, channel/permission
// objects). This function only returns commands for the two remaining cases:
//
//   1. Ephemeral voice/presence state that must never be persisted.
//   2. Events with intentionally partial payloads, where the client cannot
//      build a safe patch and must fall back to a narrow refetch.
//
// It must never trigger a refetch of a dataset that the sync has already
// patched (e.g. a whole DM family on a single reaction).
// ---------------------------------------------------------------------------

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

/** True when the payload carries enough message data to patch the cache. */
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

/** True when the payload carries a channel object, not just its id. */
function hasChannelObject(payload: any): boolean {
  const body = unwrapEnvelope(payload);
  return Boolean(
    body?.name != null || body?.type != null || body?.is_private != null
  );
}

/** True when the payload carries the permission fields, not just an id. */
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

      // Reconcilable messages are patched directly into the message caches by
      // RealtimeCacheSync (channel window, DM conversation) and the DM list is
      // patched by ChatPage. No refetch is needed.
      if ((channelId || threadId) && hasMessagePayload(payload)) return [];

      // Intentionally partial payload: the sync cannot build a message, so
      // refetch only the affected window.
      if (channelId) {
        return [invalidate(queryKeys.channelMessages(channelId))];
      }
      return [];
    }

    case "reaction_updated":
      // Reaction state is patched directly into the shared reaction store, so
      // a single reaction must never refetch a whole DM family or channel.
      return [];

    case "receive_dm":
      // DM conversations are patched by the DM sync + ChatPage's list handler.
      return [];

    case "channel_updated": {
      const serverId = readString(payload, "server_id", "serverId");
      const channelId = readString(
        payload,
        "channel_id",
        "channelId",
        "entityId"
      );

      // A full channel object is patched into the server channel list and, when
      // permission fields ride along, into the permission cache. A channel
      // update never invalidates the message window.
      if (channelId && hasChannelObject(payload)) return [];

      // Partial payload (ids only): reconcile the channel list + permissions.
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
      // A payload with the permission fields is patched directly into the
      // permission cache.
      if (channelId && hasPermissionFields(payload)) return [];
      return channelId
        ? [invalidate(queryKeys.channelPermissions(channelId))]
        : [invalidate(["channel"])];
    }

    case "new_notification":
    case "notification_created":
    case "mention_notification":
    case "mention_marked_read":
    case "mention_read":
      // The notification list + unread counters are patched by the
      // notifications store; there is no query to refetch.
      return [];

    case "friend_request":
    case "friend_request_accepted":
    case "presence_updated":
      // Friend list/counter state is patched by its own components; a presence
      // event must not refetch the whole friends list.
      return [];

    case "voice_state_update":
    case "voice_channel_roster":
    case "voice_invite_sent":
    case "voice_invite_received":
    case "voice_invite_error":
    case "join_voice_channel":
    case "leave_voice_channel":
      // Ephemeral voice/presence state is never persisted in the cache.
      return [remove(["voice"], ["presence"])];

    default:
      return [];
  }
}