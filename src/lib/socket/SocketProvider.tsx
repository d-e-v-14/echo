// src/lib/socket/SocketProvider.tsx
"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { useUser } from "@/components/UserContext";
import { tokenStore } from "@/lib/auth/tokenStore";
import { setAppSocket, getAppSocket } from "./appSocket";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const SOCKET_PATH = process.env.NEXT_PUBLIC_SOCKET_PATH || "/socket.io";
const USE_CREDENTIALS =
  (process.env.NEXT_PUBLIC_SOCKET_WITH_CREDENTIALS ?? "true") === "true";

const HEARTBEAT_INTERVAL_MS = 30000;

// Socket.IO's built-in reconnection strategy (spec §5): do NOT hand-roll a
// 5-second reconnect poll. Reconnection Delay / Max / randomization are the
// backoff that produces healthy reconnect behaviour.
const SOCKET_CONFIG = {
  transports: ["websocket", "polling"],
  upgrade: true,
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 500,
  reconnectionDelayMax: 5000,
  randomizationFactor: 0.5,
  withCredentials: USE_CREDENTIALS,
  forceNew: true,
  autoConnect: true,
  path: SOCKET_PATH,
};

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  socketId: string | null;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);

  // Always-current handle to the live socket (for stable callbacks).
  const socketRef = useRef<Socket | null>(null);
  // Rooms the app is currently interested in. Re-joined after (re)connection
  // so server-side room membership survives reconnects and socket recreation.
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback((sock: Socket) => {
    if (heartbeatRef.current) return;
    if (sock.connected) sock.emit("presence:heartbeat");
    heartbeatRef.current = setInterval(() => {
      if (sock.connected) sock.emit("presence:heartbeat");
    }, HEARTBEAT_INTERVAL_MS);
  }, []);

  useEffect(() => {
    if (!userId) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    const connectSocket = async () => {
      const token = await tokenStore.ensureAccessToken();
      if (disposed || !token) return;

      const newSocket = io(API_URL, {
        ...SOCKET_CONFIG,

        auth: async (cb: (auth: Record<string, unknown>) => void) => {
          const freshToken = await tokenStore.ensureAccessToken();
          cb({ userId, token: freshToken });
        },
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
      setAppSocket(newSocket);
      setConnected(newSocket.connected);
      setSocketId(newSocket.id ?? null);

      const handleConnect = () => {
        setConnected(true);
        setSocketId(newSocket.id ?? null);
        startHeartbeat(newSocket);

        joinedRoomsRef.current.forEach((roomId) => {
          newSocket.emit("join_room", roomId);
        });
      };

      const handleDisconnect = (reason: string) => {
        setConnected(false);
        setSocketId(null);
        stopHeartbeat();
        // Server-initiated disconnects need an explicit reconnect in Socket.IO.
        if (reason === "io server disconnect") newSocket.connect();
      };

      const handleConnectError = async (err: Error) => {
        console.error("Socket connect_error:", { message: err?.message });
        // The auth callback refreshes the access token for the next attempt. If
        // the session is genuinely gone, stop retrying and let the app redirect.
        const ok = await tokenStore.refresh();
        if (!ok) {
          newSocket.disconnect();
        }
      };

      newSocket.on("connect", handleConnect);
      newSocket.on("disconnect", handleDisconnect);
      newSocket.on("connect_error", handleConnectError);

      cleanup = () => {
        stopHeartbeat();
        newSocket.off("connect", handleConnect);
        newSocket.off("disconnect", handleDisconnect);
        newSocket.off("connect_error", handleConnectError);
        newSocket.disconnect();
        setConnected(false);
        setSocketId(null);
        joinedRoomsRef.current.clear();
        if (socketRef.current === newSocket) socketRef.current = null;
        if (getAppSocket() === newSocket) setAppSocket(null);
      };
    };

    void connectSocket();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [userId, startHeartbeat, stopHeartbeat]);

  const joinChannel = useCallback((channelId: string) => {
    if (!channelId) return;
    joinedRoomsRef.current.add(channelId);
    if (socketRef.current?.connected) {
      socketRef.current.emit("join_room", channelId);
    }
  }, []);

  const leaveChannel = useCallback((channelId: string) => {
    if (!channelId) return;
    joinedRoomsRef.current.delete(channelId);
    socketRef.current?.emit("leave_room", channelId);
  }, []);

  const value = useMemo<SocketContextValue>(
    () => ({
      socket,
      connected,
      socketId,
      joinChannel,
      leaveChannel,
    }),
    [socket, connected, socketId, joinChannel, leaveChannel]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket(): SocketContextValue {
  const ctx = useContext(SocketContext);
  if (!ctx) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return ctx;
}
