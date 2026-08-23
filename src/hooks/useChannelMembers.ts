"use client";

import { useEffect, useMemo, useState } from "react";
import { getUser } from "@/api/profile.api";
import { getAllRoles } from "@/api/roles.api";
import { getServerMembers } from "@/api/server.api";
import { ChatRole } from "@/lib/channels/types";
import { normalizeRoleName, normalizeUsername } from "@/lib/channels/mentions";

export interface UseChannelMembersResult {
  currentUsername: string;
  serverRoles: ChatRole[];
  currentUserRoleIds: string[];
  validUsernames: Set<string>;
  validRoleNames: Set<string>;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export function useChannelMembers({
  serverId,
  currentUserId,
}: {
  serverId?: string;
  currentUserId: string;
}): UseChannelMembersResult {
  const [currentUsername, setCurrentUsername] = useState("");
  const [serverRoles, setServerRoles] = useState<ChatRole[]>([]);
  const [currentUserRoleIds, setCurrentUserRoleIds] = useState<string[]>([]);
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

    const seedMentionableUsernames = async () => {
      try {
        const members = await getServerMembers(serverId);
        const set = new Set<string>();

        for (const member of members ?? []) {
          const username = member?.users?.username;
          if (username) {
            set.add(normalizeUsername(username).toLowerCase());
          }
        }

        if (currentUsername) {
          set.add(normalizeUsername(currentUsername).toLowerCase());
        }

        if (!cancelled) setValidUsernames(set);
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
        const token = localStorage.getItem("access_token");
        if (!token) return;

        const res = await fetch(
          `${API_URL}/api/newserver/${serverId}/members/${currentUserId}`,
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

  return useMemo(
    () => ({
      currentUsername,
      serverRoles,
      currentUserRoleIds,
      validUsernames,
      validRoleNames,
    }),
    [
      currentUsername,
      serverRoles,
      currentUserRoleIds,
      validUsernames,
      validRoleNames,
    ]
  );
}
