"use client";

import React from "react";
import type { PresenceStatus } from "./profile.types";

interface ProfileIdentityProps {
  displayName?: string | null;
  username: string;
  pronouns?: string | null;
  customStatus?: string | null;
  presence?: PresenceStatus | null;
}

export function ProfileIdentity({
  displayName,
  username,
  pronouns,
  customStatus,
  presence,
}: ProfileIdentityProps) {
  const name = displayName || username;

  return (
    <div className="min-w-0 flex-1">
      <h2 className="truncate text-xl font-semibold leading-tight text-white">
        {name}
      </h2>
      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 text-sm text-[#b5bac1]">
        <span className="truncate">{username}</span>
        {pronouns && (
          <>
            <span className="text-[#72767d]" aria-hidden>
              •
            </span>
            <span className="truncate text-[#72767d]">{pronouns}</span>
          </>
        )}
      </div>
      {(customStatus || presence) && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#b5bac1]/90">
          {presence && (
            <span
              aria-hidden
              className={
                presence === "online"
                  ? "h-2 w-2 shrink-0 rounded-full bg-[#3ba55c]"
                  : presence === "idle"
                    ? "h-2 w-2 shrink-0 rounded-full bg-[#FFC341]"
                    : presence === "dnd"
                      ? "h-2 w-2 shrink-0 rounded-full bg-[#ed4245]"
                      : "h-2 w-2 shrink-0 rounded-full bg-[#72767d]"
              }
            />
          )}
          {customStatus && (
            <span className="min-w-0 truncate" title={customStatus}>
              {customStatus}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
