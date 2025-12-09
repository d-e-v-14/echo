// src/socket.ts

import { io, Socket } from 'socket.io-client';
import { VoiceVideoManager } from './lib/VoiceVideoManager';

const frontend = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

const API_URL = frontend;

const baseConfig = {
    withCredentials: true,
    transports: ["polling", "websocket"], // Try polling first, then upgrade to websocket
    timeout: 20000, // 20 seconds timeout
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    autoConnect: true,
    forceNew: false, // Reuse existing connection when possible
    upgrade: true, // Allow protocol upgrade from polling to websocket
};

export const createAuthSocket = (userId: string): Socket => {
    console.log("🔌 Connecting to:", API_URL, "for user:", userId);
    
    const socket = io(API_URL, {
        ...baseConfig,
        auth: { userId }
    });

    socket.on("connect", () => {
        console.log("✅ Socket connected:", socket.id);
    });

    socket.on("connect_error", (err) => {
        console.error("❌ Connection error:", err);
    });

    socket.on("disconnect", (reason) => {
        console.warn("⚠️ Disconnected:", reason);
        if (reason === "io server disconnect") {
            socket.connect();
        }
    });

    return socket;
};

// Export the VoiceVideoManager for voice/video functionality
export { VoiceVideoManager };