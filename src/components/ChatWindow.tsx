"use client";

import { useEffect, useRef, useState } from "react";
import MessageInput from "./MessageInput";
import { fetchMessages, uploadMessage } from "@/app/api/API";

interface ChatWindowProps {
  channelId: string;
  isDM: boolean;
}

export default function ChatWindow({ channelId, isDM }: ChatWindowProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    try {
      const res = await fetchMessages(channelId, isDM);
      setMessages(res);
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  useEffect(() => {
    if (channelId) loadMessages();
  }, [channelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (msg: string) => {
    try {
      const newMsg = await uploadMessage({
        message: msg,
        senderId: "yourUserId", // Replace with actual user ID
        channelId,
        isDM,
      });
      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className="bg-white/10 backdrop-blur-md p-2 rounded-lg text-white max-w-lg"
          >
            {msg.message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <MessageInput sendMessage={handleSend} />
    </div>
  );
}
