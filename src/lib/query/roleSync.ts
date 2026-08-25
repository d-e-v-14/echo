import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";

export function invalidateServerPermissionQueries(
  queryClient: QueryClient,
  serverId: string
): void {
  const refetchOptions = { refetchType: "all" as const };

  queryClient.invalidateQueries({
    queryKey: queryKeys.serverRoles(serverId),
    ...refetchOptions,
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.myServerRoles(serverId),
    ...refetchOptions,
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.selfAssignableRoles(serverId),
    ...refetchOptions,
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.serverChannels(serverId),
    ...refetchOptions,
  });

  const channels = queryClient.getQueryData<{ id: string }[]>(
    queryKeys.serverChannels(serverId)
  );
  if (channels && channels.length > 0) {
    for (const channel of channels) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.channelPermissions(channel.id),
        ...refetchOptions,
      });
    }
    return;
  }

  invalidateAllCachedPermissions(queryClient);
}

export function invalidateAllCachedPermissions(queryClient: QueryClient): void {
  const refetchOptions = { refetchType: "all" as const };

  queryClient.invalidateQueries({
    queryKey: ["server"],
    ...refetchOptions,
  });
  queryClient.invalidateQueries({
    predicate: (query) => {
      const [first, , branch] = query.queryKey;
      return first === "channel" && branch === "permissions";
    },
    ...refetchOptions,
  });
}
