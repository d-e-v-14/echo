"use client";

import React from "react";
import clsx from "clsx";

const sizeMap = {
  xs: "h-3 w-3 border-[1.5px]",
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-8 w-8 border-[3px]",
} as const;

export interface InlineSpinnerProps {
  size?: keyof typeof sizeMap;
  className?: string;
  label?: string;
}

export function InlineSpinner({
  size = "sm",
  className,
  label,
}: InlineSpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label || "Loading"}
      className={clsx(
        "inline-block animate-spin rounded-full border-white/15 border-t-[#FFC341]",
        sizeMap[size],
        className
      )}
    />
  );
}

export default InlineSpinner;
