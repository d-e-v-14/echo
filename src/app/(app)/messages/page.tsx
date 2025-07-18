"use client";

import ChatList from "@/components/ChatList";
import ChatWindow from "@/components/ChatWindow";

export default function MessagesPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Panel - Chat List */}
      <ChatList />

      {/* Right Panel - Chat Window */}
      <div className="flex flex-col flex-1 overflow-hidden bg-[#1e1e2f]">
        <ChatWindow />
      </div>
    </div>
  );
}
