
import type { Socket } from "socket.io-client";

let appSocket: Socket | null = null;

export function setAppSocket(socket: Socket | null): void {
  appSocket = socket;
}

export function getAppSocket(): Socket | null {
  return appSocket;
}
