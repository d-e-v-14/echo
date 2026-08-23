// src/lib/socket/appSocket.ts
//
// Module-level handle to the single application-level socket, populated by
// <SocketProvider>. Non-React modules (e.g. voice presence) use this to emit
// on the shared socket instead of opening their own connection.

import type { Socket } from "socket.io-client";

let appSocket: Socket | null = null;

export function setAppSocket(socket: Socket | null): void {
  appSocket = socket;
}

export function getAppSocket(): Socket | null {
  return appSocket;
}
