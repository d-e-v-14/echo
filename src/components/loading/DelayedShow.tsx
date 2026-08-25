"use client";

import React, { useEffect, useRef, useState } from "react";

export function useDelayedFlag(active: boolean, delayMs = 150): boolean {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!active) {
      setVisible(false);
      return;
    }

    if (delayMs <= 0) {
      setVisible(true);
      return;
    }

    timerRef.current = setTimeout(() => setVisible(true), delayMs);
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [active, delayMs]);

  return visible;
}

interface DelayedShowProps {
  show: boolean;
  delayMs?: number;
  children: React.ReactNode;
}

export function DelayedShow({ show, delayMs = 150, children }: DelayedShowProps) {
  const visible = useDelayedFlag(show, delayMs);
  if (!visible) return null;
  return <>{children}</>;
}

export default DelayedShow;
