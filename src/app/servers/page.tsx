"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaHashtag, FaCog } from "react-icons/fa";
import EmojiPicker, { Theme } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";

const TENOR_API_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY!;

const channelsPerServer: Record<string, Record<string, string[]>> = {
  Hackbattle: {
    General: ["general", "welcome"],
    "Voice Channels": ["technical", "voice-general"],
    Support: ["tickets", "faq"],
    Events: ["upcoming", "chapter-meetings"],
    Resources: ["study-material", "project-repos"],
  },
  AI: {
    General: ["chatbot", "updates"],
    Community: ["ideas", "feedback"],
  },
  Chatverse: {
    General: ["random", "memes"],
    Chat: ["general-chat", "off-topic"],
  },
};

const defaultMessages: Record<string, Record<string, any[]>> = {
  Hackbattle: {
    general: [
      {
        name: "Alice",
        seed: "Alice",
        color: "text-blue-400",
        message: "Hey everyone! Welcome to the IEEE CS Chapter server!",
        timestamp: "2025-06-03T18:00:00Z",
      },
      {
        name: "Bob",
        seed: "Bob",
        color: "text-green-400",
        message: "Glad to be here!",
        timestamp: "2025-06-03T18:05:00Z",
      },
      {
        name: "Alice",
        seed: "Alice2",
        color: "text-red-400",
        message:
          "Reminder: Our weekly meeting is today at 10 pm in the #chapter-meetings voice channel. See you there.",
        timestamp: "2025-06-03T18:10:00Z",
      },
    ],
  },
};

const serverIcons: string[] = [
  "/hackbattle.png",
  "/image_6.png",
  "/image_7.png",
  "/image_9.png",
  "/image_6.png",
  "/hackbattle.png",
];

const ServersPage: React.FC = () => {
  const [selectedServer, setSelectedServer] = useState("Hackbattle");
  const [activeChannel, setActiveChannel] = useState("general");
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [gifResults, setGifResults] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>(
    defaultMessages["Hackbattle"]["general"] || []
  );
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const sections = channelsPerServer[selectedServer];
    const defaults: Record<string, boolean> = {};
    for (const section in sections) defaults[section] = true;
    setExpandedSections(defaults);
  }, [selectedServer]);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const handleSend = () => {
    if (!message.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        name: "You",
        seed: "you",
        color: "text-purple-400",
        message,
        timestamp: new Date().toISOString(),
      },
    ]);
    setMessage("");
    setShowEmoji(false);
    setShowGifs(false);
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
      onClick={() => {
        setActiveChannel(name);
        const defaults = defaultMessages[selectedServer]?.[name] || [];
        setMessages(defaults);
      }}
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
        className="w-16 p-2 flex flex-col items-center bg-cover bg-center"
        style={{ backgroundImage: "url('/gradient-background.png')" }}
      >
        {serverIcons.map((src, idx) => (
          <img
            key={idx}
            src={src}
            alt={`Server ${idx + 1}`}
            className={`w-12 h-12 rounded-full hover:scale-105 transition-transform cursor-pointer mb-6 ${
              selectedServer === Object.keys(channelsPerServer)[idx]
                ? "ring-2 ring-white"
                : ""
            }`}
            onClick={() => {
              const server = Object.keys(channelsPerServer)[idx];
              setSelectedServer(server);
              setActiveChannel("general");
              setMessages(defaultMessages[server]?.["general"] || []);
            }}
          />
        ))}
      </div>

      {/* Channels Sidebar */}
      <div className="w-72 overflow-y-scroll text-white px-4 py-6 space-y-4 border-r border-gray-800 bg-gradient-to-b from-black via-black to-[#0f172a]">
        <div className="flex items-center gap-2 mb-2">
          <h2 className="text-xl font-bold">{selectedServer}</h2>
        </div>
        {Object.entries(channelsPerServer[selectedServer] || {}).map(
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
  <h1 className="text-2xl font-bold mb-4 text-center text-white [user-select:none]">
    Welcome to #{activeChannel}
  </h1>

  {/* Messages List */}
  <div className="flex-1 flex flex-col justify-end overflow-y-auto gap-4 pr-2">
    <div className="flex flex-col gap-4">
      {messages.map((msg, idx) => (
        <div className="flex items-start gap-4" key={idx}>
          <img
            src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${msg.seed}`}
            alt="avatar"
            className="w-10 h-10 rounded-full"
          />
          <div>
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${msg.color}`}>{msg.name}</span>
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

            
<div ref={bottomRef} />
 </div>
    
  );
};

export default ServersPage;
