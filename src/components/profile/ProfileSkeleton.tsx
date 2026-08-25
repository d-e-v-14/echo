"use client";

import React from "react";

export function ProfileSkeleton({ variant = "popout" }: { variant?: "popout" | "page" }) {
  const avatarSize = variant === "popout" ? 80 : 96;

  return (
    <div className="pointer-events-none select-none">
      <div className="skeleton h-24 w-full sm:h-28" />
      <div className="px-4 pb-4">
        <div className="-mt-10 w-fit">
          <div
            className="skeleton shrink-0 rounded-full ring-4 ring-[#111214]"
            style={{ width: avatarSize, height: avatarSize }}
          />
        </div>
        <div className="mt-3 space-y-2">
          <div className="skeleton h-5 w-36 rounded" />
          <div className="skeleton h-3.5 w-24 rounded" />
        </div>
        <div className="mt-4 flex gap-2">
          <div className="skeleton h-9 flex-1 rounded-lg" />
          <div className="skeleton h-9 flex-1 rounded-lg" />
          <div className="skeleton h-9 w-9 rounded-lg" />
        </div>
      </div>
      <div className="mx-3 mb-3 space-y-4 rounded-xl bg-[#18191c] p-3">
        <div className="space-y-2">
          <div className="skeleton h-3 w-16 rounded" />
          <div className="skeleton h-3.5 w-full rounded" />
          <div className="skeleton h-3.5 w-3/4 rounded" />
        </div>
        <div className="space-y-2">
          <div className="skeleton h-3 w-20 rounded" />
          <div className="flex gap-1.5">
            <div className="skeleton h-6 w-20 rounded-full" />
            <div className="skeleton h-6 w-24 rounded-full" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="skeleton h-3 w-24 rounded" />
          <div className="skeleton h-3.5 w-28 rounded" />
        </div>
      </div>
    </div>
  );
}
