"use client";

import React, { ReactNode, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
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

        router.push(
          `/servers?serverId=${invite.serverId}&channelId=${invite.channelId}&channelType=voice`
        );

      } catch (err) {
        console.error("[VoiceInviteProvider] Failed to join via invite:", err);
      }
    },
    [router]
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
