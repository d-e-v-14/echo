// src/lib/socket/socket.types.ts
//
// Single, centralized socket event registry.
//
// Every event carries a standard envelope (spec §6) so that deduplication,
// reconnection and event reconciliation are safe:
//
//   { eventId, entityId, occurredAt, sequence, payload }
//
// `eventId`    - unique id for the event instance.
// `entityId`   - id of the entity the event is about (message, channel, user...).
// `occurredAt` - ISO timestamp of when the event was produced.
// `sequence`   - monotonically increasing server sequence number (when available).
// `payload`    - the event-specific body.

export interface SocketEventEnvelope<T = unknown> {
  eventId?: string;
  entityId?: string;
  occurredAt?: string;
  sequence?: number;
  payload: T;
}

// Convenience alias for arbitrary event payloads.
export type SocketEventPayload = Record<string, any>;

// The single event registry (spec §6).
//
// Event names correspond to the events the Echo server emits. Payloads are
// typed as envelopes; consumers that only need the body should read `.payload`.
export interface EchoSocketEvents {
  // ── Messaging ──────────────────────────────────────────────────────────
  new_message: SocketEventEnvelope<SocketEventPayload>;
  message_confirmed: SocketEventEnvelope<SocketEventPayload>;
  message_error: SocketEventEnvelope<SocketEventPayload>;
  // ── Reads / reactions ──────────────────────────────────────────────────
  reaction_updated: SocketEventEnvelope<SocketEventPayload>;
  // ── Friends / social ───────────────────────────────────────────────────
  friend_request: SocketEventEnvelope<SocketEventPayload>;
  friend_request_accepted: SocketEventEnvelope<SocketEventPayload>;
  presence_updated: SocketEventEnvelope<SocketEventPayload>;
  // ── DMs / notifications ────────────────────────────────────────────────
  receive_dm: SocketEventEnvelope<SocketEventPayload>;
  new_notification: SocketEventEnvelope<SocketEventPayload>;
  notification_created: SocketEventEnvelope<SocketEventPayload>;
  mention_notification: SocketEventEnvelope<SocketEventPayload>;
  mention_marked_read: SocketEventEnvelope<SocketEventPayload>;
  mention_read: SocketEventEnvelope<SocketEventPayload>;
  // ── Channels / server ──────────────────────────────────────────────────
  channel_updated: SocketEventEnvelope<SocketEventPayload>;
  voice_channel_roster: SocketEventEnvelope<SocketEventPayload>;
  // ── Voice / presence ───────────────────────────────────────────────────
  voice_invite_received: SocketEventEnvelope<SocketEventPayload>;
  voice_invite_sent: SocketEventEnvelope<SocketEventPayload>;
  voice_invite_error: SocketEventEnvelope<SocketEventPayload>;
  send_voice_invite: SocketEventEnvelope<SocketEventPayload>;
  join_voice_channel: SocketEventEnvelope<SocketEventPayload>;
  leave_voice_channel: SocketEventEnvelope<SocketEventPayload>;
  voice_state_update: SocketEventEnvelope<SocketEventPayload>;
  // ── Rooms ──────────────────────────────────────────────────────────────
  join_room: SocketEventEnvelope<SocketEventPayload>;
  leave_room: SocketEventEnvelope<SocketEventPayload>;
  presence_heartbeat: SocketEventEnvelope<SocketEventPayload>;
}

export type EchoSocketEventName = keyof EchoSocketEvents;

// The public surface a component can ask of the socket (spec §5). Components
// request `joinChannel` / `leaveChannel` instead of managing raw lifecycle.
export interface EchoSocket {
  connected: boolean;
  socketId: string | null;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  on: <
    E extends
      | EchoSocketEventName
      | "connect"
      | "disconnect"
      | "connect_error"
      | "reconnect",
  >(
    event: E,
    handler: (...args: any[]) => void
  ) => void;
  off: <
    E extends
      | EchoSocketEventName
      | "connect"
      | "disconnect"
      | "connect_error"
      | "reconnect",
  >(
    event: E,
    handler: (...args: any[]) => void
  ) => void;
  emit: (event: string, ...args: any[]) => void;
}
