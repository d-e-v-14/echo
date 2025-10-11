"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Paperclip, X } from 'lucide-react'; // Using lucide-react for icons
import { getUserDMs, uploaddm } from '@/app/api/API'; 
import { Socket } from "socket.io-client";
import { createAuthSocket } from '@/socket';
import MessageBubble from './MessageBubble';
import MessageAttachment from './MessageAttachment';


interface User {
    id: string;
    fullname: string; // Frontend uses 'fullname'
    avatar_url?: string;
}



interface DirectMessage {
    id: string;
    content: string;
    sender_id: string; 
    receiver_id: string; 
    timestamp: string;
    thread_id?: string;
    media_url?: string | null;
}

// 1. ChatList Component (Updated to show errors)

interface ChatListProps {
    conversations: { user: User, lastMessage: string }[];
    activeDmId: string | null;
    onSelectDm: (userId: string) => void;
    isLoading: boolean;
    error: string | null;
}

const ChatList: React.FC<ChatListProps> = ({ conversations, activeDmId, onSelectDm, isLoading, error }) => {
    return (
        <div className="p-4 h-full overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 sticky top-0 bg-black py-2">Messages</h2>
            {isLoading ? (
                <p className="text-gray-400">Loading conversations...</p>
            ) : error ? (
                <p className="text-red-400">{error}</p>
            ) : (
                <ul>
                    {conversations.map(({ user, lastMessage }) => (
                        <li
                            key={user.id}
                            className={`p-3 rounded-lg cursor-pointer mb-2 ${activeDmId === user.id ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                            onClick={() => onSelectDm(user.id)}
                        >
                            <p className="font-semibold">{user.fullname}</p>
                            <p className="text-sm text-gray-400 truncate">{lastMessage}</p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// 2. ChatWindow Component (No changes needed)

interface ChatWindowProps {
    activeUser: User | null;
    messages: DirectMessage[];
    currentUser: User | null;
    onSendMessage: (message: string, file: File | null) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ activeUser, messages, currentUser, onSendMessage }) => {
    const [newMessage, setNewMessage] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSend = async (newMessage: string) => {
        if (!newMessage.trim() && !file) return;
        onSendMessage(newMessage, file);
        setNewMessage('');
        setFile(null);
        console.log("Message sent:", { newMessage, file })
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
        }
    };

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    if (!activeUser) {
        return (
            <div className="flex flex-1 items-center justify-center text-white text-lg">
                Select a DM to view the conversation.
            </div>
        );
    }

    return (
        <>
            <div className="p-4 border-b border-gray-700">
                <h3 className="text-lg font-semibold">Chat with {activeUser.fullname}</h3>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        isSender={msg.sender_id === currentUser?.id}
                        message={msg.content}
                        timestamp={new Date(msg.timestamp).toLocaleTimeString()}
                        name={msg.sender_id === currentUser?.id ? 'You' : activeUser.fullname}
                    >
                        {msg.media_url && (
                            <MessageAttachment media_url={msg.media_url} />
                        )}
                    </MessageBubble>
                ))}
                <div ref={bottomRef} />
            </div>
            <div className="p-4 border-t border-gray-700">
                {file && (
                    <div className="mb-2 flex items-center bg-gray-700 p-2 rounded-md">
                        <Paperclip className="h-5 w-5 mr-2 text-gray-400" />
                        <span className="text-sm text-white truncate flex-1">{file.name}</span>
                        <button onClick={() => setFile(null)} className="ml-2 text-gray-400 hover:text-white" aria-label="Remove attachment">
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                )}
                <div className="flex">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="hidden"
                    />
                    <button onClick={() => fileInputRef.current?.click()} className="bg-gray-700 p-2 rounded-l-md hover:bg-gray-600">
                        <Paperclip className="h-6 w-6 text-white" />
                    </button>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend(newMessage)}
                        placeholder="Type a message..."
                        className="flex-1 bg-gray-700 p-2 outline-none text-white"
                    />
                    <button onClick={()=>handleSend(newMessage)} className="bg-blue-600 p-2 rounded-r-md hover:bg-blue-500">
                        Send
                    </button>
                </div>
            </div>
        </>
    );
};

// =============================================================
// 3. Main Page Content (Parent Component with updated logic)
// =============================================================
function MessagesPageContentInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const selectedDM = searchParams.get("dm");

    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [activeDmId, setActiveDmId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Map<string, DirectMessage[]>>(new Map());
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

const socketRef = useRef<Socket | null>(null);

// Single socket setup and event wiring
useEffect(() => {
    if (!currentUser?.id) return;

    // Create socket once
    if (!socketRef.current) {
        const newSocket = createAuthSocket(currentUser.id);
        socketRef.current = newSocket;
    }

    const socket = socketRef.current!;

    const handleNewMessage = (raw: any) => {
        try {
            if (!raw) return;
            // Unwrap common envelope shapes
            const incoming = (raw as any)?.data ?? (raw as any)?.message ?? raw;
            if (!incoming) return;
            if (Array.isArray(incoming)) {
                incoming.forEach(handleNewMessage);
                return;
            }

            // Normalize fields from various possible keys
            const incomingMsg: DirectMessage = {
                id: String(incoming.id ?? incoming.message_id ?? incoming.clientMessageId ?? `sock-${Date.now()}`),
                content: String(incoming.content ?? incoming.message ?? ""),
                sender_id: String(incoming.sender_id ?? incoming.senderId ?? incoming.from ?? ""),
                receiver_id: String(incoming.receiver_id ?? incoming.receiverId ?? incoming.to ?? ""),
                timestamp: String(incoming.timestamp ?? new Date().toISOString()),
                media_url: incoming.media_url ?? incoming.mediaUrl ?? incoming.media ?? null,
            };

            const selfId = currentUser?.id;
            const partnerId = incomingMsg.sender_id === selfId
                ? incomingMsg.receiver_id
                : incomingMsg.sender_id;
            if (!partnerId) {
                console.warn("Incoming DM missing partner id", incoming);
                return;
            }

            setMessages(prevMap => {
                const newMap = new Map(prevMap);
                const currentDms = newMap.get(partnerId) || [];

                // De-duplicate: remove optimistic message with same sender+content close in time
                const thresholdMs = 60_000; // 60s window
                const incTime = Date.parse(incomingMsg.timestamp);
                let updated = currentDms.filter(m => {
                    const sameSender = m.sender_id === incomingMsg.sender_id;
                    const sameContent = (m.content || "") === (incomingMsg.content || "");
                    const mTime = Date.parse(m.timestamp);
                    const nearInTime = Number.isFinite(incTime) && Number.isFinite(mTime)
                        ? Math.abs(mTime - incTime) < thresholdMs
                        : false;
                    return !(sameSender && sameContent && nearInTime);
                });

                // If exact id exists, avoid duplicate; otherwise append to the end (arrival order)
                if (!updated.some(m => m.id === incomingMsg.id)) {
                    updated = [...updated, incomingMsg];
                }

                newMap.set(partnerId, updated);
                return newMap;
            });
        } catch (e) {
            console.error("Failed to handle incoming DM:", e, raw);
        }
    };

    const handleError = (errorMessage: any) => {
        console.error("Socket DM Error:", errorMessage);
    };

    const onConnect = () => {
        // Connected
    };

    socket.on("connect", onConnect);
    socket.on("dm_sent_confirmation", handleNewMessage);
    socket.on("receive_dm", handleNewMessage);
    socket.on("dm_error", handleError);

    return () => {
        socket.off("connect", onConnect);
        socket.off("dm_sent_confirmation", handleNewMessage);
        socket.off("receive_dm", handleNewMessage);
        socket.off("dm_error", handleError);
        socket.disconnect();
        socketRef.current = null;
    };
}, [currentUser?.id]);


    // Effect to get user and initialize socket
    useEffect(() => {
        const userItem = localStorage.getItem("user");
        if (userItem) {
            const loggedInUser = JSON.parse(userItem);
            setCurrentUser(loggedInUser);
        } else {
            router.push('/login');
        }
    }, [router]);
    
    // Removed duplicate socket setup effect; handled in single effect above

    // --- EFFECT TO FETCH HISTORICAL DMS (with improved error logging) ---
    useEffect(() => {
        // Ensure we have a valid user before fetching
        if (currentUser && currentUser.id) {
            const fetchDms = async () => {
                try {
                    setIsLoading(true);
                    setError(null);
                    const payload = await getUserDMs();

                    // Normalize different possible response shapes
                    const top = (payload as any)?.data ?? payload;
                    let threads: any[] = [];
                    if (Array.isArray(top)) {
                        threads = top;
                    } else if (Array.isArray((top as any)?.threads)) {
                        threads = (top as any).threads;
                    } else if (Array.isArray((top as any)?.data)) {
                        threads = (top as any).data;
                    } else {
                        console.warn("Unexpected DM response shape", top);
                        threads = [];
                    }

                    const users: User[] = [];
                    const messagesMap = new Map<string, DirectMessage[]>();

                    threads.forEach((thread: any) => {
                        // Two possible shapes supported:
                        // A) { other_user: { id, username/fullname/name, avatar_url }, messages: [...] }
                        // B) { recipientId, recipientName, lastMessage, updatedAt, messages?: [...] }
                        const other = thread.other_user;
                        if (other && other.id) {
                            const name = other.fullname || other.username || other.name || "Unknown User";
                            users.push({ id: String(other.id), fullname: String(name), avatar_url: other.avatar_url });
                            if (Array.isArray(thread.messages)) {
                                const sorted = thread.messages
                                    .map((m: any) => ({
                                        id: String(m.id ?? `${other.id}-${m.timestamp ?? Math.random()}`),
                                        content: m.content ?? m.message ?? "",
                                        sender_id: String(m.sender_id ?? m.senderId ?? ""),
                                        receiver_id: String(m.receiver_id ?? m.receiverId ?? other.id),
                                        timestamp: String(m.timestamp ?? new Date().toISOString()),
                                        thread_id: m.thread_id,
                                        media_url: m.media_url ?? null,
                                    }))
                                    .sort((a: DirectMessage, b: DirectMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                                messagesMap.set(String(other.id), sorted);
                            }
                        } else if (thread.recipientId) {
                            const rid = String(thread.recipientId);
                            const name = thread.recipientName || "Unknown User";
                            users.push({ id: rid, fullname: name });
                            if (Array.isArray(thread.messages)) {
                                const sorted = thread.messages
                                    .map((m: any) => ({
                                        id: String(m.id ?? `${rid}-${m.timestamp ?? Math.random()}`),
                                        content: m.content ?? m.message ?? "",
                                        sender_id: String(m.sender_id ?? m.senderId ?? ""),
                                        receiver_id: String(m.receiver_id ?? m.receiverId ?? rid),
                                        timestamp: String(m.timestamp ?? new Date().toISOString()),
                                        thread_id: m.thread_id,
                                        media_url: m.media_url ?? null,
                                    }))
                                    .sort((a: DirectMessage, b: DirectMessage) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
                                messagesMap.set(rid, sorted);
                            } else if (thread.lastMessage) {
                                // Minimal conversation with lastMessage only
                                const minimal: DirectMessage = {
                                    id: `${rid}-last`,
                                    content: thread.lastMessage,
                                    sender_id: "",
                                    receiver_id: rid,
                                    timestamp: String(thread.updatedAt ?? new Date().toISOString()),
                                } as DirectMessage;
                                messagesMap.set(rid, [minimal]);
                            }
                        }
                    });

                    setAllUsers(users);
                    setMessages(messagesMap);

                } catch (error: any) {
                    console.error("--- DETAILED FETCH ERROR ---");
                    console.error(error);
                    if (error.response) {
                        console.error("Backend Response Data:", error.response.data);
                    }
                    setError("Failed to load conversations. Check console for details.");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchDms();
        }
    }, [currentUser]);


    // Effect to set the active DM based on the URL parameter
    useEffect(() => {
        if (selectedDM) {
            setActiveDmId(selectedDM);
        }
    }, [selectedDM]);
// Empty dependency array is okay here due to the functional updates.
    // Effect for handling incoming socket events

    const handleSendMessage = async (content: string, file: File | null) => {
        if (!currentUser || !activeDmId) return;
        if (!content.trim() && !file) return; // allow media-only messages

        console.log(activeDmId);

        // Optimistic update
        const tempId = `temp-${Date.now()}`;
        const tempMessage: DirectMessage = {
            id: tempId,
            content: content.trim(),
            sender_id: currentUser.id,
            receiver_id: activeDmId,
            timestamp: new Date().toISOString(),
            media_url: null,
        };

        setMessages(prev => {
            const newMap = new Map(prev);
            const list = newMap.get(activeDmId) || [];
            const updated = [...list, tempMessage]; // keep arrival order
            newMap.set(activeDmId, updated);
            return newMap;
        });

        // Send via API route only; backend will broadcast via socket
        try {
            const dmPayload = {
                sender_id: currentUser.id,
                receiver_id: activeDmId,
                message: content.trim(),
                mediaurl: file ?? undefined,
            } as const;

            const saved = await uploaddm(dmPayload);
            if (!saved) {
                console.warn("DM upload returned no data");
            }
            // Optionally reconcile temp message with saved (id/media_url) if backend doesn't echo quickly
            if (saved && (saved.id || saved.media_url)) {
                setMessages(prev => {
                    const newMap = new Map(prev);
                    const list = newMap.get(activeDmId) || [];
                    const idx = list.findIndex(m => m.id === tempId);
                    if (idx !== -1) {
                        const next = [...list];
                        next[idx] = {
                            ...next[idx],
                            id: String(saved.id ?? tempId),
                            media_url: saved.media_url ?? next[idx].media_url ?? null,
                            content: saved.content ?? saved.message ?? next[idx].content,
                            timestamp: String(saved.timestamp ?? next[idx].timestamp),
                        } as DirectMessage;
                        newMap.set(activeDmId, next);
                    }
                    return newMap;
                });
            }
        } catch (e) {
            console.error("Failed to send DM via API:", e);
            // Roll back optimistic message on error
            setMessages(prev => {
                const newMap = new Map(prev);
                const list = (newMap.get(activeDmId) || []).filter(m => m.id !== tempId);
                newMap.set(activeDmId, list);
                return newMap;
            });
        }
    };

    const handleSelectDm = (userId: string) => {
        setActiveDmId(userId);
        router.push(`/messages?dm=${userId}`);
    };
    
    const conversations = allUsers.map(user => {
        const userMessages = messages.get(user.id) || [];
        const lastMessageObj = userMessages.length > 0 ? userMessages[userMessages.length - 1] : null;
        let lastMessage = "No messages yet.";
        if (lastMessageObj) {
            const isSender = lastMessageObj.sender_id === currentUser?.id;
            const content = lastMessageObj.media_url ? "Sent an attachment" : (lastMessageObj.content || "");
            const prefix = isSender ? "You: " : `${user.fullname}: `;
            lastMessage = `${prefix}${content}`.trim();
        }
        return { user, lastMessage };
    });

    const activeUser = allUsers.find(u => u.id === activeDmId) || null;
    const activeMessages = activeDmId ? messages.get(activeDmId) || [] : [];

    return (
        <div className="flex h-screen w-full overflow-hidden">
            <div className="w-72 bg-black text-white">
                <ChatList 
                    conversations={conversations} 
                    activeDmId={activeDmId} 
                    onSelectDm={handleSelectDm}
                    isLoading={isLoading} 
                    error={error}
                />
            </div>
            <div className="flex flex-col flex-1 bg-[#1e1e2f]">
                <ChatWindow 
                    activeUser={activeUser}
                    messages={activeMessages} 
                    currentUser={currentUser}
                    onSendMessage={handleSendMessage}
                />
            </div>
        </div>
    );
}

export default function MessagesPageContent() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center text-white">Loading messages…</div>}>
            <MessagesPageContentInner />
        </Suspense>
    );
}