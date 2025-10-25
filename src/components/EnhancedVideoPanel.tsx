"use client";

import React, { useEffect, useRef, useState } from "react";

// --- START INLINE SVG ICONS ---
// Replaced `react-icons/fa` to remove build dependency error.

const IconMicrophone = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

const IconMicrophoneSlash = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="1" y1="1" x2="23" y2="23"></line>
    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
    <line x1="12" y1="19" x2="12" y2="23"></line>
    <line x1="8" y1="23" x2="16" y2="23"></line>
  </svg>
);

const IconVideo = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polygon points="23 7 16 12 23 17 23 7"></polygon>
    <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
  </svg>
);

const IconVideoSlash = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"></path>
    <line x1="1" y1="1" x2="23" y2="23"></line>
  </svg>
);

const IconDesktop = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
    <line x1="8" y1="21" x2="16" y2="21"></line>
    <line x1="12" y1="17" x2="12" y2="21"></line>
  </svg>
);

const IconExpand = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 3h6v6"></path>
    <path d="M9 21H3v-6"></path>
    <path d="M21 3l-7 7"></path>
    <path d="M3 21l7-7"></path>
  </svg>
);

const IconCompress = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 14h6v6"></path>
    <path d="M20 10h-6V4"></path>
    <path d="M14 10l7-7"></path>
    <path d="M3 21l7-7"></path>
  </svg>
);

const IconVolumeUp = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
  </svg>
);

const IconVolumeOff = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <line x1="23" y1="9" x2="17" y2="15"></line>
    <line x1="17" y1="9" x2="23" y2="15"></line>
  </svg>
);

// --- END INLINE SVG ICONS ---


interface MediaState {
  muted: boolean;
  speaking: boolean;
  video: boolean;
  screenSharing: boolean;
}

interface Participant {
  id: string;
  userId: string;
  username?: string;
  stream: MediaStream | null;
  screenStream?: MediaStream | null;
  mediaState: MediaState;
}

interface EnhancedVideoPanelProps {
  localStream?: MediaStream | null;
  localScreenStream?: MediaStream | null;
  participants?: Participant[];
  localMediaState?: MediaState;
  currentUser?: { username: string };
  collapsed?: boolean;
  onParticipantVolumeChange?: (participantId: string, volume: number) => void;
}

