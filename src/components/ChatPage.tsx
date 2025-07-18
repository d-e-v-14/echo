
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ChatList from "./ChatList";
import ChatWindow from "./ChatWindow";

export default function MessagesPageContent() {
  const searchParams = useSearchParams();
  const selectedDM = searchParams.get("dm");
  const [dmId, setDmId] = useState<string | null>(null);

  useEffect(() => {
    if (selectedDM) {
      setDmId(selectedDM);
    }
  }, [selectedDM]);

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Left Panel - Chat List */}
      <div className="w-72 bg-black text-white">
        <ChatList />
      </div>

      {/* Right Panel - Chat Window */}
      <div className="flex flex-col flex-1 bg-[#1e1e2f]">
        {dmId ? (
          <ChatWindow channelId={dmId} isDM={true} />
        ) : (
          <div className="flex flex-1 items-center justify-center text-white text-lg">
            Select a DM to view conversation.
          </div>
        )}
      </div>
    </div>
  );
}
