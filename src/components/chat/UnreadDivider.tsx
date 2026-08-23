"use client";

import React from "react";

export interface UnreadDividerProps {
  label?: string;
}

export const UnreadDivider: React.FC<UnreadDividerProps> = ({
  label = "New Messages",
}) => {
  return (
    <div className="flex items-center my-4">
      <div className="flex-1 h-px bg-red-500" />
      <span className="mx-3 text-xs font-semibold uppercase tracking-wide text-red-400">
        {label}
      </span>
      <div className="flex-1 h-px bg-red-500" />
    </div>
  );
};

export default UnreadDivider;
