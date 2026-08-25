"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { fetchFriendRequests } from "@/api";
import { useSocket } from "@/lib/socket/SocketProvider";

interface FriendNotificationContextType {
  friendRequestCount: number;
  loading: boolean;
  refreshCount: () => Promise<void>;
}

const FriendNotificationContext = createContext<FriendNotificationContextType>({
  friendRequestCount: 0,
  loading: true,
  refreshCount: async () => {},
});

export function FriendNotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [friendRequestCount, setFriendRequestCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const refreshInFlightRef = useRef(false);

  const refreshCount = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const requests = await fetchFriendRequests();
      setFriendRequestCount(requests.length);
    } catch (error: any) {
      console.error("Error fetching friend requests:", error);
      setFriendRequestCount(0);
    } finally {
      setLoading(false);
      refreshInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    if (!socket) return;

    const handleFriendEvent = () => {
      void refreshCount();
    };

    socket.on("friend_request", handleFriendEvent);
    socket.on("friend_request_accepted", handleFriendEvent);

    return () => {
      socket.off("friend_request", handleFriendEvent);
      socket.off("friend_request_accepted", handleFriendEvent);
    };
  }, [socket, refreshCount]);

  const contextValue = useMemo(
    () => ({ friendRequestCount, loading, refreshCount }),
    [friendRequestCount, loading, refreshCount]
  );

  return (
    <FriendNotificationContext.Provider value={contextValue}>
      {children}
    </FriendNotificationContext.Provider>
  );
}

export function useFriendNotifications() {
  return useContext(FriendNotificationContext);
}
