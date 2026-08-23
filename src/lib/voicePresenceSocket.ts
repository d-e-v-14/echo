import type { Socket } from "socket.io-client";
import { getAppSocket } from "./socket/appSocket";

// Voice presence emits go through the single application-level socket owned
// by <SocketProvider>. No dedicated presence socket is created here.

export const getVoicePresenceSocket = (userId: string): Socket => {
  void userId; // userId is retained for API compatibility; socket is app-level
  return getAppSocket() as Socket;
};

export const emitJoinVoiceChannel = (payload: {
  channelId: string;
  serverId?: string;
  username?: string;
  userId?: string;
  muted?: boolean;
  video?: boolean;
}) => {
  getAppSocket()?.emit("join_voice_channel", payload);
};

export const emitLeaveVoiceChannel = (payload: {
  channelId: string;
  serverId?: string;
}) => {
  getAppSocket()?.emit("leave_voice_channel", payload);
};

export const emitVoiceStateUpdate = (payload: {
  channelId: string;
  serverId?: string;
  muted: boolean;
  video: boolean;
  screenSharing?: boolean;
}) => {
  getAppSocket()?.emit("voice_state_update", payload);
};

// The app socket lifecycle is owned by <SocketProvider>, so presence teardown
// must NOT disconnect the shared socket. Kept as a no-op for compat.
export const disconnectVoicePresenceSocket = () => {
  /* no-op: app socket owned by SocketProvider */
};
