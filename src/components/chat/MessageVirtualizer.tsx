"use client";

import React from "react";

export interface MessageVirtualizerProps {
  containerRef: React.RefObject<HTMLDivElement>;
  onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
  children: React.ReactNode;
}

export const MessageVirtualizer: React.FC<MessageVirtualizerProps> = ({
  containerRef,
  onScroll,
  children,
}) => {
  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className="relative flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900"
    >
      {children}
    </div>
  );
};

export default MessageVirtualizer;
