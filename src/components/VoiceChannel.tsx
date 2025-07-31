// In your component file (e.g., src/components/VoiceChannel.tsx)

import { useEffect, useState } from 'react';
import { VoiceService } from '../lib/voiceservice'; // Corrected import path

// IMPORTANT: Replace this with the actual URL of your backend server
const SERVER_URL = 'http://localhost:5000'; 

// Define the props for the component
interface VoiceChannelProps {
    channelId: string;
    onHangUp: () => void;
}

const VoiceChannel = (props: VoiceChannelProps) => {
    const { channelId, onHangUp } = props; // Destructure props here for cleaner use below

    const [voiceService, setVoiceService] = useState<VoiceService | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Initialize the service when the component mounts
        const service = new VoiceService(SERVER_URL);

        service.connect().then(() => {
            setVoiceService(service);
            service.joinChannel(channelId);
            setIsConnected(true);

            // Handle receiving streams from other users
            service.onRemoteStream((stream, socketId) => {
                setRemoteStreams(prev => new Map(prev).set(socketId, stream));
            });
            
            // Handle users leaving
            service.onUserDisconnected((socketId) => {
                setRemoteStreams(prev => {
                    const newStreams = new Map(prev);
                    newStreams.delete(socketId);
                    return newStreams;
                });
            });
        }).catch(error => {
            console.error("Failed to connect to voice service:", error);
            alert("Could not connect to voice chat. Please check your microphone permissions.");
        });

        // Cleanup on component unmount
        return () => {
            service.disconnect();
            setIsConnected(false);
        };
    }, [channelId]); // Re-connect if the channelId prop changes

    return (
        <div className="p-4 bg-gray-800 rounded-lg text-white">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-lg">Voice Channel: {channelId}</h3>
                    {isConnected ? (
                        <p className="text-sm text-green-400">You are connected.</p>
                    ) : (
                        <p className="text-sm text-yellow-400">Connecting...</p>
                    )}
                </div>
                {/* --- NEW: Hang Up Button --- */}
                <button 
                    onClick={onHangUp}
                    className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-white font-semibold transition-colors"
                    title="Leave Voice Channel"
                >
                    Hang Up
                </button>
            </div>
            
            <div className="mt-2">
                <h4 className="font-semibold">Connected Users:</h4>
                {/* Dynamically create audio players for each remote stream */}
                {Array.from(remoteStreams.entries()).map(([socketId, stream]) => (
                    <div key={socketId}>
                        <p className="text-xs text-gray-300">User: {socketId.substring(0, 6)}...</p>
                        <audio
                            autoPlay
                            ref={audioEl => {
                                if (audioEl && stream) {
                                    audioEl.srcObject = stream;
                                }
                            }}
                        />
                    </div>
                ))}
                {remoteStreams.size === 0 && isConnected && <p className="text-xs text-gray-400">You're the first one here!</p>}
            </div>
        </div>
    );
};

export default VoiceChannel;