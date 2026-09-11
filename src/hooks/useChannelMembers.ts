"use client";

import { useEffect, useMemo, useState } from "react";
import { getUser } from "@/api/profile.api";
import { getAllRoles } from "@/api/roles.api";
import { getServerMembers } from "@/api/server.api";
import { apiClient } from "@/api/axios";
import { Role } from "@/api/types/roles.types";
import { ChatRole } from "@/lib/channels/types";
import { normalizeRoleName, normalizeUsername } from "@/lib/channels/mentions";
import {
  getHighestPriorityRoleColor,
  normalizeRoleColor,
} from "@/lib/channels/roleColors";
import { tokenStore } from "@/lib/auth/tokenStore";
import { buildApiUrl } from "@/lib/apiUrl";

export interface UseChannelMembersResult {
  currentUsername: string;
  serverRoles: ChatRole[];
  currentUserRoleIds: string[];
  validUsernames: Set<string>;
  validRoleNames: Set<string>;
  memberRoleColors: Record<string, string>;
}

export function useChannelMembers({
  serverId,
  currentUserId,
}: {
  serverId?: string;
  currentUserId: string;
}): UseChannelMembersResult {
  const [currentUsername, setCurrentUsername] = useState("");
  const [serverRoles, setServerRoles] = useState<Role[]>([]);
  const [currentUserRoleIds, setCurrentUserRoleIds] = useState<string[]>([]);
  const [memberRoleIds, setMemberRoleIds] = useState<
    Record<string, string[]>
  >({});
  const [serverOwnerId, setServerOwnerId] = useState<string | null>(null);
  const [validUsernames, setValidUsernames] = useState<Set<string>>(
    () => new Set()
  );
  const [validRoleNames, setValidRoleNames] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const user = await getUser();
        if (!cancelled && user?.username) {
          setCurrentUsername(user.username);
        }
      } catch {}
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!serverId) return;

    let cancelled = false;

    const load = async () => {
      const roles = await getAllRoles(serverId);
      if (!cancelled) setServerRoles(roles || []);
    };

    load().catch(() => {
      if (!cancelled) setServerRoles([]);
    });

    return () => {
      cancelled = true;
    };
  }, [serverId]);

  useEffect(() => {
    if (!serverId) return;

    let cancelled = false;

    const loadServerOwner = async () => {
      try {
        const res = await apiClient.get(`/api/newserver/${serverId}`);
        if (!cancelled) setServerOwnerId(res.data?.owner_id ?? null);
      } catch {
        if (!cancelled) setServerOwnerId(null);
      }
    };

    loadServerOwner();

    return () => {
      cancelled = true;
    };
  }, [serverId]);

  useEffect(() => {
    if (!serverId) return;

    let cancelled = false;

    const seedMentionableUsernames = async () => {
      try {
        const members = await getServerMembers(serverId);
        const set = new Set<string>();
        const roleIdsByUser: Record<string, string[]> = {};

        for (const member of members ?? []) {
          const username = member?.users?.username;
          if (username) {
            set.add(normalizeUsername(username).toLowerCase());
          }

          const userId = member?.user_id || member?.users?.id;
          if (userId) {
            roleIdsByUser[userId] = (member?.user_roles || [])
              .map((userRole: any) => userRole?.roles?.id || userRole?.role_id)
              .filter(Boolean);
          }
        }

        if (currentUsername) {
          set.add(normalizeUsername(currentUsername).toLowerCase());
        }

        if (!cancelled) {
          setValidUsernames(set);
          setMemberRoleIds(roleIdsByUser);
        }
      } catch {}
    };

    seedMentionableUsernames();

    return () => {
      cancelled = true;
    };
  }, [serverId, currentUsername]);

  useEffect(() => {
    const set = new Set<string>();
    for (const role of serverRoles) {
      if (!role?.name) continue;
      set.add(normalizeRoleName(role.name));
    }
    setValidRoleNames(set);
  }, [serverRoles]);

  useEffect(() => {
    if (!serverId || !currentUserId) return;

    let cancelled = false;

    const loadMyServerRoles = async () => {
      try {
        const token = await tokenStore.ensureAccessToken();
        if (!token) return;

        const res = await fetch(
          buildApiUrl(`/api/newserver/${serverId}/members/${currentUserId}`),
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) return;

        const data = await res.json();
        if (!cancelled) {
          setCurrentUserRoleIds(
            (data.roles?.map((r: any) => r.id) || []).filter(Boolean)
          );
        }
      } catch {}
    };

    loadMyServerRoles();

    return () => {
      cancelled = true;
    };
  }, [serverId, currentUserId]);

  const memberRoleColors = useMemo(() => {
    const rolesById = new Map<string, Role>();
    for (const role of serverRoles) {
      rolesById.set(role.id, role);
    }

    const ownerColor = normalizeRoleColor(
      serverRoles.find((role) => role.role_type === "owner")?.color
    );

    const colors: Record<string, string> = {};
    for (const [userId, roleIds] of Object.entries(memberRoleIds)) {
      if (serverOwnerId && userId === serverOwnerId && ownerColor) {
        colors[userId] = ownerColor;
        continue;
      }

      const color = getHighestPriorityRoleColor(roleIds, rolesById);
      if (color) colors[userId] = color;
    }

    return colors;
  }, [serverRoles, memberRoleIds, serverOwnerId]);

  return useMemo(
    () => ({
      currentUsername,
      serverRoles,
      currentUserRoleIds,
      validUsernames,
      validRoleNames,
      memberRoleColors,
    }),
    [
      currentUsername,
      serverRoles,
      currentUserRoleIds,
      validUsernames,
      validRoleNames,
      memberRoleColors,
    ]
  );
}
