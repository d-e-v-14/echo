import type { Socket } from "socket.io-client";
import { getAppSocket } from "./socket/appSocket";

export const getVoicePresenceSocket = (userId: string): Socket => {
  void userId;
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

export const disconnectVoicePresenceSocket = () => {
  /* no-op: app socket owned by SocketProvider */
};
