"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/lib/socket/SocketProvider";
import {
  REALTIME_CACHE_EVENTS,
  realtimeEventToCommands,
} from "@/lib/query/realtimeCache";
import type { CacheCommand } from "@/lib/query/cacheCommand.types";

const DEBOUNCE_MS = 250;

export function RealtimeCacheSync() {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  const pendingInvalidate = useRef<Set<string>>(new Set());
  const pendingRemove = useRef<Set<string>>(new Set());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!socket) return;

    const flush = () => {
      for (const key of pendingInvalidate.current) {
        queryClient.invalidateQueries({ queryKey: JSON.parse(key) });
      }
      for (const key of pendingRemove.current) {
        queryClient.removeQueries({ queryKey: JSON.parse(key) });
      }
      pendingInvalidate.current.clear();
      pendingRemove.current.clear();
    };

    const schedule = (commands: CacheCommand[]) => {
      for (const command of commands) {
        if (command.type === "invalidate") {
          for (const key of command.queryKeys) {
            pendingInvalidate.current.add(JSON.stringify(key));
          }
        } else {
          for (const key of command.queryKeys) {
            pendingRemove.current.add(JSON.stringify(key));
          }
        }
      }
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, DEBOUNCE_MS);
    };

    const handlers = REALTIME_CACHE_EVENTS.map<{
      name: string;
      handler: (...args: any[]) => void;
    }>((name) => {
      const handler = (payload: unknown) => {
        const commands = realtimeEventToCommands(name, payload);
        if (commands.length > 0) {
          schedule(commands);
        }
      };
      socket.on(name, handler as any);
      return { name, handler };
    });

    return () => {
      for (const { name, handler } of handlers) {
        socket.off(name, handler as any);
      }
      if (timer.current) clearTimeout(timer.current);
      pendingInvalidate.current.clear();
      pendingRemove.current.clear();
    };
  }, [socket, queryClient]);

  return null;
}
