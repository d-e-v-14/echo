import { io, Socket, ManagerOptions, SocketOptions } from "socket.io-client";
import { VoiceVideoManager } from "./lib/VoiceVideoManager";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const SOCKET_PATH = process.env.NEXT_PUBLIC_SOCKET_PATH || "/socket.io";
const USE_CREDENTIALS =
  (process.env.NEXT_PUBLIC_SOCKET_WITH_CREDENTIALS ?? "true") === "true";

const baseConfig: Partial<ManagerOptions & SocketOptions> = {
  transports: ["websocket", "polling"],
  upgrade: true,

  timeout: 20000, // connect timeout

  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500, // initial
  reconnectionDelayMax: 5000, // cap
  randomizationFactor: 0.5,

  withCredentials: USE_CREDENTIALS,

  forceNew: true,

  autoConnect: true,

  path: SOCKET_PATH,
};

const HEARTBEAT_INTERVAL_MS = 30000;

export const createAuthSocket = (
  userId: string,
  extraAuth?: Record<string, any>
): Socket => {
  const socket = io(API_URL, {
    ...baseConfig,
    auth: { userId, ...(extraAuth || {}) },
  });

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  const stopHeartbeat = () => {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
  };

  const sendHeartbeat = () => {
    if (socket.connected) {
      socket.emit("presence:heartbeat");
    }
  };

  const startHeartbeat = () => {
    if (heartbeatTimer) return;
    sendHeartbeat();
    heartbeatTimer = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS);
  };

  socket.on("connect", () => {
    console.log("Socket connected", {
      id: socket.id,
      url: API_URL,
      path: SOCKET_PATH,
    });
    startHeartbeat();
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connect_error:", {
      message: err?.message,
      data: err,
    });
  });

  socket.on("disconnect", (reason) => {
    console.warn("Socket disconnected:", reason);
    stopHeartbeat();
    if (reason === "io server disconnect") socket.connect();
  });

  return socket;
};

export const waitForConnect = (socket: Socket, ms = 15000) =>
  new Promise<void>((resolve, reject) => {
    if (socket.connected) return resolve();
    const t = setTimeout(() => {
      cleanup();
      reject(new Error("Socket connect timeout"));
    }, ms);
    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onError = (e: any) => {
      cleanup();
      reject(e);
    };
    const cleanup = () => {
      clearTimeout(t);
      socket.off("connect", onConnect);
      socket.off("connect_error", onError);
    };
    socket.on("connect", onConnect);
    socket.on("connect_error", onError);
  });

export { VoiceVideoManager };
