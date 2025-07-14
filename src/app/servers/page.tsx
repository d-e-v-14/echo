"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaHashtag, FaCog } from "react-icons/fa";
import EmojiPicker, { Theme } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import {
  fetchServers,
  fetchChannelsByServer,
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

type ChannelsResponse = Record<string, string[]>;

const ServersPage: React.FC = () => {
  const [servers, setServers] = useState<any[]>([]);
  const [selectedServerId, setSelectedServerId] = useState<string>("");
  const [selectedServerName, setSelectedServerName] = useState<string>("");
  const [channelsByServer, setChannelsByServer] = useState<
    Record<string, ChannelsResponse>
  >({});
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [activeChannel, setActiveChannel] = useState<string>("");
  const [messages, setMessages] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [gifResults, setGifResults] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  const userId =
    typeof window !== "undefined" ? localStorage.getItem("userId") || "" : "";

  useEffect(() => {
    const loadServers = async () => {
      try {
        const res = await fetchServers();
        const data = res.data;
        setServers(data);
        if (data.length > 0) {
          setSelectedServerId(data[0].id);
          setSelectedServerName(data[0].name);
        }
      } catch (err) {
        console.error("Error fetching servers", err);
      }
    };
    loadServers();
  }, []);

  useEffect(() => {
    if (!selectedServerId || !userId) return;

    const loadChannels = async () => {
      try {
        const res = await fetchChannelsByServer(selectedServerId, userId);
        const data = res.data as ChannelsResponse;
        setChannelsByServer((prev) => ({ ...prev, [selectedServerId]: data }));
        const firstChannel = Object.values(data)[0]?.[0];
        if (firstChannel) setActiveChannel(firstChannel);

        const sectionState: Record<string, boolean> = {};
        Object.keys(data).forEach((sec) => (sectionState[sec] = true));
        setExpandedSections(sectionState);
      } catch (err) {
        console.error("Error fetching channels", err);
      }
    };
    loadChannels();
  }, [selectedServerId, userId]);

  useEffect(() => {
    if (!activeChannel) return;
    const loadMessages = async () => {
      try {
        const res = await fetchMessages(activeChannel, false);
        setMessages(res.data || []);
      } catch (err) {
        console.error("Failed to fetch messages", err);
      }
    };
    loadMessages();
  }, [activeChannel]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    try {
      const res = await uploadMessage({
        message,
        senderId: userId,
        channelId: activeChannel,
        isDM: false,
      });
      setMessages((prev) => [...prev, res]);
      setMessage("");
      setShowEmoji(false);
      setShowGifs(false);
    } catch (err) {
      console.error("Error sending message:", err);
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
    } catch (error) {
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

  const renderChannel = (name: string) => (
    <div
      key={name}
      className={`flex items-center justify-between px-3 py-1 text-sm rounded-md cursor-pointer transition-all ${
        activeChannel === name
          ? "bg-[#2f3136] text-white"
          : "text-gray-400 hover:bg-[#2f3136] hover:text-white"
      }`}
      onClick={() => setActiveChannel(name)}
    >
      <span className="flex items-center gap-1">
        <FaHashtag size={12} />
        {name}
      </span>
      {activeChannel === name && <FaCog size={12} />}
    </div>
  );

  return (
    <div className="flex h-screen">
      {/* Server Sidebar */}
      <div
        className="w-16 p-2 flex flex-col bg-black  items-center bg-cover bg-center"
        
      >
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
        {Object.entries(channelsByServer[selectedServerId] || {}).map(
          ([section, channels]) => (
            <div key={section}>
              <div
                className="flex justify-between items-center text-sm text-gray-400 mt-4 cursor-pointer"
                onClick={() => toggleSection(section)}
              >
                <span>{section}</span>
                <button className="text-white text-lg">
                  {expandedSections[section] ? "−" : "+"}
                </button>
              </div>
              {expandedSections[section] &&
                channels.map((channel) => renderChannel(channel))}
            </div>
          )
        )}
      </div>

      {/* Chat Window */}
      <div className="flex-1 relative text-white px-6 pt-6 pb-6 overflow-hidden bg-black bg-[radial-gradient(ellipse_at_bottom,rgba(37,99,235,0.15)_0%,rgba(0,0,0,1)_85%)] flex flex-col">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Welcome to #{activeChannel}
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
            placeholder={`Message #${activeChannel}`}
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
