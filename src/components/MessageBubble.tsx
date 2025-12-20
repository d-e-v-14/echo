import React, { memo } from "react";

/* -------------------- TYPES -------------------- */

export interface ChatMessage {
  id?: string | number;
  content: string;
  replyTo?: {
    id: string | number;
    content: string;
    author?: string;
  } | null;
}

interface MessageBubbleProps {
  message: ChatMessage;
  name?: string;
  isSender?: boolean;
  avatarUrl?: string;
  timestamp?: string;
  onProfileClick?: () => void;
  onReply?: () => void;
  children?: React.ReactNode;
  messageRenderer?: (content: string) => React.ReactNode;
}

/* -------------------- COMPONENT -------------------- */

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  name,
  isSender = false,
  avatarUrl,
  timestamp,
  onProfileClick,
  onReply,
  children,
  messageRenderer,
}) => {
  const bubbleStyles = isSender
    ? "bg-gradient-to-br from-indigo-500/90 via-sky-500/80 to-cyan-400/70 text-white shadow-[0_12px_30px_rgba(14,165,233,0.25)]"
    : "bg-slate-800/80 text-slate-100 shadow-[0_12px_30px_rgba(15,23,42,0.35)]";

  const alignment = isSender ? "items-end text-right" : "items-start";
  const displayAvatar = avatarUrl || "/User_profil.png";

  return (
    <div className={`flex mb-3 ${isSender ? "justify-end" : "justify-start"}`}>
      {/* Left Avatar */}
      {!isSender && (
        <div className="w-8 h-8 mr-3 flex-shrink-0">
          <img
            src={displayAvatar}
            alt={name || "User"}
            onClick={onProfileClick}
            onError={(e) => (e.currentTarget.src = "/User_profil.png")}
            className="w-8 h-8 rounded-full object-cover cursor-pointer hover:scale-105 transition"
          />
        </div>
      )}

      {/* Message Body */}
      <div
        className={`flex flex-col gap-1 max-w-[75%] ${
          isSender ? "items-end" : "items-start"
        }`}
      >
        {/* Username */}
        {name && !isSender && (
          <span
            className="text-xs font-medium uppercase tracking-wide text-slate-400 px-1 cursor-pointer hover:text-slate-200 transition"
            onClick={onProfileClick}
          >
            {name}
          </span>
        )}

        {/* Reply Preview */}
        {message.replyTo && (
          <div className="px-3 py-2 text-xs text-slate-300 bg-black/30 rounded-lg border-l-4 border-blue-400">
            <span className="font-semibold">
              {message.replyTo.author || "User"}
            </span>
            : {message.replyTo.content}
          </div>
        )}

        {/* Message Bubble */}
        <div
          className={`
            px-4 py-3 w-fit
            max-w-full
            ${bubbleStyles}
            ${
              isSender
                ? "rounded-2xl rounded-br-md"
                : "rounded-2xl rounded-bl-md"
            }
          `}
        >
          {/* Message text */}
          <div
            className="
              text-sm leading-relaxed
              whitespace-pre-wrap
              break-all
            "
          >
            {messageRenderer
              ? messageRenderer(message.content)
              : message.content}
          </div>

          {children && <div className="mt-3">{children}</div>}

          {onReply && (
            <button
              onClick={onReply}
              className="mt-2 text-xs text-slate-400 hover:text-white transition"
            >
              Reply
            </button>
          )}
        </div>

        {/* Timestamp */}
        {timestamp && (
          <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500 px-1">
            {timestamp}
          </span>
        )}
      </div>

      {/* Right Avatar */}
      {isSender && (
        <div className="w-8 h-8 ml-3 flex-shrink-0">
          <img
            src={displayAvatar}
            alt="You"
            onError={(e) => (e.currentTarget.src = "/User_profil.png")}
            className="w-8 h-8 rounded-full object-cover"
          />
        </div>
      )}
    </div>
  );
};

export default memo(MessageBubble);
