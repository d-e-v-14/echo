
"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { callStateManager, ActiveCallState } from "@/lib/CallStateManager";
import {
  VoiceVideoManager,
  VoiceRosterMember,
  VideoTileInfo,
  MediaState,
} from "@/lib/VoiceVideoManager";

interface UseVoiceCallOptions {
  userId: string;
  username: string;
  channelId: string;
  serverId: string;
  channelName: string;
}

interface UseVoiceCallReturn {
  manager: VoiceVideoManager | null;

  isConnected: boolean;
  isConnecting: boolean;

  isInCall: boolean;
  isMinimized: boolean;
  callState: ActiveCallState | null;

  roster: VoiceRosterMember[];
  videoTiles: VideoTileInfo[];

  mediaState: MediaState | null;

  joinCall: (callType?: "voice" | "video") => Promise<void>;
  leaveCall: () => void;
  minimizeCall: () => void;
  maximizeCall: () => void;

  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;

  error: string | null;
}

export function useVoiceCall({
  userId,
  username,
  channelId,
  serverId,
  channelName,
}: UseVoiceCallOptions): UseVoiceCallReturn {
  const [manager, setManager] = useState<VoiceVideoManager | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [roster, setRoster] = useState<VoiceRosterMember[]>([]);
  const [videoTiles, setVideoTiles] = useState<VideoTileInfo[]>([]);
  const [callState, setCallState] = useState<ActiveCallState | null>(null);
  const [mediaState, setMediaState] = useState<MediaState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const listenersSetup = useRef(false);

  useEffect(() => {
    return callStateManager.subscribe(setCallState);
  }, []);

  const setupListeners = useCallback((voiceManager: VoiceVideoManager) => {
    if (listenersSetup.current) return;

    voiceManager.onVoiceRoster((members) => {
      setRoster(members);
    });

    voiceManager.onVideoTileUpdated((tile) => {
      setVideoTiles((prev) => {
        const existing = prev.findIndex((t) => t.tileId === tile.tileId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = tile;
          return updated;
        }
        return [...prev, tile];
      });
    });

    voiceManager.onVideoTileRemoved((tileId) => {
      setVideoTiles((prev) => prev.filter((t) => t.tileId !== tileId));
    });

    voiceManager.onConnectionStateChange((connected) => {
      setIsConnected(connected);
      if (!connected) {
        setIsConnecting(false);
      }
    });

    voiceManager.onError((err) => {
      setError(err.message);
      setIsConnecting(false);
    });

    listenersSetup.current = true;
  }, []);

  const joinCall = useCallback(
    async (callType: "voice" | "video" = "voice") => {
      setError(null);

      if (callStateManager.isInChannel(channelId)) {
        callStateManager.maximizeCall();
        const existingManager = callStateManager.getManager();
        if (existingManager) {
          setManager(existingManager);
          setRoster(existingManager.getRoster());
          setMediaState(existingManager.getMediaState());
          setIsConnected(existingManager.isConnected());
        }
        return;
      }

      if (callStateManager.hasActiveCall()) {
        callStateManager.endCall();
        setRoster([]);
        setVideoTiles([]);
        listenersSetup.current = false;
      }

      setIsConnecting(true);

      try {
        const voiceManager = callStateManager.getOrCreateManager(
          userId,
          username
        );

        setupListeners(voiceManager);

        await voiceManager.initialize(callType === "video", true);
        await voiceManager.joinVoiceChannel(channelId);

        callStateManager.startCall(channelId, serverId, channelName, callType);

        setManager(voiceManager);
        setMediaState(voiceManager.getMediaState());
        setIsConnected(true);
        setIsConnecting(false);

        console.log("[useVoiceCall] Successfully joined call");
      } catch (err) {
        console.error("[useVoiceCall] Failed to join call:", err);
        setError(err instanceof Error ? err.message : "Failed to join call");
        setIsConnecting(false);
        callStateManager.endCall();
      }
    },
    [userId, username, channelId, serverId, channelName, setupListeners]
  );

  const leaveCall = useCallback(() => {
    callStateManager.endCall();
    setManager(null);
    setIsConnected(false);
    setRoster([]);
    setVideoTiles([]);
    setMediaState(null);
    setError(null);
    listenersSetup.current = false;
  }, []);

  const minimizeCall = useCallback(() => {
    callStateManager.minimizeCall();
  }, []);

  const maximizeCall = useCallback(() => {
    callStateManager.maximizeCall();
  }, []);

  const toggleMute = useCallback(() => {
    const currentManager = manager || callStateManager.getManager();
    if (currentManager) {
      const currentState = currentManager.getMediaState();
      currentManager.toggleAudio(currentState.muted);
      setMediaState(currentManager.getMediaState());
    }
  }, [manager]);

  const toggleVideo = useCallback(async () => {
    const currentManager = manager || callStateManager.getManager();
    if (currentManager) {
      const currentState = currentManager.getMediaState();
      await currentManager.toggleVideo(!currentState.video);
      setMediaState(currentManager.getMediaState());

      if (!currentState.video) {
        callStateManager.updateCallType("video");
      }
    }
  }, [manager]);

  const toggleScreenShare = useCallback(async () => {
    const currentManager = manager || callStateManager.getManager();
    if (currentManager) {
      const currentState = currentManager.getMediaState();
      if (currentState.screenSharing) {
        await currentManager.stopScreenShare();
      } else {
        await currentManager.startScreenShare();
      }
      setMediaState(currentManager.getMediaState());
    }
  }, [manager]);

  useEffect(() => {
    if (callStateManager.isInChannel(channelId)) {
      const existingManager = callStateManager.getManager();
      if (existingManager) {
        setManager(existingManager);
        setIsConnected(existingManager.isConnected());
        setRoster(existingManager.getRoster());
        setMediaState(existingManager.getMediaState());

        setupListeners(existingManager);

        callStateManager.maximizeCall();
      }
    }
  }, [channelId, setupListeners]);

  useEffect(() => {
    if (!manager || !isConnected) return;

    const interval = setInterval(() => {
      setMediaState(manager.getMediaState());
    }, 1000);

    return () => clearInterval(interval);
  }, [manager, isConnected]);

  return {
    manager,
    isConnected,
    isConnecting,
    isInCall: callStateManager.hasActiveCall(),
    isMinimized: callState?.isMinimized ?? false,
    callState,
    roster,
    videoTiles,
    mediaState,
    joinCall,
    leaveCall,
    minimizeCall,
    maximizeCall,
    toggleMute,
    toggleVideo,
    toggleScreenShare,
    error,
  };
}

export default useVoiceCall;
