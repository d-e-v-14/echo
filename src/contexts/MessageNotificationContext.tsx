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
import { getUnreadMessageCounts } from "@/api";
import { useSocket } from "@/lib/socket/SocketProvider";

interface MessageNotificationContextType {
  unreadMessageCount: number;
  unreadPerThread: Record<string, number>;
  loading: boolean;
  refreshCount: () => Promise<void>;
}

const MessageNotificationContext =
  createContext<MessageNotificationContextType>({
    unreadMessageCount: 0,
    unreadPerThread: {},
    loading: true,
    refreshCount: async () => {},
  });

export function MessageNotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadPerThread, setUnreadPerThread] = useState<
    Record<string, number>
  >({});
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();
  const refreshInFlightRef = useRef(false);

  const refreshCount = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    try {
      const { unreadCounts, totalUnread } = await getUnreadMessageCounts();
      setUnreadMessageCount(totalUnread);
      setUnreadPerThread(unreadCounts);
    } catch (error) {
      console.error("Error fetching message notifications:", error);
      setUnreadMessageCount(0);
      setUnreadPerThread({});
    } finally {
      setLoading(false);
      refreshInFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Only fetch once on mount, no polling
    refreshCount();
  }, [refreshCount]);

  useEffect(() => {
    if (!socket) return;

    const handleIncomingDm = () => {
      void refreshCount();
    };

    socket.on("receive_dm", handleIncomingDm);
    socket.on("new_message", handleIncomingDm);

    return () => {
      socket.off("receive_dm", handleIncomingDm);
      socket.off("new_message", handleIncomingDm);
    };
  }, [socket, refreshCount]);

  const contextValue = useMemo(
    () => ({
      unreadMessageCount,
      unreadPerThread,
      loading,
      refreshCount,
    }),
    [unreadMessageCount, unreadPerThread, loading, refreshCount]
  );

  return (
    <MessageNotificationContext.Provider value={contextValue}>
      {children}
    </MessageNotificationContext.Provider>
  );
}

export function useMessageNotifications() {
  const context = useContext(MessageNotificationContext);
  if (!context) {
    throw new Error(
      "useMessageNotifications must be used within MessageNotificationProvider"
    );
  }
  return context;
}
