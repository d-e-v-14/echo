"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSocket } from "@/lib/socket/SocketProvider";

export interface VoiceInvite {
  id: string;
  channelId: string;
  channelName: string;
  serverId: string;
  serverName: string;
  inviterUserId: string;
  inviterUsername: string;
  inviterAvatar?: string;
  timestamp: string;
  expiresAt: number;
}

export interface UseVoiceInviteNotificationsOptions {
  userId: string | null;
  onAccept?: (invite: VoiceInvite) => void;
  onDecline?: (invite: VoiceInvite) => void;
  inviteExpirationMs?: number;
}

export interface UseVoiceInviteNotificationsReturn {
  invites: VoiceInvite[];
  acceptInvite: (inviteId: string) => void;
  declineInvite: (inviteId: string) => void;
  clearInvite: (inviteId: string) => void;
  clearAllInvites: () => void;
}

export function useVoiceInviteNotifications({
  userId,
  onAccept,
  onDecline,
  inviteExpirationMs = 30000, // 30 seconds default
}: UseVoiceInviteNotificationsOptions): UseVoiceInviteNotificationsReturn {
  const [invites, setInvites] = useState<VoiceInvite[]>([]);
  const { socket } = useSocket();
  const expirationTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const clearInvite = useCallback((inviteId: string) => {
    setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));

    const timer = expirationTimersRef.current.get(inviteId);
    if (timer) {
      clearTimeout(timer);
      expirationTimersRef.current.delete(inviteId);
    }
  }, []);

  const clearAllInvites = useCallback(() => {
    setInvites([]);

    expirationTimersRef.current.forEach((timer) => clearTimeout(timer));
    expirationTimersRef.current.clear();
  }, []);

  const acceptInvite = useCallback(
    (inviteId: string) => {
      const invite = invites.find((inv) => inv.id === inviteId);
      if (invite) {
        onAccept?.(invite);
        clearInvite(inviteId);
      }
    },
    [invites, onAccept, clearInvite]
  );

  const declineInvite = useCallback(
    (inviteId: string) => {
      const invite = invites.find((inv) => inv.id === inviteId);
      if (invite) {
        onDecline?.(invite);
        clearInvite(inviteId);
      }
    },
    [invites, onDecline, clearInvite]
  );

  useEffect(() => {
    if (!userId || !socket) return;

    const handleVoiceInviteReceived = (data: {
      channelId: string;
      channelName: string;
      serverId: string;
      serverName: string;
      inviterUserId: string;
      inviterUsername: string;
      inviterAvatar?: string;
      timestamp: string;
    }) => {
      console.log("[VoiceInvite] Received invite:", data);

      const inviteId = `${data.channelId}-${data.inviterUserId}-${Date.now()}`;
      const expiresAt = Date.now() + inviteExpirationMs;

      const newInvite: VoiceInvite = {
        id: inviteId,
        channelId: data.channelId,
        channelName: data.channelName,
        serverId: data.serverId,
        serverName: data.serverName,
        inviterUserId: data.inviterUserId,
        inviterUsername: data.inviterUsername,
        inviterAvatar: data.inviterAvatar,
        timestamp: data.timestamp,
        expiresAt,
      };

      setInvites((prev) => {
        const isDuplicate = prev.some(
          (inv) =>
            inv.channelId === data.channelId &&
            inv.inviterUserId === data.inviterUserId
        );
        if (isDuplicate) {
          return prev.map((inv) =>
            inv.channelId === data.channelId &&
            inv.inviterUserId === data.inviterUserId
              ? { ...inv, expiresAt, timestamp: data.timestamp }
              : inv
          );
        }
        return [...prev, newInvite];
      });

      const timer = setTimeout(() => {
        clearInvite(inviteId);
      }, inviteExpirationMs);
      expirationTimersRef.current.set(inviteId, timer);

      try {
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`Voice Invite from ${data.inviterUsername}`, {
            body: `Join ${data.channelName} in ${data.serverName}`,
            icon: data.inviterAvatar || "/default-avatar.png",
            tag: inviteId, // Prevents duplicate notifications
            requireInteraction: true,
          });
        }
      } catch (err) {
        console.warn("[VoiceInvite] Could not show browser notification:", err);
      }
    };

    socket.on("voice_invite_received", handleVoiceInviteReceived);

    return () => {
      socket.off("voice_invite_received", handleVoiceInviteReceived);

      expirationTimersRef.current.forEach((timer) => clearTimeout(timer));
      expirationTimersRef.current.clear();
    };
  }, [socket, userId, inviteExpirationMs, clearInvite]);

  return {
    invites,
    acceptInvite,
    declineInvite,
    clearInvite,
    clearAllInvites,
  };
}

export default useVoiceInviteNotifications;
