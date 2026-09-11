"use client";

import { useCallback, useEffect, useRef } from "react";
import { logout } from "@/api/auth.api";
import { toast } from "@/components/toast/toastService";
import { useAppRouter } from "@/lib/navigation/useAppRouter";

export const INACTIVITY_TIMEOUT_MS = 1.5 * 60 * 60 * 1000;

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  "mousemove",
  "mousedown",
  "pointerdown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
];

export const useInactivityLogout = (enabled = true) => {
  const { goSafe } = useAppRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const reset = useCallback(() => {
    if (!enabledRef.current || typeof window === "undefined") return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      toast.warning("Signed out after 1.5 hours of inactivity.");
      void logout().catch(() => undefined);
      goSafe("/");
    }, INACTIVITY_TIMEOUT_MS);
  }, [goSafe]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const handleActivity = () => reset();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") reset();
    };

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, handleActivity, { passive: true })
    );
    window.addEventListener("visibilitychange", handleVisibility);

    reset();

    return () => {
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, handleActivity)
      );
      window.removeEventListener("visibilitychange", handleVisibility);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [enabled, reset]);
};