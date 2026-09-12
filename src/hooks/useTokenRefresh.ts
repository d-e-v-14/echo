import { useEffect, useRef } from "react";
import { logout } from "@/api/auth.api";
import { tokenStore } from "@/lib/auth/tokenStore";
import { toast } from "@/components/toast/toastService";
import { useAppRouter } from "@/lib/navigation/useAppRouter";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export const useTokenRefresh = (enabled = true) => {
  const { goSafe } = useAppRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const handleLogout = () => {
      void logout()
        .catch(() => undefined)
        .finally(() => {
          sessionStorage.setItem("skipGlobalLoader", "1");
          toast.warning("Your session has expired. Please sign in again.");
          if (!cancelled) goSafe("/");
        });
    };

    const schedule = () => {
      if (cancelled) return;
      const expiry = tokenStore.getAccessTokenExpiry();
      if (expiry == null) return;

      const refreshIn = expiry - Date.now() - REFRESH_BUFFER_MS;

      if (refreshIn > 0) {
        refreshTimerRef.current = setTimeout(async () => {
          const ok = await tokenStore.refresh();
          if (cancelled) return;
          if (ok) {
            schedule();
          } else {
            handleLogout();
          }
        }, refreshIn);
      } else {
        tokenStore.refresh().then((ok) => {
          if (cancelled) return;
          if (ok) {
            schedule();
          } else {
            handleLogout();
          }
        });
      }
    };

    if (!tokenStore.hasSession()) return;

    tokenStore.refresh().then((ok) => {
      if (cancelled) return;
      if (ok) {
        schedule();
      } else {
        handleLogout();
      }
    });

    return () => {
      cancelled = true;
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, [goSafe, enabled]);
};