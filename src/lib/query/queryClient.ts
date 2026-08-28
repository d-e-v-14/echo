import { QueryClient } from "@tanstack/react-query";

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        retry: 1,
        // Avoid refetching the whole query set on every tab focus. Only refetch
        // queries whose data is at least 60s old (fresh data is kept in place),
        // and on reconnect only refetch the already-stale ones.
        refetchOnWindowFocus: (query) =>
          Date.now() - query.state.dataUpdatedAt >= 60_000,
        refetchOnReconnect: true,
      },
    },
  });
}
