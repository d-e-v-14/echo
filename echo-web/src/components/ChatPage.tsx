// File: /src/app/messages/page.tsx

"use client";

import ChatList from "@/components/ChatList";
import ChatWindow from "@/components/ChatWindow";

export default function MessagesPage() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Panel - Chat List */}
      <div className="w-72 bg-black text-white">
        <ChatList />
      </div>

      {/* Right Panel - Chat Window */}
      <div className="flex flex-col flex-1 bg-[#1e1e2f]">
        <ChatWindow />
      </div>
    </div>
  );
}
