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
import { toast } from "@/contexts/ToastContext";
import { setAppSocket, getAppSocket } from "./appSocket";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const SOCKET_PATH = process.env.NEXT_PUBLIC_SOCKET_PATH || "/socket.io";
const USE_CREDENTIALS =
  (process.env.NEXT_PUBLIC_SOCKET_WITH_CREDENTIALS ?? "true") === "true";

const HEARTBEAT_INTERVAL_MS = 30000;

// Give up reconnecting after a bounded number of attempts so a down/unreachable
// server can't trigger an endless stream of connection + token-refresh requests.
const SOCKET_CONFIG = {
  transports: ["websocket", "polling"],
  upgrade: true,
  timeout: 20000,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,
  randomizationFactor: 0.5,
  withCredentials: USE_CREDENTIALS,
  forceNew: true,
  autoConnect: true,
  path: SOCKET_PATH,
};

interface SocketContextValue {
  socket: Socket | null;
  connected: boolean;
  connectionFailed: boolean;
  socketId: string | null;
  joinChannel: (channelId: string) => void;
  leaveChannel: (channelId: string) => void;
  retryConnect: () => void;
}

const SocketContext = createContext<SocketContextValue | undefined>(undefined);

const getJoinRoomError = (response: unknown): string | null => {
  if (response == null) return null;
  if (typeof response === "string") return response;
  if (response instanceof Error) return response.message || null;
  const obj = response as { error?: unknown; success?: boolean };
  if (obj.error) {
    if (typeof obj.error === "string") return obj.error;
    if (obj.error instanceof Error) return obj.error.message || null;
    return null;
  }
  if (obj.success === false) return "You don't have access to this channel.";
  return null;
};

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const userId = user?.id ?? null;

  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [socketEpoch, setSocketEpoch] = useState(0);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const update = () => setHasSession(tokenStore.hasSession());
    update();
    return tokenStore.subscribe(update);
  }, []);

  const socketRef = useRef<Socket | null>(null);
  const joinedRoomsRef = useRef<Set<string>>(new Set());
  const joinRoomErrorsRef = useRef<Set<string>>(new Set());
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastTokenCheckRef = useRef(0);

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

  const emitJoinRoom = useCallback((sock: Socket, roomId: string) => {
    sock.emit("join_room", roomId, (response: unknown) => {
      const errorMsg = getJoinRoomError(response);
      if (!errorMsg) return;
      if (joinRoomErrorsRef.current.has(roomId)) return;
      joinRoomErrorsRef.current.add(roomId);
      toast.error(errorMsg);
    });
  }, []);

  useEffect(() => {
    if (!userId || !hasSession) return;

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
        setConnectionFailed(false);
        setSocketId(newSocket.id ?? null);
        startHeartbeat(newSocket);

        joinedRoomsRef.current.forEach((roomId) => {
          emitJoinRoom(newSocket, roomId);
        });
      };

      const handleDisconnect = (reason: string) => {
        setConnected(false);
        setSocketId(null);
        stopHeartbeat();
        if (reason === "io server disconnect") newSocket.connect();
      };

      const handleReconnectFailed = () => {
        setConnected(false);
        setConnectionFailed(true);
      };

      const handleConnectError = async (err: Error) => {
        console.error("Socket connect_error:", { message: err?.message });
        // Reconnect loops can fire connect_error repeatedly in quick succession.
        // Throttle, and only refresh when a fresh access token is actually
        // missing, so a failing connection can't hammer /api/auth/refresh.
        const now = Date.now();
        if (now - lastTokenCheckRef.current < 30000) return;
        lastTokenCheckRef.current = now;
        const token = await tokenStore.ensureAccessToken();
        if (!token) {
          setConnectionFailed(true);
          newSocket.disconnect();
        }
      };

      newSocket.on("connect", handleConnect);
      newSocket.on("disconnect", handleDisconnect);
      newSocket.on("connect_error", handleConnectError);
      newSocket.on("reconnect_failed", handleReconnectFailed);

      cleanup = () => {
        stopHeartbeat();
        newSocket.off("connect", handleConnect);
        newSocket.off("disconnect", handleDisconnect);
        newSocket.off("connect_error", handleConnectError);
        newSocket.off("reconnect_failed", handleReconnectFailed);
        newSocket.disconnect();
        setConnected(false);
        setSocketId(null);
        joinedRoomsRef.current.clear();
        joinRoomErrorsRef.current.clear();
        if (socketRef.current === newSocket) socketRef.current = null;
        if (getAppSocket() === newSocket) setAppSocket(null);
      };
    };

    void connectSocket();

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [userId, hasSession, socketEpoch, startHeartbeat, stopHeartbeat, emitJoinRoom]);

  const joinChannel = useCallback(
    (channelId: string) => {
      if (!channelId) return;
      joinedRoomsRef.current.add(channelId);
      const sock = socketRef.current;
      if (sock?.connected) {
        emitJoinRoom(sock, channelId);
      }
    },
    [emitJoinRoom]
  );

  const leaveChannel = useCallback((channelId: string) => {
    if (!channelId) return;
    joinedRoomsRef.current.delete(channelId);
    joinRoomErrorsRef.current.delete(channelId);
    socketRef.current?.emit("leave_room", channelId);
  }, []);

  const retryConnect = useCallback(() => {
    setConnectionFailed(false);
    setSocketEpoch((epoch) => epoch + 1);
  }, []);

  const value = useMemo<SocketContextValue>(
    () => ({
      socket,
      connected,
      connectionFailed,
      socketId,
      joinChannel,
      leaveChannel,
      retryConnect,
    }),
    [socket, connected, connectionFailed, socketId, joinChannel, leaveChannel, retryConnect]
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
