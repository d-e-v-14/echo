"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/lib/socket/SocketProvider";
import { useDelayedFlag } from "./DelayedShow";

export function ReconnectBanner() {
  const { connected, connectionFailed, retryConnect } = useSocket();
  const showAfterDelay = useDelayedFlag(!connected, 2500);

  const [everConnected, setEverConnected] = useState(false);

  useEffect(() => {
    if (connected) setEverConnected(true);
  }, [connected]);

  if (connected || !showAfterDelay || !everConnected) return null;

  if (connectionFailed) {
    return (
      <div className="fixed left-1/2 top-3 z-[9998] -translate-x-1/2">
        <div className="flex items-center gap-2 rounded-full border border-red-500/40 bg-[#1e1f22]/95 py-1.5 pl-4 pr-1.5 text-xs text-red-300 shadow-lg shadow-black/40 animate-in">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
          </span>
          <span>Couldn&apos;t reconnect</span>
          <button
            type="button"
            onClick={retryConnect}
            className="rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-0.5 font-medium text-red-200 transition-colors hover:bg-red-500/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed left-1/2 top-3 z-[9998] -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-[#1e1f22]/95 px-4 py-1.5 text-xs text-amber-300 shadow-lg shadow-black/40 animate-in">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
        </span>
        <span>Reconnecting</span>
      </div>
    </div>
  );
}

export default ReconnectBanner;
