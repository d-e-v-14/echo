"use client";

import { useQuery } from "@tanstack/react-query";
import {
  fetchAllFriends,
  fetchProfile,
  fetchServerMemberProfile,
  fetchUserProfile,
  searchUsers,
} from "@/api";
import { queryKeys } from "@/lib/query/keys";
import { policyForQueryKey } from "@/lib/query/cachePolicy";
import type {
  PresenceStatus,
  ProfileCardUser,
  ProfileRole,
  RelationshipStatus,
} from "./profile.types";

const PRESENCE_VALUES: PresenceStatus[] = ["online", "idle", "dnd", "offline"];

const asString = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const normalizePresence = (value: unknown): PresenceStatus | null => {
  if (typeof value === "boolean") return value ? "online" : "offline";
  const raw = asString(value)?.toLowerCase();
  if (!raw) return null;
  if (raw === "do_not_disturb" || raw === "dnd") return "dnd";
  return PRESENCE_VALUES.find((v) => v === raw) ?? null;
};

export const normalizeRole = (role: any): ProfileRole | null => {
  if (typeof role === "string") {
    return role.trim() ? { id: role, name: role } : null;
  }
  const name = asString(role?.name);
  if (!name) return null;
  return {
    id: String(role.id ?? role.role_id ?? name),
    name,
    color: asString(role.color),
  };
};

export function normalizeProfileUser(payload: any): ProfileCardUser | null {
  if (!payload || typeof payload !== "object") return null;

  const u = payload.user ?? payload.users ?? payload;
  const id = asString(u.id ?? payload.id);
  const username = asString(u.username ?? payload.username);
  if (!id && !username) return null;

  const rolesRaw = payload.roles ?? u.roles;
  const roles = Array.isArray(rolesRaw)
    ? rolesRaw
        .map(normalizeRole)
        .filter((role): role is ProfileRole => role !== null)
    : undefined;

  const statusText =
    asString(u.custom_status ?? payload.custom_status) ??
    asString(u.status ?? payload.status);
  const presenceFromStatus = normalizePresence(statusText);

  return {
    id: id ?? username ?? "",
    username: username ?? id ?? "",
    displayName: asString(u.fullname ?? payload.fullname ?? u.display_name),
    avatarUrl:
      asString(u.avatar_url ?? payload.avatar_url ?? u.avatarUrl) ?? null,
    bannerUrl:
      asString(u.banner_url ?? payload.banner_url ?? u.bannerUrl) ?? null,
    bio: asString(u.bio ?? payload.bio ?? u.about ?? payload.about),
    pronouns: asString(u.pronouns ?? payload.pronouns),
    customStatus: presenceFromStatus ? null : statusText,
    createdAt: asString(u.created_at ?? payload.created_at),
    presence:
      normalizePresence(u.presence ?? payload.presence ?? u.is_online) ??
      presenceFromStatus,
    roles: roles && roles.length > 0 ? roles : undefined,
  };
}

function memberProfileQueryFn(
  serverId: string,
  userId: string
): Promise<ProfileCardUser | null> {
  return fetchServerMemberProfile(serverId, userId)
    .then(async (memberPayload) => {
      const member = normalizeProfileUser(memberPayload);
      if (!member) return null;

      const missingGlobalFields =
        !member.createdAt && !member.bio && !member.displayName;
      if (!missingGlobalFields) return member;

      try {
        const globalPayload = await fetchUserProfile(userId);
        const global = normalizeProfileUser(globalPayload);
        if (!global) return member;
        return {
          ...global,
          avatarUrl: member.avatarUrl ?? global.avatarUrl,
          roles: member.roles ?? global.roles,
          presence: member.presence ?? global.presence,
        };
      } catch {
        return member;
      }
    })
    .catch(() => null);
}

export function useProfileCardData(userId?: string, serverId?: string) {
  const key = userId
    ? serverId
      ? ([...queryKeys.server(serverId), "member", userId] as const)
      : queryKeys.userProfile(userId)
    : queryKeys.disabled;
  const policy = policyForQueryKey(key);

  return useQuery<ProfileCardUser | null>({
    queryKey: key,
    queryFn: async () => {
      if (!userId) throw new Error("userId is required");
      if (serverId) return memberProfileQueryFn(serverId, userId);
      const payload = await fetchUserProfile(userId);
      return normalizeProfileUser(payload);
    },
    enabled: Boolean(userId),
    staleTime: policy.staleTimeMs,
    gcTime: policy.gcTimeMs,
  });
}

export function useSelfProfile() {
  return useQuery<ProfileCardUser | null>({
    queryKey: queryKeys.me,
    queryFn: async () => normalizeProfileUser(await fetchProfile()),
    staleTime: policyForQueryKey(queryKeys.me).staleTimeMs,
    gcTime: policyForQueryKey(queryKeys.me).gcTimeMs,
  });
}

export function useProfileRelationship(
  userId?: string,
  username?: string,
  enabled = true
) {
  return useQuery<RelationshipStatus>({
    queryKey: [...queryKeys.friends, "relationship", userId],
    queryFn: async () => {
      if (!userId) throw new Error("userId is required");
      const [friends, results] = await Promise.all([
        fetchAllFriends(),
        username ? searchUsers(username).catch(() => []) : Promise.resolve([]),
      ]);
      if (friends.some((friend: any) => friend.id === userId)) {
        return "accepted";
      }
      const match = results.find((result) => result.id === userId);
      return (match?.relationshipStatus as RelationshipStatus) ?? "none";
    },
    enabled: enabled && Boolean(userId),
    staleTime: 30_000,
    gcTime: policyForQueryKey(queryKeys.friends).gcTimeMs,
  });
}
