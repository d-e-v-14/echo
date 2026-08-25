"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { addFriend, removeFriend } from "@/api";
import { queryKeys } from "@/lib/query/keys";
import { ProfileBanner } from "./ProfileBanner";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProfileIdentity } from "./ProfileIdentity";
import { ProfileAbout } from "./ProfileAbout";
import { ProfileMemberSince } from "./ProfileMemberSince";
import { ProfileRoles } from "./ProfileRoles";
import {
  ProfileActions,
  type ProfileMenuItem,
} from "./ProfileActions";
import { ProfileSkeleton } from "./ProfileSkeleton";
import type {
  ProfileCardFallback,
  ProfileCardUser,
  RelationshipStatus,
} from "./profile.types";
import {
  useProfileCardData,
  useProfileRelationship,
} from "./useProfileData";

export type { ProfileMenuItem };

export interface UserProfileCardProps {
  isOpen?: boolean;
  onClose?: () => void;
  user: ProfileCardFallback | null;
  serverId?: string;
  currentUserId?: string;
  currentUsername?: string;
  relationshipStatus?: RelationshipStatus;
  friendActionLoading?: boolean;
  onAddFriend?: (userId: string) => void | Promise<void>;
  onRemoveFriend?: (userId: string) => void | Promise<void>;
  menuItems?: ProfileMenuItem[];
  variant?: "popout" | "page";
}

