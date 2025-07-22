"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaHashtag, FaCog } from "react-icons/fa";
import EmojiPicker, { Theme } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import {
  fetchServers,
  fetchChannelsByUser,
  fetchMessages,
  uploadMessage,
} from "@/app/api/API";

const TENOR_API_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY!;

const serverIcons: string[] = [
  "/hackbattle.png",
  "/image_6.png",
  "/image_7.png",
  "/image_9.png",
  "/image_6.png",
  "/hackbattle.png",
];

interface Channel {
  id: string;
  name: string;
  type: string;
  is_private: boolean;
}

const ServersPage: React.FC = () => {
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [selectedServerName, setSelectedServerName] = useState<string>("");
  const [channelsByServer, setChannelsByServer] = useState<
    Record<string, Channel[]>
  >({});
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [gifResults, setGifResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const userId =
    typeof window !== "undefined"
      ? localStorage.getItem("userId") || "guest"
      : "guest";

  useEffect(() => {
    const loadServers = async () => {
      try {
        setLoading(true);
        const data = await fetchServers();
        setServers(data);
        if (data.length > 0) {
          setSelectedServerId(data[0].id);
          setSelectedServerName(data[0].name);
        }
      } catch (err: any) {
        console.error("Error fetching servers", err);
        setError("Failed to load servers. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    loadServers();
  }, []);

  useEffect(() => {
    if (!selectedServerId || !userId) return;

    const loadChannels = async () => {
      try {
        const data: Channel[] = await fetchChannelsByUser(userId);
        setChannelsByServer((prev) => ({
          ...prev,
          [selectedServerId]: data,
        }));
      } catch (err) {
        console.error("Error fetching channels", err);
        setError("Failed to load channels");
      }
    };

    loadChannels();
  }, [selectedServerId, userId]);

  useEffect(() => {
    if (!activeChannel) return;

    const loadMessages = async () => {
      try {
        const res = await fetchMessages(activeChannel.id, false);
        setMessages(res.data || []);
      } catch (err) {
        console.error("Failed to fetch messages", err);
        setError("Failed to load messages");
      }
    };

    loadMessages();
  }, [activeChannel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!message.trim() || !activeChannel) return;

    try {
      const res = await uploadMessage({
        message,
        senderId: userId,
        channelId: activeChannel.id,
        isDM: false,
      });
      setMessages((prev) => [...prev, res]);
      setMessage("");
      setShowEmoji(false);
      setShowGifs(false);
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message");
    }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji);
  };

  const fetchTenorGifs = async () => {
    try {
      const res = await fetch(
        `https://tenor.googleapis.com/v2/search?q=trending&key=${TENOR_API_KEY}&limit=12`
      );
      const data = await res.json();
      setGifResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setGifResults([]);
    }
  };

  useEffect(() => {
    if (showGifs) fetchTenorGifs();
  }, [showGifs]);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const renderChannel = (channel: Channel) => (
    <div
      key={channel.id}
      className={`flex items-center justify-between px-3 py-1 text-sm rounded-md cursor-pointer transition-all ${
        activeChannel?.id === channel.id
          ? "bg-[#2f3136] text-white"
          : "text-gray-400 hover:bg-[#2f3136] hover:text-white"
      }`}
      onClick={() => setActiveChannel(channel)}
    >
      <span className="flex items-center gap-1">
        <FaHashtag size={12} />
        {channel.name}
      </span>
      {activeChannel?.id === channel.id && <FaCog size={12} />}
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading servers...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black text-white">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-screen">
      {/* Server Sidebar */}
      <div className="w-16 p-2 flex flex-col bg-black items-center bg-cover bg-center">
        {servers.map((server, idx) => (
          <img
            key={server.id}
            src={server.iconUrl || serverIcons[idx % serverIcons.length]}
            alt={server.name}
            className={`w-12 h-12 rounded-full hover:scale-105 transition-transform cursor-pointer mb-6 ${
              selectedServerId === server.id ? "ring-2 ring-white" : ""
            }`}
            onClick={() => {
              setSelectedServerId(server.id);
              setSelectedServerName(server.name);
            }}
          />
        ))}
      </div>

      {/* Channel List */}
      <div className="w-72 overflow-y-scroll text-white px-4 py-6 space-y-4 border-r border-gray-800 bg-gradient-to-b from-black via-black to-[#0f172a]">
        <h2 className="text-xl font-bold mb-2">{selectedServerName}</h2>
        {(channelsByServer[selectedServerId] || []).map((channel) =>
          renderChannel(channel)
        )}
      </div>

      {/* Chat Window */}
      <div className="flex-1 relative text-white px-6 pt-6 pb-6 overflow-hidden bg-black bg-[radial-gradient(ellipse_at_bottom,rgba(37,99,235,0.15)_0%,rgba(0,0,0,1)_85%)] flex flex-col">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Welcome to #{activeChannel?.name || "channel"}
        </h1>

        <div className="flex-1 flex flex-col justify-end overflow-y-auto gap-4 pr-2">
          <div className="flex flex-col gap-4">
            {messages.map((msg, idx) => (
              <div className="flex items-start gap-4" key={idx}>
                <img
                  src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${
                    msg.seed || "user"
                  }`}
                  alt="avatar"
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${msg.color || "text-white"}`}
                    >
                      {msg.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>
                  {msg.message.startsWith("http") ? (
                    <img
                      src={msg.message}
                      alt="gif"
                      className="rounded-lg mt-2 max-w-xs"
                    />
                  ) : (
                    <p className="text-gray-200">{msg.message}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input Box */}
        <div className="mt-4 bg-white/10 backdrop-blur-md rounded-2xl flex items-center p-4 ring-2 ring-white/10 shadow-lg w-[90%] max-w-2xl mx-auto">
          <button
            className="px-3 text-white text-xl"
            onClick={() => setShowEmoji((prev) => !prev)}
          >
            😊
          </button>
          <button
            className="px-3 text-white text-xl"
            onClick={() => setShowGifs((prev) => !prev)}
          >
            GIF
          </button>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 bg-transparent outline-none text-white placeholder-gray-300 px-4 py-3 text-base"
            placeholder={`Message #${activeChannel?.name || ""}`}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button
            className="px-3 text-white font-semibold hover:text-blue-400"
            onClick={handleSend}
          >
            Send
          </button>

          {showEmoji && (
            <div className="absolute bottom-20 left-4 z-50">
              <EmojiPicker onEmojiClick={handleEmojiClick} theme={Theme.DARK} />
            </div>
          )}

          {showGifs && (
            <div className="absolute bottom-20 right-4 z-50 w-[300px] h-[300px] bg-black rounded-xl overflow-auto p-2 space-y-2">
              {gifResults.map((gif, idx) => {
                const gifUrl = gif.media_formats?.gif?.url;
                if (!gifUrl) return null;
                return (
                  <img
                    key={idx}
                    src={gifUrl}
                    alt="gif"
                    className="w-full rounded cursor-pointer"
                    onClick={() => {
                      setMessages((prev) => [
                        ...prev,
                        {
                          name: "You",
                          seed: "you",
                          color: "text-purple-400",
                          message: gifUrl,
                          timestamp: new Date().toISOString(),
                        },
                      ]);
                      setShowGifs(false);
                    }}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServersPage;
