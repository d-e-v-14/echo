// src/components/FloatingVoiceWindow.tsx
// Draggable floating window for active voice calls when not on servers page
// or when on servers page but viewing a different server

"use client";

import React, { useRef, useEffect, useState } from "react";
import Draggable, { DraggableData, DraggableEvent } from "react-draggable";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useVoiceCall } from "@/contexts/VoiceCallContext";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaPhoneSlash,
  FaExpand,
  FaUsers,
} from "react-icons/fa";

// Storage key for position persistence
const POSITION_STORAGE_KEY = "floating-voice-window-position";

// Default position (bottom-right corner with offset)
const DEFAULT_POSITION = { x: -20, y: -20 };

interface Position {
  x: number;
  y: number;
}

interface FloatingVoiceWindowProps {
  // Optional: current server ID being viewed (for servers page)
  currentServerId?: string | null;
}

const FloatingVoiceWindow: React.FC<FloatingVoiceWindowProps> = ({ currentServerId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const nodeRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    activeCall,
    isConnected,
    participants,
    localMediaState,
    localVideoTileId,
    bindVideoElement,
    unbindVideoElement,
    toggleAudio,
    toggleVideo,
    leaveCall,
  } = useVoiceCall();

  // Position state
  const [position, setPosition] = useState<Position>(DEFAULT_POSITION);
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  
  // Track current viewed server from localStorage (set by servers page)
  const [viewedServerId, setViewedServerId] = useState<string | null>(null);
  
  // Track current view mode from localStorage (set by servers page)
  const [currentViewMode, setCurrentViewMode] = useState<string | null>(null);

  // Load position from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(POSITION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.x === "number" && typeof parsed.y === "number") {
          setPosition(parsed);
        }
      }
    } catch (e) {
      console.warn("[FloatingVoiceWindow] Failed to load position:", e);
    }
    setIsPositionLoaded(true);
  }, []);

  // Listen for changes to viewed server ID and view mode (updated by servers page)
  useEffect(() => {
    const updateState = () => {
      const serverId = localStorage.getItem("currentViewedServerId");
      const viewMode = localStorage.getItem("currentViewMode");
      setViewedServerId(serverId);
      setCurrentViewMode(viewMode);
    };
    
    // Initial load
    updateState();
    
    // Listen for storage changes (in case it changes from another tab or component)
    window.addEventListener("storage", updateState);
    
    // Also poll periodically since storage event doesn't fire for same-tab changes
    const interval = setInterval(updateState, 500);
    
    return () => {
      window.removeEventListener("storage", updateState);
      clearInterval(interval);
    };
  }, []);

  // Save position to localStorage on drag stop
  const handleDragStop = (_e: DraggableEvent, data: DraggableData) => {
    const newPosition = { x: data.x, y: data.y };
    setPosition(newPosition);
    try {
      localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(newPosition));
    } catch (e) {
      console.warn("[FloatingVoiceWindow] Failed to save position:", e);
    }
  };

  // Bind local video tile to video element when available
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl || !localVideoTileId || !localMediaState.video) {
      return;
    }

    console.log("[FloatingVoiceWindow] Binding local video tile:", localVideoTileId);
    bindVideoElement(localVideoTileId, videoEl);

    // Try to play
    videoEl.play().catch((err) => {
      console.warn("[FloatingVoiceWindow] Video autoplay blocked:", err.message);
    });

    return () => {
      console.log("[FloatingVoiceWindow] Unbinding local video tile:", localVideoTileId);
      unbindVideoElement(localVideoTileId);
    };
  }, [localVideoTileId, localMediaState.video, bindVideoElement, unbindVideoElement]);

  // Handle expand - navigate to servers page with voice view
  const handleExpand = () => {
    if (activeCall) {
      // Navigate to servers page with the server selected and voice view mode
      router.push(`/servers?serverId=${activeCall.serverId}&view=voice`);
    }
  };

  // Handle mute toggle
  const handleToggleMute = () => {
    toggleAudio(localMediaState.muted); // If muted, unmute (enable audio)
  };

  // Handle video toggle
  const handleToggleVideo = async () => {
    await toggleVideo(!localMediaState.video);
  };

  // Handle hang up
  const handleHangUp = () => {
    leaveCall();
  };

  // Don't render if no active call
  if (!activeCall) {
    return null;
  }

  // Check if we're viewing voice UI on the servers page
  // We show floating window when:
  // 1. Not on servers page at all, OR
  // 2. On servers page but viewing a different server, OR
  // 3. On servers page, same server, but in chat view mode (not voice view)
  const isOnServersPage = pathname === "/servers";
  const effectiveServerId = currentServerId || viewedServerId;
  const isViewingSameServer = effectiveServerId === activeCall.serverId;
  
  // Use state for viewMode (updated by polling localStorage)
  const isInVoiceView = currentViewMode === 'voice';
  
  // Only hide floating window if on servers page AND viewing same server AND in voice view mode
  if (isOnServersPage && isViewingSameServer && isInVoiceView) {
    return null;
  }

  // Don't render until position is loaded (prevents flash)
  if (!isPositionLoaded) {
    return null;
  }

  return (
    <Draggable
      nodeRef={nodeRef}
      defaultPosition={position}
      onStop={handleDragStop}
      bounds="parent"
      handle=".drag-handle"
    >
      <div
        ref={nodeRef}
        className="fixed bottom-6 right-6 z-50 select-none"
        style={{ touchAction: "none" }}
      >
        <div className="bg-gray-900 rounded-xl shadow-2xl border border-gray-700 overflow-hidden w-64">
          {/* Header - Drag Handle */}
          <div className="drag-handle cursor-move bg-gray-800 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500" : "bg-yellow-500 animate-pulse"
                }`}
              />
              <div className="truncate">
                <p className="text-white text-sm font-medium truncate">
                  {activeCall.channelName}
                </p>
                <p className="text-gray-400 text-xs truncate">
                  {activeCall.serverName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-gray-400">
              <FaUsers size={12} />
              <span className="text-xs">{participants.length}</span>
            </div>
          </div>

          {/* Video Preview / Avatar */}
          <div className="relative bg-black aspect-video">
            {localMediaState.video ? (
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-1">
                    <span className="text-lg font-bold text-white">
                      {activeCall.channelName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs">Camera off</p>
                </div>
              </div>
            )}

            {/* Mute indicator overlay */}
            {localMediaState.muted && (
              <div className="absolute top-2 left-2 bg-red-600 rounded-full p-1">
                <FaMicrophoneSlash size={10} className="text-white" />
              </div>
            )}

            {/* Connection status overlay */}
            {!isConnected && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                  <p className="text-white text-xs">Connecting...</p>
                </div>
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="bg-gray-800 px-3 py-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* Mute Button */}
              <button
                onClick={handleToggleMute}
                className={`p-2 rounded-full transition-colors ${
                  localMediaState.muted
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-white"
                }`}
                title={localMediaState.muted ? "Unmute" : "Mute"}
              >
                {localMediaState.muted ? (
                  <FaMicrophoneSlash size={14} />
                ) : (
                  <FaMicrophone size={14} />
                )}
              </button>

              {/* Video Button */}
              <button
                onClick={handleToggleVideo}
                className={`p-2 rounded-full transition-colors ${
                  !localMediaState.video
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-gray-700 hover:bg-gray-600 text-white"
                }`}
                title={localMediaState.video ? "Turn off camera" : "Turn on camera"}
              >
                {localMediaState.video ? (
                  <FaVideo size={14} />
                ) : (
                  <FaVideoSlash size={14} />
                )}
              </button>

              {/* Hang Up Button */}
              <button
                onClick={handleHangUp}
                className="p-2 rounded-full bg-red-600 hover:bg-red-500 text-white transition-colors"
                title="Leave call"
              >
                <FaPhoneSlash size={14} />
              </button>
            </div>

            {/* Expand Button */}
            <button
              onClick={handleExpand}
              className="p-2 rounded-full bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              title="Expand to full view"
            >
              <FaExpand size={14} />
            </button>
          </div>
        </div>
      </div>
    </Draggable>
  );
};

export default FloatingVoiceWindow;
