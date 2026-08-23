"use client";

import React from "react";
import { Hash, Search, MoreVertical } from "lucide-react";

export interface ChatHeaderProps {
  channelName?: string;
  isThread: boolean;
  connected: boolean;
  onOpenSearch?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  channelName,
  isThread,
  connected,
  onOpenSearch,
}) => {
  return (
    <div className="h-12 flex items-center justify-between px-4 border-b border-[#1f2124] bg-[#313338]">
      <div className="flex items-center min-w-0">
        <Hash className="w-6 h-6 text-[#80848e] mr-2 flex-shrink-0" />

        <div className="min-w-0">
          <h2 className="truncate text-white font-semibold text-[15px]">
            {channelName}
          </h2>
          <p className="truncate text-[12px] text-[#949ba4]">
            {isThread ? "Private conversation" : "Channel discussion"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px]"
          title={connected ? "Connected" : "Disconnected"}
        >
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              connected ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className="hidden sm:inline text-[#949ba4]">
            {connected ? "Connected" : "Disconnected"}
          </span>
        </div>
        <button
          onClick={onOpenSearch}
          className="p-2 rounded-md text-[#b5bac1] hover:text-white hover:bg-[#3f4248] transition"
          aria-label="Search messages"
        >
          <Search className="w-5 h-5" />
        </button>
        <button
          className="p-2 rounded-md text-[#b5bac1] hover:text-white hover:bg-[#3f4248] transition"
          aria-label="More options"
        >
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;
