// src/components/VoiceChannel.tsx

"use client";

import { useEffect, useRef, useState } from 'react';
import { MediaStreamManager, createAuthSocket } from '@/socket';
import { FaMicrophone, FaMicrophoneSlash, FaPhoneSlash, FaVideo, FaVideoSlash } from 'react-icons/fa';

interface VoiceChannelProps {
    channelId: string;
    userId: string;
    onHangUp: () => void;
    headless?: boolean;
    onLocalStreamChange?: (stream: MediaStream | null) => void;
    onRemoteStreamAdded?: (id: string, stream: MediaStream) => void;
    onRemoteStreamRemoved?: (id: string) => void;
    onVoiceRoster?: (members: any[]) => void;
}

const VideoPlayer = ({ stream, isMuted = false, isLocal = false }: { stream: MediaStream, isMuted?: boolean, isLocal?: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (videoRef.current && stream) videoRef.current.srcObject = stream;
    }, [stream]);
    return (
        <div className="bg-black rounded-lg overflow-hidden relative">
            <video ref={videoRef} autoPlay playsInline muted={isMuted} className={`w-full h-full object-cover ${isLocal ? 'transform -scale-x-100' : ''}`} />
        </div>
    );
};

const VoiceChannel = ({ channelId, userId, onHangUp, headless = false, onLocalStreamChange, onRemoteStreamAdded, onRemoteStreamRemoved, onVoiceRoster }: VoiceChannelProps) => {
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(true);
    const [voiceMembers, setVoiceMembers] = useState<any[]>([]);

    const socketRef = useRef<ReturnType<typeof createAuthSocket> | null>(null);
    const managerRef = useRef<MediaStreamManager | null>(null);
    const isManagerInitialized = useRef(false);

    // This effect creates the single socket and manager instance once.
    useEffect(() => {
        let isMounted = true;
        
        if (!socketRef.current) {
            const socket = createAuthSocket(userId);
            const manager = new MediaStreamManager(userId, socket);
            socketRef.current = socket;
            managerRef.current = manager;
        }

        const manager = managerRef.current;
        if (!manager) return;

        // Initialize the manager and set up all event listeners once
        const setupManagerAndListeners = async () => {
            if (!isManagerInitialized.current) {
                try {
                    await manager.initialize(true, true);
                    if (isMounted) {
                        setLocalStream(manager.getLocalStream());
                    }
                    isManagerInitialized.current = true;
                } catch (error) {
                    console.error("Failed to initialize media manager:", error);
                    if (isMounted) {
                        alert("Could not connect. Please check permissions and try again.");
                        onHangUp();
                    }
                    return;
                }
            }
            
            manager.onStream((stream: MediaStream, socketId: string) => {
                if (isMounted) {
                    setRemoteStreams(prev => new Map(prev).set(socketId, stream));
                    onRemoteStreamAdded?.(socketId, stream);
                }
            });
            manager.onUserLeft((socketId: string) => {
                if (isMounted) {
                    setRemoteStreams(prev => {
                        const newStreams = new Map(prev);
                        newStreams.delete(socketId);
                        return newStreams;
                    });
                    onRemoteStreamRemoved?.(socketId);
                }
            });
            manager.onVoiceRoster((members: any[]) => {
                if (isMounted) {
                    setVoiceMembers(members);
                    onVoiceRoster?.(members);
                }
            });
            manager.onUserJoined((socketId: string, userId: string) => {
                console.log("User joined voice channel:", { socketId, userId });
            });
            manager.onVoiceState((socketId: string, userId: string, state: any) => {
                console.log("Voice state update:", { socketId, userId, state });
            });
        };
        setupManagerAndListeners();
        
        return () => {
            isMounted = false;
            if (managerRef.current) {
                managerRef.current.disconnect();
            }
            if (socketRef.current?.connected) {
                socketRef.current.disconnect();
            }
        };
    }, []);

    // This effect handles joining/leaving channels based on channelId changes
    useEffect(() => {
        const manager = managerRef.current;
        if (!manager || !isManagerInitialized.current) return;

        manager.leaveVoiceChannel();
        manager.joinVoiceChannel(channelId);

        setLocalStream(manager.getLocalStream());
        onLocalStreamChange?.(manager.getLocalStream());

        return () => {
            manager.leaveVoiceChannel();
        };
    }, [channelId, onLocalStreamChange]);


    const handleToggleMute = () => {
        const newMutedState = !isMuted;
        managerRef.current?.toggleAudio(!newMutedState);
        setIsMuted(newMutedState);
    };

    const handleToggleCamera = () => {
        const newCameraState = !isCameraOn;
        managerRef.current?.toggleVideo(newCameraState);
        setIsCameraOn(newCameraState);
    };

    useEffect(() => {
        if (managerRef.current) {
            managerRef.current.toggleVideo(isCameraOn);
        }
    }, [isCameraOn]);

    if (headless) {
        return null;
    }

    return (
        <div className="p-2 bg-gray-900 rounded-lg flex flex-col h-full">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2 overflow-y-auto">
                {localStream && <VideoPlayer stream={localStream} isMuted={true} isLocal={true} />}
                {Array.from(remoteStreams.entries()).map(([id, stream]) => (
                    <VideoPlayer key={id} stream={stream} />
                ))}
            </div>
            <div className="flex items-center justify-center space-x-4 mt-2 p-2 bg-gray-800 rounded-md">
                <button onClick={handleToggleMute} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition">
                    {isMuted ? <FaMicrophoneSlash size={20} className="text-yellow-400" /> : <FaMicrophone size={20} />}
                </button>
                <button onClick={handleToggleCamera} className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition">
                    {isCameraOn ? <FaVideo size={20} /> : <FaVideoSlash size={20} className="text-yellow-400" />}
                </button>
                <button onClick={onHangUp} className="p-3 rounded-full bg-red-600 hover:bg-red-500 transition">
                    <FaPhoneSlash size={20} />
                </button>
            </div>
        </div>
    );
};

export default VoiceChannel;