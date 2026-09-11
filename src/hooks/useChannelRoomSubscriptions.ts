"use client";

import { useEffect, useRef } from "react";
import { useSocket } from "@/lib/socket/SocketProvider";

export function useChannelRoomSubscriptions(
  channelIds: ReadonlyArray<string>
): void {
  const { joinChannel } = useSocket();
  const lastKeyRef = useRef<string | null>(null);
  const joinChannelRef = useRef(joinChannel);

  useEffect(() => {
    joinChannelRef.current = joinChannel;
  }, [joinChannel]);

  const key = channelIds.join(",");

  useEffect(() => {
    if (key === lastKeyRef.current) return;
    lastKeyRef.current = key;
    for (const channelId of channelIds) {
      if (channelId) joinChannelRef.current(channelId);
    }
  }, [key, channelIds]);
}