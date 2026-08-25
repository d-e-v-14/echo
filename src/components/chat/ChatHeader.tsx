"use client";

import React from "react";
import { Search, Pin } from "lucide-react";
import InlineSearchDropdown from "@/components/InlineSearchDropdown";
import { MessageSearchResult } from "@/api/types/message.types";

export interface ChatHeaderProps {
  channelName?: string;
  connected: boolean;
  showSearch: boolean;
  onToggleSearch: () => void;
  onCloseSearch: () => void;
  onSearch: (query: string) => Promise<MessageSearchResult[]>;
  onSelectResult: (result: MessageSearchResult) => void;
  showChannelName?: boolean;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  channelName,
  connected,
  showSearch,
  onToggleSearch,
  onCloseSearch,
  onSearch,
  onSelectResult,
  showChannelName = false,
}) => {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.06] bg-[#111214] px-4">
      {/* Left: Channel Avatar + Name */}
      <div className="flex min-w-0 items-center gap-3">
        
          <span className="text-md font-bold text-[#b5bac1]">
            #
          </span>
        
        <h2 className="min-w-0 truncate text-[15px] font-semibold text-slate-100" title={channelName}>
          {channelName}
        </h2>
      </div>

      {/* Center: Action Buttons */}
      <div className="flex items-center gap-1 md:ml-2">
        {/* <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#b5bac1] transition hover:bg-white/[0.06] hover:text-white"
          title="Start voice call"
          aria-label="Start voice call"
        >
          <Phone className="h-[18px] w-[18px]" />
        </button>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#b5bac1] transition hover:bg-white/[0.06] hover:text-white"
          title="Start video call"
          aria-label="Start video call"
        >
          <Video className="h-[18px] w-[18px]" />
        </button> */}
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#b5bac1] transition hover:bg-white/[0.06] hover:text-white"
          title="Pinned messages"
          aria-label="Pinned messages"
        >
          <Pin className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Right: Search */}
      <div className="ml-auto flex min-w-0 shrink-0 items-center">
        {!connected && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] mr-2"
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
        <div className="group relative">
          <input
            type="text"
            placeholder="Search"
            onClick={onToggleSearch}
            className="h-9 w-64 rounded-lg border border-white/[0.06] bg-[#1e1f22] px-3 pr-9 text-sm text-slate-200 placeholder:text-[#72767d] outline-none transition-colors focus:border-[#FFC341]/40 focus:ring-1 focus:ring-[#FFC341]/20 cursor-pointer lg:w-72"
            aria-label="Search messages"
          />
          <Search className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#72767d] transition group-focus-within:text-[#FFC341]/60" />
          <InlineSearchDropdown
            isOpen={showSearch}
            onClose={onCloseSearch}
            onSearch={onSearch}
            onSelectResult={onSelectResult}
            placeholder="Search messages in this channel..."
            showChannelName={showChannelName}
            align="right"
          />
        </div>
      </div>
    </header>
  );
};

export default ChatHeader;
