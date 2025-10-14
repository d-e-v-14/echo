import React from "react";

interface Props {
  name?: string;
  isSender?: boolean;
  message: string;
  avatarUrl?: string;
  timestamp: string;
  children?: React.ReactNode; // Allow children to be passed
}

const MessageBubble: React.FC<Props> = ({
  name,
  isSender = false,
  message,
  avatarUrl,
  timestamp,
  children,
}) => {
  const bubbleStyles = isSender
    ? "bg-gradient-to-br from-indigo-500/90 via-sky-500/80 to-cyan-400/70 text-white shadow-[0_12px_30px_rgba(14,165,233,0.25)]"
    : "bg-slate-800/80 text-slate-100 shadow-[0_12px_30px_rgba(15,23,42,0.35)]";

  const containerAlignment = isSender ? "items-end text-right" : "items-start";

  return (
    <div className={`flex ${isSender ? "justify-end" : "justify-start"} mb-3 w-full`}>
      {/* Avatar for received messages - always reserve space */}
      <div className={`w-8 h-8 mr-3 flex-shrink-0 ${!isSender ? "flex" : "hidden"}`}>
        {!isSender && avatarUrl && (
          <img
            src={avatarUrl}
            alt={name || "User"}
            className="w-8 h-8 rounded-full object-cover"
          />
        )}
      </div>
      
      {/* Message content container */}
      <div className={`flex flex-col max-w-[min(32rem,65%)] ${containerAlignment} gap-1 ${isSender ? "ml-auto" : "mr-auto"}`}>
        {name && !isSender && (
          <span className="text-xs font-medium uppercase tracking-wide text-slate-400 px-1">
            {name}
          </span>
        )}
        <div className={`message-bubble px-4 py-3 ${bubbleStyles} ${
          isSender 
            ? "rounded-2xl rounded-br-md" 
            : "rounded-2xl rounded-bl-md"
        }`}>
          {message && <p className="text-sm leading-relaxed break-words">{message}</p>}
          {children && <div className={message ? "mt-3" : ""}>{children}</div>}
        </div>
        {timestamp && (
          <span className={`text-[10px] font-medium uppercase tracking-wide text-slate-500 px-1 ${
            isSender ? "text-right" : "text-left"
          }`}>
            {timestamp}
          </span>
        )}
      </div>
      
      {/* Avatar for sent messages */}
      <div className={`w-8 h-8 ml-3 flex-shrink-0 ${isSender ? "flex" : "hidden"}`}>
        {isSender && avatarUrl && (
          <img
            src={avatarUrl}
            alt={name || "You"}
            className="w-8 h-8 rounded-full object-cover"
          />
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
