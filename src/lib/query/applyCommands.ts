import type { QueryClient } from "@tanstack/react-query";
import type { CacheCommand } from "@/lib/query/cacheCommand.types";

export function applyCacheCommand(
  queryClient: QueryClient,
  command: CacheCommand
): void {
  switch (command.type) {
    case "invalidate":
      for (const queryKey of command.queryKeys) {
        queryClient.invalidateQueries({ queryKey });
      }
      break;
    case "remove":
      for (const queryKey of command.queryKeys) {
        queryClient.removeQueries({ queryKey });
      }
      break;
  }
}

export function applyCacheCommands(
  queryClient: QueryClient,
  commands: readonly CacheCommand[]
): void {
  for (const command of commands) {
    applyCacheCommand(queryClient, command);
  }
}
