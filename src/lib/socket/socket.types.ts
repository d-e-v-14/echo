
export interface SocketEventEnvelope<T = unknown> {
  eventId?: string;
  entityId?: string;
  occurredAt?: string;
  sequence?: number;
  payload: T;
}

export type SocketEventPayload = Record<string, any>;

export interface EchoSocketEvents {
  new_message: SocketEventEnvelope<SocketEventPayload>;
  message_confirmed: SocketEventEnvelope<SocketEventPayload>;
  message_error: SocketEventEnvelope<SocketEventPayload>;
  reaction_updated: SocketEventEnvelope<SocketEventPayload>;
  friend_request: SocketEventEnvelope<SocketEventPayload>;
  friend_request_accepted: SocketEventEnvelope<SocketEventPayload>;
  presence_updated: SocketEventEnvelope<SocketEventPayload>;
  receive_dm: SocketEventEnvelope<SocketEventPayload>;
  new_notification: SocketEventEnvelope<SocketEventPayload>;
  notification_created: SocketEventEnvelope<SocketEventPayload>;
  mention_notification: SocketEventEnvelope<SocketEventPayload>;
  mention_marked_read: SocketEventEnvelope<SocketEventPayload>;
  mention_read: SocketEventEnvelope<SocketEventPayload>;
  channel_updated: SocketEventEnvelope<SocketEventPayload>;
  voice_channel_roster: SocketEventEnvelope<SocketEventPayload>;
  voice_invite_received: SocketEventEnvelope<SocketEventPayload>;
  voice_invite_sent: SocketEventEnvelope<SocketEventPayload>;
  voice_invite_error: SocketEventEnvelope<SocketEventPayload>;
  send_voice_invite: SocketEventEnvelope<SocketEventPayload>;
  join_voice_channel: SocketEventEnvelope<SocketEventPayload>;
  leave_voice_channel: SocketEventEnvelope<SocketEventPayload>;
  voice_state_update: SocketEventEnvelope<SocketEventPayload>;
  join_room: SocketEventEnvelope<SocketEventPayload>;
  leave_room: SocketEventEnvelope<SocketEventPayload>;
  presence_heartbeat: SocketEventEnvelope<SocketEventPayload>;
}

export type EchoSocketEventName = keyof EchoSocketEvents;

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
