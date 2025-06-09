"use client";

import { useEffect, useRef, useState } from "react";
import { Video, Phone, Plus } from "lucide-react";
import MessageInput from "@/components/MessageInput";

// ✅ Timestamp component
const ClientTimestamp: React.FC<{ timestamp: string }> = ({ timestamp }) => {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    const date = new Date(timestamp);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const formattedHours = ("0" + (hours % 12 || 12)).slice(-2);
    const formattedMinutes = ("0" + minutes).slice(-2);

    const formattedTime = `${formattedHours}:${formattedMinutes} ${ampm}`;
    setFormatted(formattedTime);
  }, [timestamp]);

  return <span className="text-xs text-gray-400">{formatted}</span>;
};

type Message = {
  id: number;
  name: string;
  isSender: boolean;
  message: string;
  avatarUrl: string;
  timestamp: string;
};

export default function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      name: "PRANAV",
      isSender: false,
      message: "Hey!",
      avatarUrl: "https://avatars.dicebear.com/api/bottts/pranav.svg",
      timestamp: new Date().toISOString(),
    },
    {
      id: 2,
      name: "RAHUL",
      isSender: true,
      message: "What's up?",
      avatarUrl: "/User_profil.png",
      timestamp: new Date().toISOString(),
    },
  ]);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop =
        scrollContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (text: string) => {
    const now = new Date();
    setMessages((prev) => [
      ...prev,
      {
        id: prev.length + 1,
        name: "RAHUL",
        isSender: true,
        message: text,
        avatarUrl: "/User_profil.png",
        timestamp: now.toISOString(),
      },
    ]);
  };

  return (
    <div
      className="flex flex-col flex-1 text-white select-none"
      style={{
        backgroundImage: "url('/image.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gray-700" />
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-yellow-400 border-2 border-black" />
          </div>
          <span className="text-lg font-semibold">PRANAV</span>
        </div>
        <div className="flex gap-2">
          <button className="w-9 h-9 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center">
            <Plus className="w-5 h-5 text-white" />
          </button>
          <button className="w-9 h-9 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center">
            <Phone className="w-5 h-5 text-white" />
          </button>
          <button className="w-9 h-9 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center justify-center">
            <Video className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Message Container */}
      <div
        ref={scrollContainerRef}
        className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto justify-end"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-4 ${
              msg.isSender ? "justify-end" : "justify-start"
            }`}
          >
            {!msg.isSender && (
              <img
                src={msg.avatarUrl}
                alt={msg.name}
                className="w-10 h-10 rounded-full"
              />
            )}
            <div>
              <div className="flex items-center gap-2 pt-1">
                <span className="font-semibold leading-none">{msg.name}</span>
                <ClientTimestamp timestamp={msg.timestamp} />
              </div>
              <p className="text-gray-200 mt-1">{msg.message}</p>
            </div>
            {msg.isSender && (
              <img
                src={msg.avatarUrl}
                alt={msg.name}
                className="w-10 h-10 rounded-full"
              />
            )}
          </div>
        ))}
      </div>

      {/* Input */}
      <MessageInput sendMessage={sendMessage} />
    </div>
  );
}
