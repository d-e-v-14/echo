"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Socket } from "socket.io-client";
import MessageInput from "./MessageInput";
import MessageInputWithMentions from "./MessageInputWithMentions";
import MessageContentWithMentions from "./MessageContentWithMentions";
import MessageAttachment from "./MessageAttachment";
import { fetchMessages, uploadMessage, getUserAvatar } from "@/app/api/API";
import { getUser } from "@/app/api";
import { createAuthSocket } from "@/socket";
import VideoPanel from "./VideoPanel";
import MessageBubble from "./MessageBubble";
import UserProfileModal from "./UserProfileModal";

interface Message {
  id: string | number;
  content: string;
  senderId: string;
  timestamp: string;
  avatarUrl?: string;
  username?: string;
  file?: string;
  mediaUrl?: string;
}

interface ChatWindowProps {
  channelId: string;
  isDM: boolean;
  currentUserId: string;
  localStream?: MediaStream | null;
  remoteStreams?: { id: string; stream: MediaStream }[];
  serverId?: string;
}

export default function ChatWindow({ channelId, currentUserId, localStream = null, remoteStreams = [], serverId }: ChatWindowProps) {
  const [loadingMessages, setLoadingMessages] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const usernamesRef = useRef<Record<string, string>>({});
  const avatarCacheRef = useRef<Record<string, string>>({});
  const [micOn, setMicOn] = useState<boolean>(true);
  const [camOn, setCamOn] = useState<boolean>(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string>("/User_profil.png");
  const isLoadingMoreRef = useRef(false);

  // Load current user's avatar on mount
useEffect(() => {
  const loadCurrentUserAvatar = async () => {
    try {
      const user = await getUser();
      if (user?.avatar_url) {
        setCurrentUserAvatar(user.avatar_url);
        // Important: Also cache it immediately
        avatarCacheRef.current[currentUserId] = user.avatar_url;
        
        // Force update messages with the new avatar
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.senderId === currentUserId 
              ? { ...msg, avatarUrl: user.avatar_url || undefined }
              : msg
          )
        );
      }
    } catch (error) {
      console.error("Failed to load current user's avatar:", error);
    }
  };
  
  loadCurrentUserAvatar();
}, [currentUserId]);
  // Function to get user avatar with caching
  const getAvatarUrl = async (userId: string): Promise<string> => {
  // Check cache first for all users (including current user)
  if (avatarCacheRef.current[userId]) {
    return avatarCacheRef.current[userId];
  }
  
  try {
    const avatarUrl = await getUserAvatar(userId);
    if (avatarUrl) {
      avatarCacheRef.current[userId] = avatarUrl;
      return avatarUrl;
    }
    // If no avatar URL returned, use fallback
    const fallbackAvatar = "/User_profil.png";
    avatarCacheRef.current[userId] = fallbackAvatar;
    return fallbackAvatar;
  } catch (error) {
    console.error(`Failed to get avatar for user ${userId}:`, error);
    const fallbackAvatar = "/User_profil.png";
    avatarCacheRef.current[userId] = fallbackAvatar;
    return fallbackAvatar;
  }
};

  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    username: string;
    avatarUrl: string;
    about?: string;
  } | null>(null);

  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const openProfile = (msg: Message) => {
    if (!msg.senderId) return;
    setSelectedUser({
      id: msg.senderId,
      username: msg.username || "Unknown",
      avatarUrl: msg.avatarUrl || "/User_profil.png",
      about: "No bio yet...",
    });
    setIsProfileOpen(true);
  };

  useEffect(() => {
    const newSocket = createAuthSocket(currentUserId);
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [currentUserId]);

const loadMessages = useCallback(async (loadMore: boolean = false) => {
  try {
    if (loadMore) {
      setLoadingMore(true);
      isLoadingMoreRef.current = true;
    } else {
      setLoadingMessages(true);
      setOffset(0);
      isLoadingMoreRef.current = false;
    }

    const currentOffset = loadMore ? offset : 0;
    const res = await fetchMessages(channelId, currentOffset);

    const formattedMessages: Message[] = await Promise.all(
      res.data.map(async (msg: any) => {
        const senderId = msg.sender_id || msg.senderId;
        const avatarUrl = await getAvatarUrl(senderId);
        
        // Add debugging
        
        return {
          id: msg.id,
          content: msg.content || msg.message,
          senderId,
          timestamp: msg.timestamp || new Date().toISOString(),
          avatarUrl, // This should now have the correct value
          username:
            senderId === currentUserId
              ? "You"
              : msg.username ||
                msg.sender?.username ||
                msg.sender?.fullname ||
                msg.sender_name ||
                "Unknown",
          mediaUrl: msg.media_url || msg.mediaUrl,
        };
      })
    );

    const sorted = formattedMessages.reverse();

    if (loadMore) {
      setMessages(prev => [...sorted, ...prev]);
      setOffset(prev => prev + res.data.length);
    } else {
      setMessages(sorted);
      setOffset(res.data.length);
    }

    setHasMore(res.hasMore ?? false);
  } catch (err) {
    console.error("Failed to fetch messages", err);
  } finally {
    setLoadingMessages(false);
    setLoadingMore(false);
  }
}, [channelId, currentUserId, offset]); // Removed currentUserAvatar from dependencies

  useEffect(() => {
    if (channelId) loadMessages(false);
  }, [channelId]);

  // Handle scroll to load more messages when scrolling to top
  const handleScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container || loadingMore || !hasMore) return;

    // Load more when scrolled near the top (within 100px)
    if (container.scrollTop < 100) {
      const previousScrollHeight = container.scrollHeight;
      loadMessages(true).then(() => {
        // Maintain scroll position after loading older messages
        requestAnimationFrame(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = newScrollHeight - previousScrollHeight;
          }
        });
      });
    }
  }, [loadingMore, hasMore, loadMessages]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(t => (t.enabled = micOn));
  }, [localStream, micOn]);

  useEffect(() => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(t => (t.enabled = camOn));
  }, [localStream, camOn]);

  useEffect(() => {
    // Only scroll to bottom on initial load or new messages, not when loading older messages
    if (!isLoadingMoreRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    // Reset the ref after the effect runs
    isLoadingMoreRef.current = false;
  }, [messages]);

  useEffect(() => {
    if (!socket) return;
    socket.on('connect', () => {
      socket.emit("join_room", channelId);
    });
    
    socket.on('connect_error', (error: Error) => {
      console.error('💔 Socket connection error:', error);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    const pingInterval = setInterval(() => {
      if (!socket.connected) {
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

  useEffect(() => {
    if (!socket) return;
    const receivedMessageIds = new Set<string | number>();

    const handleIncomingMessage = async (saved: any) => {
      
      const messageId = saved?.id || saved?.messageId || Date.now();
      if (saved?.channel_id && saved.channel_id !== channelId) return;

      if (receivedMessageIds.has(messageId)) {
        return;
      }

      const senderId = saved?.sender_id || saved?.senderId || "";
      const resolvedUsername = (senderId === currentUserId) ? 'You' : (
        saved?.username ||
        (saved?.sender && (saved.sender.username || saved.sender.fullname || saved.sender.name)) ||
        saved?.sender_name || saved?.senderName || saved?.name ||
        usernamesRef.current[senderId] || 'Unknown'
      );

      // Get actual avatar URL
      const avatarUrl = await getAvatarUrl(senderId);

      const newMessage: Message = {
        id: messageId,
        content: saved?.content || saved?.message || "",
        senderId,
        timestamp: saved?.timestamp || new Date().toISOString(),
        avatarUrl,
        username: resolvedUsername,
        mediaUrl: saved?.media_url || saved?.mediaUrl
      };

      if (senderId && resolvedUsername && resolvedUsername !== 'Unknown') {
        usernamesRef.current[senderId] = resolvedUsername;
      }

      setMessages(prev => {
        const filtered = prev.filter(msg => 
          !(msg.senderId === currentUserId && 
            msg.content === (saved?.content || saved?.message || "") && 
            Date.now() - new Date(msg.timestamp).getTime() < 30000)
        );

        const updated = [...filtered, newMessage].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );

        return updated;
      });

      receivedMessageIds.add(messageId);

      setTimeout(() => {
        receivedMessageIds.delete(messageId);
      }, 5 * 60 * 1000);
    };

    socket.on("new_message", handleIncomingMessage);
    socket.on('reconnect', async () => {
      await loadMessages();
    });

    return () => {
      socket.off("new_message");
      socket.off("reconnect");
    };
  }, [socket, currentUserId, loadMessages, channelId, currentUserAvatar]);

const handleSend = async (text: string, file: File | null) => {
  if (text.trim() === "" && !file) return;

  setIsSending(true);
  // Get avatar from cache or use fallback
  const userAvatar = avatarCacheRef.current[currentUserId] || currentUserAvatar || "/User_profil.png";

  const optimisticMessage: Message = {
    id: `temp-${Date.now()}`,
    content: file ? `${text} 📎 Uploading ${file.name}...` : text,
    senderId: currentUserId,
    timestamp: new Date().toISOString(),
    avatarUrl: userAvatar,
    username: "You"
  };
  
  setMessages(prev => [...prev, optimisticMessage]);

  try {
    const response = await uploadMessage({
      content: text.trim(),
      channel_id: channelId,
      sender_id: currentUserId,
      file: file || undefined,
    });
    
    console.log('[Upload Message] Response:', response);
  } catch (err: any) {
    console.error('💔 Failed to upload message:', err);
    alert(`Upload failed: ${err.message || 'Unknown error'}`);
    setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
  } finally {
    setIsSending(false);
  }
};

  return (
    <div className="flex flex-col flex-1 h-full w-full overflow-hidden">
      {(localStream || (remoteStreams && remoteStreams.length > 0)) && (
        <div className="p-4 pb-0 h-96 flex-shrink-0">
          <div className="relative w-full h-full">
            <VideoPanel
              localStream={localStream || undefined}
              remotes={remoteStreams}
            />
            <div className="absolute bottom-3 right-3 flex gap-2 z-10">
              <button
                onClick={() => setMicOn((v) => !v)}
                className={`px-3 py-1 rounded-md text-sm ${
                  micOn ? "bg-green-600/80" : "bg-red-600/80"
                }`}
                title={micOn ? "Mute mic" : "Unmute mic"}
              >
                {micOn ? "Mic On" : "Mic Off"}
              </button>
              <button
                onClick={() => setCamOn((v) => !v)}
                className={`px-3 py-1 rounded-md text-sm ${
                  camOn ? "bg-green-600/80" : "bg-red-600/80"
                }`}
                title={camOn ? "Turn camera off" : "Turn camera on"}
              >
                {camOn ? "Cam On" : "Cam Off"}
              </button>
            </div>
          </div>
        </div>
      )}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 pb-6 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
      >
        {loadingMessages ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mx-auto mb-4 w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-gray-400 text-sm">Loading messages…</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500 text-sm">
            No messages yet. Say hi 👋
          </div>
        ) : (
          <>
            {/* Loading indicator at top when fetching older messages */}
            {loadingMore && (
              <div className="flex justify-center py-4">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-gray-400 text-sm">Loading older messages...</span>
                </div>
              </div>
            )}
            {/* Show message when no more messages to load */}
            {!hasMore && messages.length > 0 && (
              <div className="flex justify-center py-4">
                <span className="text-gray-500 text-xs">Beginning of conversation</span>
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                name={msg.username}
                message={msg.content}
                avatarUrl={msg.avatarUrl}
                isSender={msg.senderId === currentUserId}
                timestamp={new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                onProfileClick={() => openProfile(msg)}
                messageRenderer={(content: string) => (
                  <MessageContentWithMentions
                    content={content}
                    currentUserId={currentUserId}
                  />
                )}
              >
                {msg.mediaUrl && <MessageAttachment media_url={msg.mediaUrl} />}
              </MessageBubble>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="flex-shrink-0 px-6 pb-6">
        {serverId ? (
          <MessageInputWithMentions
            sendMessage={handleSend}
            isSending={isSending}
            serverId={serverId}
          />
        ) : (
          <MessageInput sendMessage={handleSend} isSending={isSending} />
        )}
      </div>
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={selectedUser}
        currentUserId={currentUserId}
      />
    </div>
  );
}