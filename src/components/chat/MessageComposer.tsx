"use client";

import React from "react";
import { X, Paperclip } from "lucide-react";
import MessageInput from "@/components/MessageInput";
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
  onToast: (message: string, type: "info" | "success" | "error") => void;
  onTyping?: () => void;
}

const ReplyBanner: React.FC<{
  replyingTo: ChannelMessage;
  onCancel: () => void;
}> = ({ replyingTo, onCancel }) => {
  const content = replyingTo.content;
  const mediaUrl = replyingTo.mediaUrl;
  const mediaType = replyingTo.mediaType;

  return (
    <div className="mx-6 mb-2 px-4 py-2 bg-slate-800 rounded-lg flex items-center justify-between border-l-4 border-blue-500">
      <div className="flex items-center gap-2 min-w-0 text-sm text-slate-300">
        <span className="shrink-0">
          Replying to{" "}
          <span className="font-semibold">{replyingTo.username || "User"}</span>
          :
        </span>

        {content?.startsWith("[GIF]") ? (
          <img
            src={content.replace("[GIF]", "")}
            alt="GIF preview"
            className="h-10 w-10 rounded object-cover border border-slate-600 flex-shrink-0"
          />
        ) : isCodeBlock(content) ? (
          <div className="max-w-xs truncate rounded bg-slate-900 border border-slate-700 px-2 font-mono text-xs text-green-400">
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
                  className="h-9 w-9 flex-shrink-0 rounded object-cover border border-slate-600"
                />
              ) : (
                <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded border border-slate-600 bg-slate-800 text-slate-300">
                  <Paperclip className="h-4 w-4" />
                </span>
              ))}
            <span className="italic truncate">
              {content || (mediaUrl ? "Attachment" : "")}
            </span>
          </>
        )}
      </div>
      <button
        onClick={onCancel}
        className="ml-3 text-slate-400 hover:text-white"
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
  onToast,
  onTyping,
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
            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
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
        <div className="mb-3 p-4 bg-slate-800/70 border-2 border-slate-700 rounded-lg text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-2xl"></span>
            <span className="text-slate-300 font-semibold">
              {permissions.channelType === "read_only"
                ? "Read-Only Channel"
                : "Restricted Channel"}
            </span>
          </div>
          <p className="text-sm text-slate-400">
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
        />
      ) : (
        <MessageInput
          sendMessage={onSend}
          isSending={isSending}
          onToast={onToast}
          onTyping={onTyping}
        />
      )}
    </div>
  );
};

export default MessageComposer;
