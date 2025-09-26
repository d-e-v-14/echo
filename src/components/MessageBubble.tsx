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
  isSender = false,
  message,
  timestamp,
  children,
}) => {
  return (
    <div className={`flex ${isSender ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`flex flex-col items-${
          isSender ? "end" : "start"
        } max-w-[75%]`}
      >
        <div
          className={`px-4 py-2 rounded-xl ${
            isSender
              ? "bg-[#1e1f22] text-white rounded-br-none"
              : "bg-[#2b2d31] text-white rounded-bl-none"
          }`}
        >
          {message && <p className="text-sm">{message}</p>}
          {children && <div className={message ? "mt-2" : ""}>{children}</div>}
        </div>
        <span className="text-[10px] text-gray-400 mt-1">{timestamp}</span>
      </div>
    </div>
  );
};

export default MessageBubble;
