"use client";

import React, { ReactNode, useEffect, useState, useCallback } from "react";
import { useAppRouter } from "@/lib/navigation/useAppRouter";
import { useVoiceCall } from "@/contexts/VoiceCallContext";
import {
  useVoiceInviteNotifications,
  VoiceInvite,
} from "@/hooks/useVoiceInviteNotifications";
import VoiceInviteToast from "./VoiceInviteToast";
import { getUser } from "@/api";

interface VoiceInviteProviderProps {
  children: ReactNode;
}

export default function VoiceInviteProvider({
  children,
}: VoiceInviteProviderProps) {
  const [userId, setUserId] = useState<string | null>(null);
  const { openServer } = useAppRouter();
  const { activeCall } = useVoiceCall();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getUser();
        if (user?.id) {
          setUserId(user.id);
        }
      } catch (err) {
        console.error("[VoiceInviteProvider] Failed to get user:", err);
      }
    };
    fetchUser();
  }, []);

  const handleAcceptInvite = useCallback(
    async (invite: VoiceInvite) => {
      console.log("[VoiceInviteProvider] Accepting invite:", invite);

      try {

        openServer(invite.serverId, {
          channelId: invite.channelId,
          query: { channelType: "voice" },
        });

      } catch (err) {
        console.error("[VoiceInviteProvider] Failed to join via invite:", err);
      }
    },
    [openServer]
  );

  const handleDeclineInvite = useCallback((invite: VoiceInvite) => {
    console.log(
      "[VoiceInviteProvider] Declined invite from:",
      invite.inviterUsername
    );
  }, []);

  const { invites, acceptInvite, declineInvite, clearInvite } =
    useVoiceInviteNotifications({
      userId,
      onAccept: handleAcceptInvite,
      onDecline: handleDeclineInvite,
      inviteExpirationMs: 30000, // 30 seconds
    });

  const filteredInvites = invites.filter(
    (invite) => activeCall?.channelId !== invite.channelId
  );

  return (
    <>
      {children}

      <VoiceInviteToast
        invites={filteredInvites}
        onAccept={acceptInvite}
        onDecline={declineInvite}
        onClose={clearInvite}
      />
    </>
  );
}
