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
        {!connected && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px]"
            title="Reconnecting to realtime service…"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            <span className="hidden sm:inline text-[#949ba4]">
              Reconnecting…
            </span>
          </div>
        )}
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
