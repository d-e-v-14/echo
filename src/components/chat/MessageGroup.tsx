"use client";

import React from "react";
import MessageBubble from "@/components/MessageBubble";
import MessageAttachment from "@/components/MessageAttachment";
import {
  MessageGroup as MessageGroupData,
  ChannelMessage,
} from "@/lib/channels/types";
import { UnreadDivider } from "./UnreadDivider";

export interface MessageGroupProps {
  group: MessageGroupData;
  messageStartIndex: number;
  unreadDividerIndex: number;
  registerRef?: (id: string | number, el: HTMLDivElement | null) => void;
  renderContent: (message: ChannelMessage) => React.ReactNode;
  onReply: (message: ChannelMessage) => void;
  onProfileClick: (message: ChannelMessage) => void;
  onReplyPreviewClick: (id: string | number) => void;
  onRetryMessage?: (message: ChannelMessage) => void;
  onDiscardMessage?: (message: ChannelMessage) => void;
  onDeleteMessage?: (message: ChannelMessage) => void;
  onReportMessage?: (message: ChannelMessage) => void;
}

export const MessageGroup: React.FC<MessageGroupProps> = ({
  group,
  messageStartIndex,
  unreadDividerIndex,
  registerRef,
  renderContent,
  onReply,
  onProfileClick,
  onReplyPreviewClick,
  onRetryMessage,
  onDiscardMessage,
  onDeleteMessage,
  onReportMessage,
}) => {
  return (
    <>
      {group.messages.map((msg, index) => {
        const absoluteIndex = messageStartIndex + index;
        const showUnreadDivider = unreadDividerIndex === absoluteIndex;

        return (
          <React.Fragment key={msg.id}>
            {showUnreadDivider && <UnreadDivider />}
            <div
              ref={(el) => registerRef?.(msg.id, el)}
              data-message-id={msg.id}
            >
              <MessageBubble
                message={{
                  id: msg.id,
                  content: msg.content,
                  replyTo: msg.replyTo || null,
                  status: msg.status,
                  pendingAttachment: msg.pendingAttachment,
                }}
                name={index === 0 ? group.name : undefined}
                isSender={group.isSender}
                avatarUrl={group.avatarUrl}
                timestamp={msg.timeLabel}
                onProfileClick={() =>
                  group.isSender ? undefined : onProfileClick(msg)
                }
                onReply={() => onReply(msg)}
                onReplyPreviewClick={onReplyPreviewClick}
                onRetry={onRetryMessage ? () => onRetryMessage(msg) : undefined}
                onDiscard={
                  onDiscardMessage ? () => onDiscardMessage(msg) : undefined
                }
                onDelete={
                  onDeleteMessage ? () => onDeleteMessage(msg) : undefined
                }
                onReport={
                  onReportMessage && !group.isSender
                    ? () => onReportMessage(msg)
                    : undefined
                }
                showPinAction={!!msg.id && !String(msg.id).startsWith("temp-")}
                messageRenderer={() => renderContent(msg)}
              >
                {msg.mediaUrl && <MessageAttachment media_url={msg.mediaUrl} />}
              </MessageBubble>
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
};

export default MessageGroup;
