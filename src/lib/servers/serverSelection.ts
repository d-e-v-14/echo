export interface PreferredServerOptions {
  serverIdFromQuery?: string | null;
  persistedServerId?: string | null;
}

export function resolvePreferredServer<T extends { id: string }>(
  servers: T[],
  options: PreferredServerOptions = {}
): T | null {
  if (!Array.isArray(servers) || servers.length === 0) {
    return null;
  }

  return (
    servers.find((server) => server.id === options.serverIdFromQuery) ||
    servers.find((server) => server.id === options.persistedServerId) ||
    servers[0]
  );
}
