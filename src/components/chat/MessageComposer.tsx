"use client";

import React from "react";
import { X, Paperclip } from "lucide-react";
import MessageInputWithMentions from "@/components/MessageInputWithMentions";
import {
  ChannelPermissions,
  ChatRole,
  ChannelMessage,
} from "@/lib/channels/types";
import { isCodeBlock, isReplyImage } from "@/lib/channels/messageUtils";

export interface MessageComposerProps {
  permissions: ChannelPermissions | null;
  permissionError: string | null;
  serverId?: string;
  serverRoles: ChatRole[];
  isSending: boolean;
  replyingTo: ChannelMessage | null;
  onCancelReply: () => void;
  unreadMentionCount: number;
  onJumpToNextMention: () => void;
  onSend: (text: string, files: File[]) => void;
  onTyping?: () => void;
  placeholder?: string;
}

const ReplyBanner: React.FC<{
  replyingTo: ChannelMessage;
  onCancel: () => void;
}> = ({ replyingTo, onCancel }) => {
  const content = replyingTo.content;
  const mediaUrl = replyingTo.mediaUrl;
  const mediaType = replyingTo.mediaType;

  return (
    <div className="mx-6 mb-2 px-4 py-2 bg-[#23272a] rounded-lg flex items-center justify-between border-l-4 border-[#FFC341]">
      <div className="flex items-center gap-2 min-w-0 text-sm text-slate-300">
        <span className="shrink-0">
          Replying to{" "}
          <span className="font-semibold text-[#FFC341]">{replyingTo.username || "User"}</span>
          :
        </span>

        {content?.startsWith("[GIF]") ? (
          <img
            src={content.replace("[GIF]", "")}
            alt="GIF preview"
            className="h-10 w-10 rounded object-cover border border-[#23272a] flex-shrink-0"
          />
        ) : isCodeBlock(content) ? (
          <div className="max-w-xs truncate rounded bg-[#111214] border border-[#23272a] px-2 font-mono text-xs text-green-400">
            {
              (content.match(/```(?:\w+)?\n?([\s\S]*?)```/)?.[1] || "")
                .trim()
                .split("\n")[0]
            }
          </div>
        ) : (
          <>
            {mediaUrl &&
              (isReplyImage(mediaUrl, mediaType) ? (
                <img
                  src={mediaUrl}
                  alt="Reply attachment"
                  className="h-9 w-9 flex-shrink-0 rounded object-cover border border-[#23272a]"
                />
              ) : (
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded border border-[#23272a] bg-[#111214] text-[#72767d]">
                  <Paperclip className="h-4 w-4" />
                </span>
              ))}
            <span className="italic truncate text-slate-400">
              {content || (mediaUrl ? "Attachment" : "")}
            </span>
          </>
        )}
      </div>
      <button
        onClick={onCancel}
        className="ml-3 text-[#72767d] hover:text-white transition-colors"
        aria-label="Cancel reply"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export const MessageComposer: React.FC<MessageComposerProps> = ({
  permissions,
  permissionError,
  serverId,
  serverRoles,
  isSending,
  replyingTo,
  onCancelReply,
  unreadMentionCount,
  onJumpToNextMention,
  onSend,
  onTyping,
  placeholder,
}) => {
  return (
    <div className="flex-shrink-0 px-0">
      {permissionError && (
        <div className="mx-6 mb-2 px-4 py-3 bg-red-900/50 border border-red-500 rounded-lg flex items-center gap-3">
          <span className="text-red-400 text-xl"></span>
          <div className="text-sm text-red-200 flex-1">{permissionError}</div>
        </div>
      )}

      {replyingTo && (
        <ReplyBanner replyingTo={replyingTo} onCancel={onCancelReply} />
      )}

      {unreadMentionCount > 0 && (
        <div className="mb-2">
          <button
            onClick={onJumpToNextMention}
            className="w-full px-4 py-2 bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black font-bold rounded-lg flex items-center justify-center gap-2 transition-colors hover:-translate-y-0.5"
          >
            <span className="text-lg">@</span>
            <span className="font-medium">
              {unreadMentionCount} unread mention
              {unreadMentionCount !== 1 ? "s" : ""}
            </span>
            <span className="text-xs opacity-75">Click to jump</span>
          </button>
        </div>
      )}

      {permissions && !permissions.canSend ? (
        <div className="mb-3 p-4 bg-[#23272a]/70 border-2 border-[#23272a] rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl"></span>
            <span className="text-slate-300 font-semibold">
              {permissions.channelType === "read_only"
                ? "Read-Only Channel"
                : "Restricted Channel"}
            </span>
          </div>
          <p className="text-sm text-[#72767d]">
            {permissions.channelType === "read_only"
              ? "Only admins and moderators can send messages in this channel."
              : "You need specific roles to send messages here."}
          </p>
        </div>
      ) : serverId ? (
        <MessageInputWithMentions
          sendMessage={onSend}
          isSending={isSending}
          serverId={serverId}
          serverRoles={serverRoles}
          onTyping={onTyping}
          placeholder={placeholder}
        />
      ) : null}
    </div>
  );
};

export default MessageComposer;