const ParticipantVideo: React.FC<{
  participant: Participant;
  isLocal?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onVolumeChange?: (volume: number) => void;
}> = ({ 
  participant, 
  isLocal = false, 
  isFullscreen = false,
  onToggleFullscreen,
  onVolumeChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenRef = useRef<HTMLVideoElement>(null);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);

  // Determine the state of video and screen sharing
  const hasVideoState = participant.mediaState.video;
  const hasScreenShareStream = participant.screenStream && participant.mediaState.screenSharing;
  const hasVideoStream = participant.stream && participant.stream.getVideoTracks().length > 0;
  // Check if the video track is not just present, but also enabled.
  const hasActiveVideoTrack = hasVideoStream && participant.stream?.getVideoTracks().some(track => track.enabled);

  // Determine what will be rendered
  // We show screen share if it's available
  const shouldShowScreenShare = hasScreenShareStream;
  // We show video if video state is on, a track is active, AND we aren't showing screen share
  const shouldShowVideo = hasVideoState && hasActiveVideoTrack && !shouldShowScreenShare;
  // We show the avatar if neither of the above are true
  const shouldShowAvatar = !shouldShowVideo && !shouldShowScreenShare;
  
  // --- CORRECTED EFFECT ---
  // This effect now correctly depends on `shouldShowVideo`.
  // When `shouldShowVideo` becomes true (i.e., toggling camera on),
  // the <video> element is rendered, `videoRef.current` becomes available,
  // and this effect runs to attach the stream.
  useEffect(() => {
    if (videoRef.current && participant.stream && shouldShowVideo) {
      if (videoRef.current.srcObject !== participant.stream) {
        videoRef.current.srcObject = participant.stream;
      }
      videoRef.current.play().catch(err => {
        // This warning is normal if the user hasn't interacted with the page yet
        console.warn(`Video play failed for ${participant.username}, user may need to interact.`, err);
      });
    }
  }, [participant.stream, shouldShowVideo]); // <--- Dependency on `shouldShowVideo` is the fix

  // --- CORRECTED EFFECT ---
  // Same logic as above, but for the screen share stream.
  useEffect(() => {
    if (screenRef.current && participant.screenStream && shouldShowScreenShare) {
      if (screenRef.current.srcObject !== participant.screenStream) {
        screenRef.current.srcObject = participant.screenStream;
      }
      screenRef.current.play().catch(err => {
        console.warn(`Screen share play failed for ${participant.username}.`, err);
      });
    }
  }, [participant.screenStream, shouldShowScreenShare]); // <--- Dependency on `shouldShowScreenShare`

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
    if (screenRef.current) {
      screenRef.current.volume = newVolume;
    }
    onVolumeChange?.(newVolume);
  };

  const toggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    handleVolumeChange(newMuted ? 0 : volume);
  };

  return (
    <div 
      className={`relative group bg-gray-900 rounded-lg overflow-hidden border-2 ${
        participant.mediaState.speaking && !participant.mediaState.muted 
          ? 'border-green-500' 
          : 'border-gray-700'
      } ${isFullscreen ? 'fixed inset-0 z-50' : 'aspect-video'}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Screen Share (Priority) */}
      {shouldShowScreenShare ? (
        <div className="relative w-full h-full">
          <video
            ref={screenRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-contain bg-black"
          />
          
          {/* Screen Share Indicator */}
          <div className="absolute top-2 left-2 bg-blue-600 bg-opacity-90 rounded px-2 py-1 flex items-center space-x-1">
            <IconDesktop size={12} className="text-white" />
            <span className="text-xs text-white">Screen</span>
          </div>

          {/* Picture-in-Picture Video */}
          {/* Show PiP if video state is on and track is active, even during screen share */}
          {hasVideoState && hasActiveVideoTrack && (
            <div className="absolute bottom-4 right-4 w-32 h-24 bg-gray-800 rounded border border-gray-600 overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                className={`w-full h-full object-cover ${isLocal ? 'transform -scale-x-100' : ''}`}
              />
            </div>
          )}
        </div>
      ) : shouldShowVideo ? (
        /* Regular Video */
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className={`w-full h-full object-cover ${isLocal ? 'transform -scale-x-100' : ''}`}
        />
      ) : (
        /* Avatar/Placeholder (when shouldShowAvatar is true) */
        <div className="w-full h-full flex items-center justify-center bg-gray-800">
          <div className="text-center">
            <div className="w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mb-2 mx-auto">
              <span className="text-2xl font-bold text-white">
                {participant.username?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <p className="text-sm text-gray-300">{participant.username || `User ${participant.userId}`}</p>
            {!participant.mediaState.video && (
              <p className="text-xs text-gray-500 mt-1">Camera off</p>
            )}
          </div>
        </div>
      )}

      {/* Voice State Indicators */}
      <div className="absolute bottom-2 left-2 flex space-x-1">
        {participant.mediaState.muted && (
          <div className="bg-red-600 rounded-full p-1">
            <IconMicrophoneSlash size={12} className="text-white" />
          </div>
        )}
        {participant.mediaState.speaking && !participant.mediaState.muted && (
          <div className="bg-green-600 rounded-full p-1 animate-pulse">
            <IconMicrophone size={12} className="text-white" />
          </div>
        )}
        {/* This logic shows the *intent* of the camera, which is good */}
        {participant.mediaState.video ? (
            <div className="bg-gray-600 rounded-full p-1">
            <IconVideo size={12} className="text-white" />
          </div>
        ) : !shouldShowScreenShare && ( // Only show "camera off" if not screen sharing
          <div className="bg-gray-600 rounded-full p-1">
            <IconVideoSlash size={12} className="text-white" />
          </div>
        )}
      </div>

      {/* Username */}
      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 rounded px-2 py-1">
        <span className="text-xs text-white">
          {participant.username || `User ${participant.userId}`}
          {isLocal && ` (You)`}
        </span>
      </div>

      {/* Hover Controls */}
      {showControls && !isLocal && (
        <div className="absolute inset-0 bg-black bg-opacity-20 flex items-center justify-center space-x-4 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* Volume Control */}
          <div className="bg-black bg-opacity-70 rounded-lg p-2 flex items-center space-x-2">
            <button
              onClick={toggleMute}
              className="text-white hover:text-gray-300 transition-colors"
            >
              {isMuted ? <IconVolumeOff size={14} /> : <IconVolumeUp size={14} />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-16"
            />
          </div>

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              className="bg-black bg-opacity-70 rounded p-2 text-white hover:text-gray-300 transition-colors"
            >
              {isFullscreen ? <IconCompress size={14} /> : <IconExpand size={14} />}
            </button>
          )}
        </div>
      )}

      {/* Fullscreen Exit */}
      {isFullscreen && (
        <button
          onClick={onToggleFullscreen}
          className="absolute top-4 right-4 bg-black bg-opacity-70 rounded p-2 text-white hover:text-gray-300 transition-colors z-10"
        >
          <IconCompress size={16} />
        </button>
      )}
    </div>
  );
};

const EnhancedVideoPanel: React.FC<EnhancedVideoPanelProps> = ({
  localStream,
  localScreenStream,
  participants = [],
  localMediaState = { muted: false, speaking: false, video: false, screenSharing: false },
  currentUser,
  collapsed = false,
  onParticipantVolumeChange
}) => {
  const [fullscreenParticipant, setFullscreenParticipant] = useState<string | null>(null);

  const localParticipant: Participant = {
    id: 'local',
    userId: 'local',
    username: currentUser?.username || 'You',
    stream: localStream || null,
    screenStream: localScreenStream || null,
    mediaState: localMediaState
  };

  const allParticipants = [localParticipant, ...participants];
  const totalParticipants = allParticipants.length;

  const getGridLayout = (count: number, hasFullscreen: boolean) => {
    if (hasFullscreen) return { cols: 'grid-cols-1', rows: 'grid-rows-1' };
    
    if (count === 1) return { cols: 'grid-cols-1', rows: 'grid-rows-1' };
    if (count === 2) return { cols: 'grid-cols-2', rows: 'grid-rows-1' };
    if (count <= 4) return { cols: 'grid-cols-2', rows: 'grid-rows-2' };
    if (count <= 6) return { cols: 'grid-cols-3', rows: 'grid-rows-2' };
    if (count <= 9) return { cols: 'grid-cols-3', rows: 'grid-rows-3' };
    return { cols: 'grid-cols-4', rows: 'grid-rows-3' };
  };

  const toggleFullscreen = (participantId: string) => {
    setFullscreenParticipant(prev => prev === participantId ? null : participantId);
  };

  const handleParticipantVolumeChange = (participantId: string, volume: number) => {
    onParticipantVolumeChange?.(participantId, volume);
  };

  if (collapsed) {
    return <div className="w-full h-0 overflow-hidden" />;
  }

  const layout = getGridLayout(totalParticipants, !!fullscreenParticipant);
  const isFullscreenMode = !!fullscreenParticipant;

  return (
    <div className="w-full h-full bg-black relative overflow-hidden">
      {/* Main Grid */}
      <div className={`grid ${layout.cols} ${layout.rows} gap-2 w-full h-full p-2`}>
        {allParticipants
          .filter(p => !isFullscreenMode || p.id === fullscreenParticipant)
          .map((participant) => (
            <ParticipantVideo
              key={participant.id}
              participant={participant}
              isLocal={participant.id === 'local'}
              isFullscreen={participant.id === fullscreenParticipant}
              onToggleFullscreen={() => toggleFullscreen(participant.id)}
              onVolumeChange={(volume) => handleParticipantVolumeChange(participant.id, volume)}
            />
          ))}
      </div>

      {/* Participant Count */}
      {!isFullscreenMode && totalParticipants > 1 && (
        <div className="absolute top-4 left-4 bg-black bg-opacity-70 rounded px-3 py-1">
          <span className="text-white text-sm">
            {totalParticipants} participant{totalParticipants !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Overflow Indicator */}
      {!isFullscreenMode && totalParticipants > 12 && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-70 rounded px-3 py-1">
          <span className="text-white text-sm">
            +{totalParticipants - 12} more
          </span>
        </div>
      )}
    </div>
  );
};

export default EnhancedVideoPanel;

