"use client";

import { useState } from "react";
import type { PresenceStatus } from "./profile.types";

const DEFAULT_AVATAR = "/User_profil.png";

export const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name
    .trim()
    .split(/[^a-zA-Z0-9\u00C0-\u024F]/)
    .filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const PRESENCE_DOT_COLORS: Record<PresenceStatus, string> = {
  online: "#3ba55c",
  idle: "#FFC341",
  dnd: "#ed4245",
  offline: "#72767d",
};

interface ProfileAvatarProps {
  username?: string | null;
  avatarUrl?: string | null;
  presence?: PresenceStatus | null;
  size?: number;
}

export function ProfileAvatar({
  username,
  avatarUrl,
  presence,
  size = 80,
}: ProfileAvatarProps) {
  const [failed, setFailed] = useState(false);
  const hasRealAvatar =
    avatarUrl && avatarUrl !== DEFAULT_AVATAR && avatarUrl !== "/avatar.png";

  return (
    <div
      className="relative shrink-0 rounded-full ring-4 ring-[#111214]"
      style={{ width: size, height: size }}
    >
      {hasRealAvatar && !failed ? (
        <img
          src={avatarUrl as string}
          alt={username ?? "User avatar"}
          className="h-full w-full rounded-full bg-[#23272a] object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-full bg-[#23272a]">
          <span
            className="font-semibold tracking-widest text-[#b5bac1]"
            style={{ fontSize: Math.max(14, size / 3.4) }}
          >
            {getInitials(username ?? "?")}
          </span>
        </div>
      )}
      {presence && (
        <span
          aria-label={`Status: ${presence}`}
          className="absolute bottom-0 right-0 h-5 w-5 rounded-full border-4 border-[#111214]"
          style={{ backgroundColor: PRESENCE_DOT_COLORS[presence] }}
        />
      )}
    </div>
  );
}
