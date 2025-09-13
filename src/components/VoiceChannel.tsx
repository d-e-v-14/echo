// In your component file (e.g., src/components/VoiceChannel.tsx)

import { useEffect, useRef, useState } from 'react';
import { VideoVoiceService } from '../lib/voiceservice'; // Corrected import path
import { FaMicrophone, FaMicrophoneSlash, FaPhoneSlash, FaVideo, FaVideoSlash } from 'react-icons/fa';

// IMPORTANT: Replace this with the actual URL of your backend server
const SERVER_URL = process.env.NEXT_PUBLIC_API_URL; 

// Define the props for the component
interface VoiceChannelProps {
    channelId: string;
    onHangUp: () => void;
    // When true, do not render any video/control UI; just manage connection and callbacks
    headless?: boolean;
    // Stream lifting callbacks for parent to render video elsewhere (e.g., ChatWindow)
    onLocalStreamChange?: (stream: MediaStream | null) => void;
    onRemoteStreamAdded?: (id: string, stream: MediaStream) => void;
    onRemoteStreamRemoved?: (id: string) => void;
}

const VideoPlayer = ({ stream, isMuted = false, isLocal = false }: { stream: MediaStream, isMuted?: boolean, isLocal?: boolean }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    useEffect(() => {
        if (videoRef.current && stream) videoRef.current.srcObject = stream;
    }, [stream]);
    return (
        <div className="bg-black rounded-lg overflow-hidden relative aspect-video">
            <video ref={videoRef} autoPlay playsInline muted={isMuted} className={`w-full h-full object-cover ${isLocal ? 'transform -scale-x-100' : ''}`} />
        </div>
    );
};

const VoiceChannel = ({ channelId, onHangUp, headless = false, onLocalStreamChange, onRemoteStreamAdded, onRemoteStreamRemoved }: VoiceChannelProps) => {
    const [service, setService] = useState<VideoVoiceService | null>(null);
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isMuted, setIsMuted] = useState(false);
    const [isCameraOn, setIsCameraOn] = useState(true);

    useEffect(() => {
        const videoService = new VideoVoiceService(`${process.env.NEXT_PUBLIC_API_URL}`);
        videoService.connect().then(() => {
            setService(videoService);
            const ls = videoService.getLocalStream();
            setLocalStream(ls);
            onLocalStreamChange?.(ls ?? null);
            videoService.joinChannel(channelId);
            videoService.onRemoteStream((stream, socketId) => {
                setRemoteStreams(prev => {
                    const next = new Map(prev).set(socketId, stream);
                    return next;
                });
                onRemoteStreamAdded?.(socketId, stream);
            });
            videoService.onUserDisconnected((socketId) => {
                setRemoteStreams(prev => {
                    const newStreams = new Map(prev);
                    newStreams.delete(socketId);
                    return newStreams;
                });
                onRemoteStreamRemoved?.(socketId);
            });
        }).catch(error => {
            console.error("Failed to connect to voice service:", error);
            alert("Could not connect. Please check permissions and try again.");
            onHangUp();
        });

        return () => {
            onLocalStreamChange?.(null);
            videoService.disconnect();
        };
    }, [channelId, onHangUp, onLocalStreamChange, onRemoteStreamAdded, onRemoteStreamRemoved]);

    const handleToggleMute = () => {
        const newMutedState = !isMuted;
        service?.toggleAudio(!newMutedState);
        setIsMuted(newMutedState);
    };

    const handleToggleCamera = () => {
        const newCameraState = !isCameraOn;
        service?.toggleVideo(newCameraState);
        setIsCameraOn(newCameraState);
    };

    if (headless) {
        // In headless mode, manage connection only; parent renders UI elsewhere
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