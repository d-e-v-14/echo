"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import MessageInput from "./MessageInput";
import { fetchMessages } from "@/app/api/API";
import { createAuthSocket } from "@/socket";
import VideoPanel from "./VideoPanel";

interface Message {
  id: string | number;
  content: string;
  senderId: string;
  timestamp: string;
  avatarUrl?: string;
  username?: string;
}

interface ChatWindowProps {
  channelId: string;
  isDM: boolean;
  currentUserId: string;
  // Optional media streams when connected to a voice/video room
  localStream?: MediaStream | null;
  remoteStreams?: { id: string; stream: MediaStream }[];
}

export default function ChatWindow({ channelId, isDM, currentUserId, localStream = null, remoteStreams = [] }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  // Cache usernames by senderId to avoid 'Unknown' on live messages
  const usernamesRef = useRef<Record<string, string>>({});
  // Local mic/camera state
  const [micOn, setMicOn] = useState<boolean>(true);
  const [camOn, setCamOn] = useState<boolean>(true);

  // Initialize socket when component mounts
  useEffect(() => {
    const newSocket = createAuthSocket(currentUserId);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [currentUserId]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetchMessages(channelId);
      // Transform the messages to match our Message interface
      const formattedMessages: Message[] = res.data.map((msg: any) => ({
        id: msg.id,
        content: msg.content || msg.message,
        senderId: msg.sender_id || msg.senderId,
        timestamp: msg.timestamp || new Date().toISOString(),
        avatarUrl: msg.sender_id === currentUserId ? "/User_profil.png" : "https://avatars.dicebear.com/api/bottts/user.svg",
        username:
          ((msg.sender_id || msg.senderId) === currentUserId ? "You" :
            (msg.username ||
             (msg.sender && (msg.sender.username || msg.sender.fullname || msg.sender.name)) ||
             msg.sender_name || msg.senderName || msg.username ||
             "Unknown"))
      }))
      // Ensure oldest → newest so UI shows latest at the bottom
      .sort((a: Message, b: Message) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      // Build/update username cache from fetched messages
      const map: Record<string, string> = { ...usernamesRef.current };
      for (const m of formattedMessages) {
        if (m.senderId && m.username && m.username !== 'Unknown') {
          map[m.senderId] = m.username;
        } else if (m.senderId === currentUserId) {
          map[m.senderId] = 'You';
        }
      }
      usernamesRef.current = map;
      setMessages(formattedMessages);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  }, [channelId, currentUserId]);

  // Load initial messages
  useEffect(() => {
    if (channelId) loadMessages();
  }, [channelId, loadMessages]);

  // Apply mic/cam toggles to local stream tracks
  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(t => (t.enabled = micOn));
  }, [localStream, micOn]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(t => (t.enabled = camOn));
  }, [localStream, camOn]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Socket connection monitoring and health checks
  useEffect(() => {
    if (!socket) return;

    console.log('Socket initialized:', socket.connected);

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      // Join the room after connection
      socket.emit("join_room", channelId);
    });

    socket.on('connect_error', (error: Error) => {
      console.error('❌ Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    // Health monitoring
    const pingInterval = setInterval(() => {
      if (!socket.connected) {
        console.log('🔄 Socket disconnected, attempting to reconnect...');
        socket.connect();
      }
    }, 5000);

    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      clearInterval(pingInterval);
    };
  }, [socket, channelId]);

  // Message handling with duplicate detection and ordering
  useEffect(() => {
    if (!socket) return;

    // Keep track of received message IDs to prevent duplicates
    const receivedMessageIds = new Set<string | number>();

    const handleIncomingMessage = (saved: any) => {
      // Backend broadcasts saved message as 'new_message'
      // Expected fields: { id, content, sender_id, channel_id, timestamp }
      const messageId = saved?.id || saved?.messageId || Date.now();

      // Ignore if message belongs to a different channel
      if (saved?.channel_id && saved.channel_id !== channelId) return;

      // Prevent duplicate messages
      if (receivedMessageIds.has(messageId)) {
        console.log('🔄 Duplicate message received, ignoring:', messageId);
        return;
      }

      const senderId = saved?.sender_id || saved?.senderId || "";
      // Resolve username: prefer payload, else cache, else fallback
      const resolvedUsername = (senderId === currentUserId) ? 'You' : (
        saved?.username ||
        (saved?.sender && (saved.sender.username || saved.sender.fullname || saved.sender.name)) ||
        saved?.sender_name || saved?.senderName || saved?.name ||
        usernamesRef.current[senderId] || 'Unknown'
      );

      const newMessage: Message = {
        id: messageId,
        content: saved?.content || saved?.message || "",
        senderId,
        timestamp: saved?.timestamp || new Date().toISOString(),
        avatarUrl: (saved?.sender_id || saved?.senderId) === currentUserId 
          ? "/User_profil.png" 
          : "https://avatars.dicebear.com/api/bottts/user.svg",
        username: resolvedUsername
      };

      // Update cache if we've learned a username
      if (senderId && resolvedUsername && resolvedUsername !== 'Unknown') {
        usernamesRef.current[senderId] = resolvedUsername;
      }

      setMessages(prev => {
        const filtered = prev.filter(msg => 
          !(msg.senderId === currentUserId && 
            msg.content === (saved?.content || saved?.message || "") && 
            Date.now() - new Date(msg.timestamp).getTime() < 30000)
        );

        // Add new message and sort by timestamp
        const updated = [...filtered, newMessage].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        return updated;
      });

      // Add to received messages set
      receivedMessageIds.add(messageId);

      // Clean up old message IDs after 5 minutes
      setTimeout(() => {
        receivedMessageIds.delete(messageId);
      }, 5 * 60 * 1000);
    };

    socket.on("new_message", handleIncomingMessage);
    // socket.on('message_error', (errMsg: string) => {
    //   console.error('❌ message_error:', errMsg);
    // });

    // Handle missed messages during disconnection
    socket.on('reconnect', async () => {
      console.log('🔄 Reconnected, fetching missed messages...');
      await loadMessages();
    });

    return () => {
      socket.off("new_message");
      socket.off('message_error');
      socket.off("reconnect");
    };
  }, [socket, currentUserId, loadMessages, channelId]);

  const handleSend = async (text: string) => {
    if (!text.trim() || !socket) return;

    const messageData = {
      content: text,
      channelId: channelId,
      senderId: currentUserId,
    };

    // Optimistically add message to UI
    const optimisticMessage: Message = {
      id: Date.now(),
      content: text,
      senderId: currentUserId,
      timestamp: new Date().toISOString(),
      avatarUrl: "/User_profil.png",
      username: "You"
    };
    setMessages(prev => [...prev, optimisticMessage]);

    // Emit once; backend will persist and echo via 'new_message'.
    try {
      console.log(messageData)
      socket.emit('send_message', messageData);
    } catch (err) {
      console.error('💔 Failed to emit message:', err);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Video/Voice panel on top when streams are present */}
      {(localStream || (remoteStreams && remoteStreams.length > 0)) && (
        <div className="p-4 pb-0">
          <div className="relative">
            <VideoPanel localStream={localStream || undefined} remotes={remoteStreams} />
            <div className="absolute bottom-3 right-3 flex gap-2">
              <button
                onClick={() => setMicOn(v => !v)}
                className={`px-3 py-1 rounded-md text-sm ${micOn ? 'bg-green-600/80' : 'bg-red-600/80'}`}
                title={micOn ? 'Mute mic' : 'Unmute mic'}
              >
                {micOn ? 'Mic On' : 'Mic Off'}
              </button>
              <button
                onClick={() => setCamOn(v => !v)}
                className={`px-3 py-1 rounded-md text-sm ${camOn ? 'bg-green-600/80' : 'bg-red-600/80'}`}
                title={camOn ? 'Turn camera off' : 'Turn camera on'}
              >
                {camOn ? 'Cam On' : 'Cam Off'}
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`bg-white/10 backdrop-blur-md p-2 rounded-lg text-white max-w-lg
              ${msg.senderId === currentUserId ? 'bg-blue-600/50' : 'bg-gray-600/50'}`}
            >
              {/* Sender label */}
              <div className="text-[11px] leading-none text-gray-300 mb-1">
                {msg.senderId === currentUserId ? 'You' : (msg.username || 'Unknown')}
              </div>
              <div className="text-sm">{msg.content}</div>
              <div className="text-xs text-gray-400 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput sendMessage={handleSend} />
    </div>
  );
}