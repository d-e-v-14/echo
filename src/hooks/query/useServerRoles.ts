"use client";

import { useQuery } from "@tanstack/react-query";
import { getSelfAssignableRoles, getMyRoles } from "@/api/roles.api";
import { queryKeys } from "@/lib/query/keys";
import { policyForQueryKey } from "@/lib/query/cachePolicy";
import { EMPTY_ARRAY } from "@/lib/query/constants";
import type { Role } from "@/api/types/roles.types";

export interface UseServerRolesResult {
  selfAssignableRoles: Role[];
  myRoles: Role[];
  isLoading: boolean;
  isError: boolean;
}

interface RoleBundle {
  selfAssignableRoles: Role[];
  myRoles: Role[];
}

const fetchRoleBundle = async (serverId: string): Promise<RoleBundle> => {
  const [selfAssignableRoles, myRoles] = await Promise.all([
    getSelfAssignableRoles(serverId),
    getMyRoles(serverId),
  ]);
  return { selfAssignableRoles, myRoles };
};

export function useServerRoles(serverId?: string): UseServerRolesResult {
  const key = serverId ? queryKeys.serverRoles(serverId) : queryKeys.disabled;
  const policy = policyForQueryKey(key);
  const enabled = Boolean(serverId);

  const {
    data,
    isLoading,
    isError,
  } = useQuery<RoleBundle>({
    queryKey: key,
    queryFn: () => fetchRoleBundle(serverId as string),
    enabled,
    staleTime: policy.staleTimeMs,
    gcTime: policy.gcTimeMs,
  });

  return {
    selfAssignableRoles: data?.selfAssignableRoles ?? EMPTY_ARRAY,
    myRoles: data?.myRoles ?? EMPTY_ARRAY,
    isLoading: enabled && isLoading,
    isError,
  };
}
