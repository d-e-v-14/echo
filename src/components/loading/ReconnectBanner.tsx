"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/lib/socket/SocketProvider";
import { useDelayedFlag } from "./DelayedShow";

export function ReconnectBanner() {
  const { connected } = useSocket();
  const showAfterDelay = useDelayedFlag(!connected, 2500);

  const [everConnected, setEverConnected] = useState(false);

  useEffect(() => {
    if (connected) setEverConnected(true);
  }, [connected]);

  if (connected || !showAfterDelay || !everConnected) return null;

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
