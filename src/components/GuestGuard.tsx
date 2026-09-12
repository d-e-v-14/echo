"use client";

import { useEffect, useState } from "react";
import InlineSpinner from "@/components/loading/InlineSpinner";
import { tokenStore } from "@/lib/auth/tokenStore";
import { useAppRouter } from "@/lib/navigation/useAppRouter";
import { buildPath, isSafePath } from "@/lib/navigation/paths";

export function GuestGuard({ children }: { children: React.ReactNode }) {
  const { goSafe } = useAppRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const checkAuth = async () => {
      // Recovery links land on "/" with a hash session; let the page handle
      // them rather than forwarding to the app.
      const hashParams = new URLSearchParams(
        window.location.hash.replace(/^#/, "")
      );
      if (hashParams.has("access_token") || hashParams.get("type") === "recovery") {
        setReady(true);
        return;
      }

      // A session-expired/signin notice is already on screen; don't fight it.
      const params = new URLSearchParams(window.location.search);
      if (
        params.get("session_expired") === "1" ||
        params.get("signin") === "1"
      ) {
        setReady(true);
        return;
      }

      // Probe the session even without a localStorage token: there may be a
      // valid httpOnly cookie session that ensureAccessToken() can fall back
      // to. This mirrors RouteGuard so both guards agree on what "signed in"
      // means, and warms the in-memory access token before navigating so
      // RouteGuard on the destination resolves synchronously.
      const token = await tokenStore.ensureAccessToken();
      if (cancelled) return;

      if (token) {
        const stored = localStorage.getItem("redirectAfterLogin");
        localStorage.removeItem("redirectAfterLogin");
        const target =
          stored && isSafePath(stored) ? stored : buildPath("SERVERS");
        goSafe(target);
        return;
      }

      tokenStore.clear();
      setReady(true);
    };

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, [goSafe]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <InlineSpinner size="lg" label="Loading" />
      </div>
    );
  }

  return <>{children}</>;
}
