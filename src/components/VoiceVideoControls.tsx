
"use client";

import React, { useState, useEffect } from "react";
import {
  FaMicrophone,
  FaMicrophoneSlash,
  FaVideo,
  FaVideoSlash,
  FaDesktop,
  FaStop,
  FaPhoneSlash,
} from "react-icons/fa";
import { VoiceVideoManager } from "@/lib/VoiceVideoManager";

interface MediaState {
  muted: boolean;
  speaking: boolean;
  video: boolean;
  screenSharing: boolean;
  recording: boolean;
  mediaQuality: "low" | "medium" | "high" | "auto";
}

interface DeviceInfo {
  audioInputs: MediaDeviceInfo[];
  videoInputs: MediaDeviceInfo[];
  audioOutputs?: MediaDeviceInfo[];
  activeAudioDevice?: string;
  activeVideoDevice?: string;
  activeAudioOutputDevice?: string;
}

interface NetworkStats {
  latency: number;
  packetLoss: number;
  bandwidth: number;
  connectionType: string;
}

interface VoiceVideoControlsProps {
  manager: VoiceVideoManager | null;
  onHangUp: () => void;
  isConnected: boolean;
  className?: string;
}

const VoiceVideoControls: React.FC<VoiceVideoControlsProps> = ({
  manager,
  onHangUp,
  isConnected,
  className = "",
}) => {
  const [mediaState, setMediaState] = useState<MediaState>({
    muted: false,
    speaking: false,
    video: false,
    screenSharing: false,
    recording: false,
    mediaQuality: "auto",
  });

  const [, setDeviceInfo] = useState<DeviceInfo>({
    audioInputs: [],
    videoInputs: [],
    audioOutputs: [],
    activeAudioDevice: undefined,
    activeVideoDevice: undefined,
    activeAudioOutputDevice: undefined,
  });

  const [, setNetworkStats] = useState<NetworkStats | null>(null);

  useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [hasVideoPerm, setHasVideoPerm] = useState(false);
  const [hasAudioPerm, setHasAudioPerm] = useState(false);

  useEffect(() => {
    if (!manager) return;

    const perms = manager.getAvailablePermissions?.();
    if (perms) {
      setHasAudioPerm(!!perms.audio);
      setHasVideoPerm(!!perms.video);
    }

    const id = setInterval(() => {
      setMediaState(manager.getMediaState());
      setNetworkStats(manager.getNetworkStats());
      setDeviceInfo(manager.getDeviceInfo());

      const currentPerms = manager.getAvailablePermissions?.();
      if (currentPerms) {
        setHasAudioPerm(!!currentPerms.audio);
        setHasVideoPerm(!!currentPerms.video);
      }
    }, 1000);

    return () => clearInterval(id);
  }, [manager]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mediaState.recording) {
      setIsRecording(true);
      setRecordingDuration(0);
      interval = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setIsRecording(false);
      setRecordingDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [mediaState.recording]);

  const handleToggleAudio = () => {
    if (!manager) return;
    try {
      const newMuted = !mediaState.muted;
      manager.toggleAudio(!newMuted);
    } catch (e) {
      console.error("Toggle audio failed:", e);
    }
  };

  const handleToggleVideo = async () => {
    if (!manager) return;
    try {
      if (mediaState.video) {
        await manager.toggleVideo(false);
      } else {
        if (!hasVideoPerm) {
          console.warn("No camera permission");
          return;
        }
        await manager.toggleVideo(true);
      }
    } catch (e) {
      console.error("Toggle video failed:", e);
    }
  };

  const handleToggleScreenShare = async () => {
    if (!manager) return;
    try {
      if (mediaState.screenSharing) {
        manager.stopScreenShare();
      } else {
        await manager.startScreenShare();
      }
      setMediaState(manager.getMediaState());
    } catch (e: any) {
      console.error("Screen share toggle failed:", e);
      if (
        e?.name !== "NotAllowedError" &&
        !e?.message?.includes("Permission denied")
      ) {
        alert("Screen sharing failed. Please try again.");
      }
    }
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`bg-black rounded-lg p-4 ${className}`}>
      {isRecording && (
        <div className="mb-4 bg-red-600 bg-opacity-20 border border-red-500 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-red-400 font-medium">Recording</span>
            </div>
            <span className="text-red-400 font-mono">
              {formatDuration(recordingDuration)}
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center justify-center space-x-4 mb-4">
        <button
          onClick={handleToggleAudio}
          disabled={!isConnected || !hasAudioPerm}
          className={`p-3 rounded-full transition-all duration-200 ${
            mediaState.muted
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-white"
          } ${
            !isConnected || !hasAudioPerm ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title={mediaState.muted ? "Unmute" : "Mute"}
        >
          {mediaState.muted ? (
            <FaMicrophoneSlash size={20} />
          ) : (
            <FaMicrophone size={20} />
          )}
        </button>

        <button
          onClick={handleToggleVideo}
          disabled={!isConnected || !hasVideoPerm}
          className={`p-3 rounded-full transition-all duration-200 ${
            !mediaState.video
              ? "bg-red-600 hover:bg-red-700 text-white"
              : "bg-gray-700 hover:bg-gray-600 text-white"
          } ${
            !isConnected || !hasVideoPerm ? "opacity-50 cursor-not-allowed" : ""
          }`}
          title={mediaState.video ? "Turn off camera" : "Turn on camera"}
        >
          {mediaState.video ? (
            <FaVideo size={20} />
          ) : (
            <FaVideoSlash size={20} />
          )}
        </button>

        <button
          onClick={handleToggleScreenShare}
          disabled={!isConnected}
          className={`p-3 rounded-full transition-all duration-200 ${
            mediaState.screenSharing
              ? "bg-[#FFC341] hover:bg-[#FFD700] text-black"
              : "bg-gray-700 hover:bg-gray-600 text-white"
          } ${!isConnected ? "opacity-50 cursor-not-allowed" : ""}`}
          title={
            mediaState.screenSharing ? "Stop screen share" : "Share screen"
          }
        >
          {mediaState.screenSharing ? (
            <FaStop size={20} />
          ) : (
            <FaDesktop size={20} />
          )}
        </button>

        <button
          onClick={onHangUp}
          className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white transition-all duration-200"
          title="Leave call"
        >
          <FaPhoneSlash size={20} />
        </button>
      </div>
    </div>
  );
};

export default VoiceVideoControls;
