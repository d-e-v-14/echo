"use client";

import React, { useState, useEffect, useRef } from "react";
import { FaHashtag, FaCog } from "react-icons/fa";
import EmojiPicker, { Theme } from "emoji-picker-react";
import type { EmojiClickData } from "emoji-picker-react";
import { useRouter } from "next/navigation";

const TENOR_API_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY!;


const ServersPage: React.FC = () => {
  const router = useRouter();
  const [activeChannel, setActiveChannel] = useState("general");
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({
    General: true,
    "Voice Channels": true,
    Support: true,
    Events: true,
    Resources: true,
  });
  const [message, setMessage] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const [gifResults, setGifResults] = useState<any[]>([]);
  const [messages, setMessages] = useState([
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
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleSection = (title: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
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
      console.log("Tenor GIF Data:", data);
      if (data.results && Array.isArray(data.results)) {
        setGifResults(data.results);
      } else {
        console.warn("Unexpected Tenor response:", data);
        setGifResults([]);
      }
    } catch (error) {
      console.error("Failed to fetch GIFs:", error);
      setGifResults([]);
    }
  };

  useEffect(() => {
    if (showGifs) fetchTenorGifs();
  }, [showGifs]);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div
        className="w-16 p-2 flex flex-col items-center overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: "url('/gradient-background.png')" }}
      >
        {[
          "/hackbattle.png",
          "/image_6.png",
          "/image_7.png",
          "/image_9.png",
          "/image_6.png",
          "/hackbattle.png",
        ].map((src, idx, arr) => (
          <img
            key={idx}
            src={src}
            alt={`Server ${idx + 1}`}
            className={`w-12 h-12 rounded-full hover:scale-105 transition-transform cursor-pointer ${
              idx < arr.length - 1 ? "mb-8" : ""
            }`}
          />
        ))}
      </div>

      {/* Channels */}
      <div className="w-72 h-screen overflow-y-scroll text-white px-4 py-6 space-y-4 border-r border-gray-800 bg-gradient-to-b from-black via-black to-[#0f172a] scrollbar scrollbar-thumb-white/90 scrollbar-track-[#1a1a1a]">
        <div className="flex items-center gap-2 mb-2">
          <img
            src="/hackbattle.png"
            className="w-8 h-8 rounded-full"
            alt="server"
          />
          <h2 className="text-xl font-bold">Hackbattle</h2>
           <button
              className="ml-2 p-2 rounded-full hover:bg-[#23272a] transition"
              title="Server Settings"
              onClick={() => router.push("/server-settings")}>
              <FaCog className="w-5 h-5 text-[#b5bac1] hover:text-white" />
          </button>
        </div>
        {[
          { title: "General", channels: ["general", "welcome"] },
          { title: "Voice Channels", channels: ["technical", "voice-general"] },
          { title: "Support", channels: ["tickets", "faq"] },
          { title: "Events", channels: ["upcoming", "chapter-meetings"] },
          { title: "Resources", channels: ["study-material", "project-repos"] },
        ].map((section, idx) => (
          <div key={idx}>
            <div
              className="flex justify-between items-center text-sm text-gray-400 mt-4 cursor-pointer"
              onClick={() => toggleSection(section.title)}
            >
              <span>{section.title}</span>
              <button className="text-white text-lg">
                {expandedSections[section.title] ? "−" : "+"}
              </button>
            </div>
            {expandedSections[section.title] &&
              section.channels.map((channel) => renderChannel(channel))}
          </div>
        ))}
      </div>

      {/* Chat Window */}
      <div className="flex-1 relative text-white px-6 pt-6 pb-44 overflow-hidden bg-black bg-[radial-gradient(ellipse_at_bottom,rgba(37,99,235,0.15)_0%,rgba(0,0,0,1)_85%)] flex flex-col">
        <h1 className="text-2xl font-bold mb-4 text-white drop-shadow-[0_2px_4px_rgba(255,255,255,0.3)] [user-select:none]">
          Welcome to the server
        </h1>

        {/* Messages List */}
        <div className="flex-1 flex flex-col justify-end overflow-y-auto gap-6 pr-2">
          <div className="flex flex-col gap-6">
            {messages.map((msg, idx) => (
              <div className="flex items-start gap-4" key={idx}>
                <img
                  src={`https://api.dicebear.com/7.x/thumbs/svg?seed=${msg.seed}`}
                  alt="avatar"
                  className="w-10 h-10 rounded-full"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-semibold ${msg.color}`}>
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

        {/* Floating Input */}
        <div className="absolute bottom-14 left-1/2 transform -translate-x-1/2 w-[90%] max-w-2xl">
          <div className="h-[1px] bg-white/10 mb-2" />
          <div className="bg-white/5 backdrop-blur-md rounded-2xl flex items-center p-3 ring-2 ring-white/10 shadow-lg relative">
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
              className="flex-1 bg-transparent outline-none text-white placeholder-gray-300 px-4"
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
              <div className="absolute bottom-16 left-0 z-50">
                <EmojiPicker
                  onEmojiClick={handleEmojiClick}
                  theme={Theme.DARK}
                />
              </div>
            )}

            {showGifs && (
              <div className="absolute bottom-16 right-0 z-50 w-[300px] h-[300px] bg-black rounded-xl overflow-auto p-2 space-y-2">
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
          <div className="h-[1px] bg-white/10 mt-2" />
        </div>
      </div>
    </div>
  );
};

export default ServersPage;
