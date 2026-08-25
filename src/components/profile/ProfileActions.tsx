"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  LogOut,
  MoreHorizontal,
  Pencil,
  Send,
  UserMinus,
  UserPlus,
} from "lucide-react";
import type { RelationshipStatus } from "./profile.types";

export interface ProfileMenuItem {
  label: string;
  icon?: React.ReactNode;
  danger?: boolean;
  onSelect: () => void;
}

interface ProfileActionsProps {
  userId: string;
  username?: string;
  isOwnProfile: boolean;
  relationshipStatus?: RelationshipStatus;
  relationshipLoading?: boolean;
  friendActionLoading?: boolean;
  onAddFriend?: () => void | Promise<void>;
  onRemoveFriend?: () => void | Promise<void>;
  onMessage?: () => void;
  menuItems?: ProfileMenuItem[];
}const buttonBase =
  "flex h-9 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFC341]/50 disabled:cursor-not-allowed disabled:opacity-50";

const secondaryButton = `${buttonBase} border border-white/[0.06] bg-[#18191c] text-[#b5bac1] hover:bg-[#23272a] hover:text-white`;

const primaryButton = `${buttonBase} bg-gradient-to-r from-[#FFC341] to-[#FFD700] text-black hover:opacity-90`;

const dangerMenuItem =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#ed4245] transition-colors hover:bg-[#ed4245]/10";

const menuItem =
  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#b5bac1] transition-colors hover:bg-white/[0.06] hover:text-white";

export function ProfileActions({
  userId,
  username,
  isOwnProfile,
  relationshipStatus,
  relationshipLoading,
  friendActionLoading = false,
  onAddFriend,
  onRemoveFriend,
  onMessage,
  menuItems = [],
}: ProfileActionsProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleMessageClick = () => {
    if (onMessage) {
      onMessage();
      return;
    }
    router.push(`/messages?dm=${userId}`);
  };

  const handleCopyId = async () => {
    setMenuOpen(false);
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  const showRelationshipButton =
    !isOwnProfile && relationshipStatus !== undefined && !relationshipLoading;

  return (
    <div className="flex items-center gap-2">
      {!isOwnProfile && (
        <button
          type="button"
          onClick={handleMessageClick}
          className={`${secondaryButton} flex-1 px-3`}
          aria-label={`Message ${username ?? "user"}`}
        >
          <Send className="h-4 w-4" />
          <span>Message</span>
        </button>
      )}

      {isOwnProfile && (
        <button
          type="button"
          onClick={() => router.push("/profile-settings")}
          className={`${primaryButton} flex-1 px-3`}
        >
          <Pencil className="h-4 w-4" />
          <span>Edit Profile</span>
        </button>
      )}

      {showRelationshipButton && relationshipStatus === "none" && (
        <button
          type="button"
          onClick={() => void onAddFriend?.()}
          disabled={friendActionLoading}
          className={`${secondaryButton} flex-1 px-3`}
        >
          <UserPlus className="h-4 w-4" />
          <span>{friendActionLoading ? "Sending..." : "Add Friend"}</span>
        </button>
      )}

      {showRelationshipButton && relationshipStatus === "pending" && (
        <div
          className={`${secondaryButton} flex-1 cursor-default px-3 opacity-70`}
          aria-disabled
        >
          <Check className="h-4 w-4" />
          <span>Pending</span>
        </div>
      )}

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className={`${secondaryButton} w-9 px-0`}
          aria-label="More actions"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full z-20 mt-1 w-44 animate-slide-up-fade rounded-lg border border-white/[0.06] bg-[#1e1f22] py-1 shadow-xl"
          >
            <button
              type="button"
              role="menuitem"
              onClick={() => void handleCopyId()}
              className={copied ? dangerMenuItem : menuItem}
            >
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy User ID"}
            </button>

            {showRelationshipButton && relationshipStatus === "accepted" && (
              <button
                type="button"
                role="menuitem"
                disabled={friendActionLoading}
                onClick={() => {
                  setMenuOpen(false);
                  void onRemoveFriend?.();
                }}
                className={`${dangerMenuItem} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                <UserMinus className="h-4 w-4" />
                {friendActionLoading ? "Removing..." : "Remove Friend"}
              </button>
            )}

            {menuItems.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  item.onSelect();
                }}
                className={
                  item.danger ? `${dangerMenuItem}` : menuItem
                }
              >
                {item.icon ?? <LogOut className="h-4 w-4" />}
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { buttonBase, secondaryButton, primaryButton, menuItem };
