"use client";

import React, { useMemo } from "react";
import { ChannelMessage } from "@/lib/channels/types";
import { groupMessagesForDisplay } from "@/lib/channels/messageUtils";
import { MessageGroup } from "./MessageGroup";
import { TypingIndicator } from "./TypingIndicator";

export interface MessageListProps {
  messages: ChannelMessage[];
  currentUserId: string;
  loadingMessages: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  isInitialLoadDone: boolean;
  unreadDividerIndex: number;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  registerRef?: (id: string | number, el: HTMLDivElement | null) => void;
  typingNames?: string[];
  renderContent: (message: ChannelMessage) => React.ReactNode;
  onReply: (message: ChannelMessage) => void;
  onProfileClick: (message: ChannelMessage) => void;
  onReplyPreviewClick: (id: string | number) => void;
}

const DayDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-4 my-4 px-4">
    <div className="flex-1 h-px bg-[#3f4248]" />
    <span className="rounded-full border border-[#3f4248] bg-[#2b2d31] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#949ba4] whitespace-nowrap">
      {label}
    </span>
    <div className="flex-1 h-px bg-[#3f4248]" />
  </div>
);

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  currentUserId,
  loadingMessages,
  loadingMore,
  hasMore,
  isInitialLoadDone,
  unreadDividerIndex,
  messagesEndRef,
  registerRef,
  typingNames = [],
  renderContent,
  onReply,
  onProfileClick,
  onReplyPreviewClick,
}) => {
  const sections = useMemo(
    () => groupMessagesForDisplay(messages, currentUserId),
    [messages, currentUserId]
  );

  const startIndexByGroup = useMemo(() => {
    const map: Record<string, number> = {};
    let counter = 0;

    for (const section of sections) {
      for (const group of section.groups) {
        map[group.key] = counter;
        counter += group.messages.length;
      }
    }

    return map;
  }, [sections]);

  return (
    <>
      {loadingMessages ? (
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 w-8 h-8 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin" />
          </div>
        </div>
      ) : isInitialLoadDone && messages.length === 0 ? (
        <div className="flex h-full items-center justify-center text-gray-500 text-sm">
          No messages yet. Say hi
        </div>
      ) : (
        <>
          {loadingMore && (
            <div className="flex justify-center py-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                <span className="text-gray-400 text-sm">
                  Loading older messages...
                </span>
              </div>
            </div>
          )}

          {!hasMore && messages.length > 0 && (
            <div className="flex justify-center py-4">
              <span className="text-gray-500 text-xs">
                Beginning of conversation
              </span>
            </div>
          )}

          {sections.map((section) => (
            <React.Fragment key={section.dayLabel}>
              <DayDivider label={section.dayLabel} />
              {section.groups.map((group) => (
                <MessageGroup
                  key={group.key}
                  group={group}
                  messageStartIndex={startIndexByGroup[group.key] ?? 0}
                  unreadDividerIndex={unreadDividerIndex}
                  registerRef={registerRef}
                  renderContent={renderContent}
                  onReply={onReply}
                  onProfileClick={onProfileClick}
                  onReplyPreviewClick={onReplyPreviewClick}
                />
              ))}
            </React.Fragment>
          ))}

          <TypingIndicator names={typingNames} />

          <div ref={messagesEndRef} />
        </>
      )}
    </>
  );
};

export default MessageList;
