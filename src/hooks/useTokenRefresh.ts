// hooks/useTokenRefresh.ts
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { tokenStore } from "@/lib/auth/tokenStore";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

export const useTokenRefresh = (enabled = true) => {
  const router = useRouter();
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const handleLogout = () => {
      tokenStore.clear();
      sessionStorage.setItem("skipGlobalLoader", "1");
      if (!cancelled) router.push("/");
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

    // Restore the session by refreshing the in-memory access token, then keep
    // it fresh proactively.
    if (!tokenStore.hasRefreshToken()) return;

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
  }, [router, enabled]);
};

// Optional: Hook to check if user is authenticated
export const useAuth = () => {
  const router = useRouter();

  useEffect(() => {
    if (!tokenStore.hasRefreshToken()) {
      router.push("/");
      return;
    }

    tokenStore.ensureAccessToken().then((token) => {
      if (!token) {
        router.push("/");
      }
    });
  }, [router]);
};