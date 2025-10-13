// src/socket.ts

import { io, Socket } from 'socket.io-client';
import { VoiceVideoManager } from './lib/VoiceVideoManager';

const API_URL = 'http://localhost:5000';

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
    console.log("🔌 createAuthSocket: Attempting to connect to:", API_URL, "for user:", userId);
    console.log("🔍 createAuthSocket: User ID being sent:", userId, "type:", typeof userId);
    
    const socket = io(API_URL, {
        ...baseConfig,
        auth: {
            userId: userId
        }
    });

    socket.on("connect", () => {
        console.log("✅ createAuthSocket: Connected to main socket with id:", socket.id);
        console.log("🔌 createAuthSocket: Connection transport:", socket.io.engine.transport.name);
        console.log("🔌 createAuthSocket: Socket connected:", socket.connected);
        console.log("🔍 createAuthSocket: Auth data sent:", { userId });
    });

    socket.on("connecting", () => {
        console.log("🔄 Socket is connecting...");
    });

    socket.io.on("open", () => {
        console.log("🔓 Socket.io engine opened");
    });

    socket.io.on("close", (reason) => {
        console.log("🔒 Socket.io engine closed:", reason);
    });

    socket.io.on("error", (error) => {
        console.error("🔥 Socket.io engine error:", error);
    });

    socket.on("connect_error", (err) => {
        console.error("❌ Main socket connection error:", err);
        console.log("🔄 Retrying connection...");
    });

    socket.on("disconnect", (reason) => {
        console.warn("⚠️ Socket disconnected:", reason);
        if (reason === "io server disconnect") {
            // The server forcefully disconnected the socket
            socket.connect();
        }
    });

    socket.on("reconnect", (attemptNumber) => {
        console.log("🔄 Reconnected after", attemptNumber, "attempts");
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
        console.log("🔄 Reconnection attempt", attemptNumber);
    });

    socket.on("reconnect_error", (err) => {
        console.error("❌ Reconnection failed:", err);
    });

    socket.on("reconnect_failed", () => {
        console.error("💀 Failed to reconnect after maximum attempts");
    });

    return socket;
};

// Export the VoiceVideoManager for voice/video functionality
export { VoiceVideoManager };