export function UserProfileCard({
  isOpen = true,
  onClose,
  user,
  serverId,
  currentUserId,
  currentUsername,
  relationshipStatus: externalRelationshipStatus,
  friendActionLoading = false,
  onAddFriend,
  onRemoveFriend,
  menuItems,
  variant = "popout",
}: UserProfileCardProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [internalActionLoading, setInternalActionLoading] = useState(false);

  const userId = user?.id;
  const {
    data: fetchedUser,
    isLoading: isLoadingProfile,
  } = useProfileCardData(userId ?? undefined, serverId);

  const mergedUser: ProfileCardUser | null = useMemo(() => {
    if (!user?.id) return null;
    const f = fetchedUser;
    return {
      id: user.id,
      username: f?.username || user.username || "",
      displayName: f?.displayName ?? user.displayName ?? null,
      avatarUrl: f?.avatarUrl ?? user.avatarUrl ?? null,
      bannerUrl: f?.bannerUrl ?? null,
      bio: f ? f.bio ?? "" : user.bio ?? null,
      pronouns: f?.pronouns ?? null,
      customStatus: f?.customStatus ?? null,
      createdAt: f?.createdAt ?? null,
      presence: f?.presence ?? null,
      roles: f?.roles ?? [],
    };
  }, [user, fetchedUser]);

  const isOwnProfile = useMemo(() => {
    if (!mergedUser) return false;
    if (currentUserId && mergedUser.id === currentUserId) return true;
    return Boolean(
      mergedUser.username &&
        currentUsername &&
        mergedUser.username.toLowerCase() === currentUsername.toLowerCase()
    );
  }, [mergedUser, currentUserId, currentUsername]);

  const shouldResolveRelationship =
    externalRelationshipStatus === undefined &&
    !isOwnProfile &&
    variant === "popout";

  const relationshipQuery = useProfileRelationship(
    shouldResolveRelationship ? userId : undefined,
    mergedUser?.username,
    shouldResolveRelationship
  );

  const activeRelationshipStatus: RelationshipStatus | undefined =
    externalRelationshipStatus ?? relationshipQuery.data;

  const relationshipLoading =
    shouldResolveRelationship && relationshipQuery.isPending;

  const isFriendActionLoading =
    friendActionLoading || internalActionLoading;

  useEffect(() => {
    setActionError(null);
  }, [userId]);

  useEffect(() => {
    if (!isOpen || !onClose || variant !== "popout") return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, variant]);

  const runFriendAction = useCallback(
    async (
      externalHandler: ((id: string) => void | Promise<void>) | undefined,
      apiCall: () => Promise<unknown>
    ) => {
      if (!userId) return;
      setInternalActionLoading(true);
      setActionError(null);
      try {
        if (externalHandler) {
          await externalHandler(userId);
        } else {
          await apiCall();
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.friends });
      } catch (error: any) {
        setActionError(
          error?.response?.data?.message ||
            error?.response?.data?.error ||
            "Something went wrong. Please try again."
        );
      } finally {
        setInternalActionLoading(false);
      }
    },
    [userId, queryClient]
  );

  const handleMessageClick = useCallback(() => {
    if (!userId) return;
    onClose?.();
    setTimeout(() => router.push(`/messages?dm=${userId}`), 150);
  }, [userId, onClose, router]);

  if (variant === "popout" && (!isOpen || !user)) return null;

  if (!user) return null;

  const loading = !mergedUser?.username;
  const sectionsLoading = isLoadingProfile && !fetchedUser;
  const cardWidthClass =
    variant === "popout" ? "w-full max-w-[340px]" : "w-full max-w-lg";
  const avatarSize = variant === "popout" ? 80 : 96;

  const card = (
    <div
      role="dialog"
      aria-modal={variant === "popout" || undefined}
      aria-label={
        mergedUser?.username ? `${mergedUser.username}'s profile` : "User profile"
      }
      className={`${cardWidthClass} ${
        variant === "popout"
          ? "max-h-[calc(100vh-3rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-[#3f4248]"
          : ""
      } animate-slide-up-fade overflow-x-hidden rounded-2xl border border-white/[0.06] bg-[#111214] font-poppins text-white shadow-2xl`}
    >
      {loading ? (
        <ProfileSkeleton variant={variant} />
      ) : (
        <>
          <div className="relative">
            <ProfileBanner url={mergedUser?.bannerUrl} alt={mergedUser?.username} />
            {variant === "popout" && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close profile"
                className="absolute right-2 top-2 rounded-full bg-black/40 p-1.5 text-[#b5bac1] transition hover:bg-black/60 hover:text-white"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>

          <div className="px-4 pb-4">
            <div className="-mt-10 w-fit">
              <ProfileAvatar
                username={mergedUser?.username}
                avatarUrl={mergedUser?.avatarUrl}
                presence={mergedUser?.presence}
                size={avatarSize}
              />
            </div>

            <div className="pt-3">
              <ProfileIdentity
                displayName={mergedUser?.displayName}
                username={mergedUser?.username || "Unknown User"}
                pronouns={mergedUser?.pronouns}
                customStatus={mergedUser?.customStatus}
                presence={mergedUser?.presence}
              />

              {actionError && (
                <p className="mt-2 rounded-lg border border-[#ed4245]/30 bg-[#ed4245]/10 px-3 py-1.5 text-xs text-[#ed4245]">
                  {actionError}
                </p>
              )}

              <div className="mt-3">
                <ProfileActions
                  userId={mergedUser?.id ?? ""}
                  username={mergedUser?.username}
                  isOwnProfile={isOwnProfile}
                  relationshipStatus={activeRelationshipStatus}
                  relationshipLoading={
                    relationshipLoading ||
                    (shouldResolveRelationship && !activeRelationshipStatus)
                  }
                  friendActionLoading={isFriendActionLoading}
                  onAddFriend={() =>
                    runFriendAction(onAddFriend, () => addFriend(mergedUser!.id))
                  }
                  onRemoveFriend={() =>
                    runFriendAction(
                      onRemoveFriend,
                      () => removeFriend(mergedUser!.id)
                    )
                  }
                  onMessage={handleMessageClick}
                  menuItems={menuItems}
                />
              </div>
            </div>
          </div>

          <div className="mx-3 mb-3 space-y-4 rounded-xl bg-[#18191c]/80 p-3.5 ring-1 ring-white/[0.04]">
            <ProfileAbout bio={mergedUser?.bio} loading={sectionsLoading} />

            {serverId && (
              <ProfileRoles
                roles={mergedUser?.roles}
                loading={sectionsLoading}
              />
            )}

            <ProfileMemberSince createdAt={mergedUser?.createdAt} />
          </div>
        </>
      )}
    </div>
  );

  if (variant === "page") return card;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 px-4 py-6 backdrop-blur-sm animate-fade-in"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      {card}
    </div>
  );
}
