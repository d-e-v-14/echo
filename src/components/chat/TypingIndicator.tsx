"use client";

import React from "react";

export interface TypingIndicatorProps {
  names: string[];
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ names }) => {
  if (names.length === 0) return null;

  const label =
    names.length === 1
      ? `${names[0]} is typing...`
      : names.length === 2
        ? `${names[0]} and ${names[1]} are typing...`
        : `${names.length} people are typing...`;

  return (
    <div className="px-4 py-1.5 flex items-center gap-2 text-sm text-[#949ba4] italic">
      <span className="flex gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-[#949ba4] animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#949ba4] animate-bounce [animation-delay:120ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#949ba4] animate-bounce [animation-delay:240ms]" />
      </span>
      <span>{label}</span>
    </div>
  );
};

export default TypingIndicator;
