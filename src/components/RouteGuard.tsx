"use client";

import { useEffect, useState } from "react";
import InlineSpinner from "@/components/loading/InlineSpinner";
import { tokenStore } from "@/lib/auth/tokenStore";
import { useAppRouter } from "@/lib/navigation/useAppRouter";
import { usePathname } from "next/navigation";
import { isSafePath } from "@/lib/navigation/paths";

export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { goSafe } = useAppRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const computeRedirect = () => {
      const current = `${window.location.pathname}${window.location.search}`;
      if (!isSafePath(current)) return null;
      if (/(?:^|&)(signin|session_expired)=1/.test(current)) return null;
      return current;
    };

    const checkAuth = async () => {
      if (!tokenStore.hasRefreshToken()) {
        const target = computeRedirect();
        goSafe(target ? `/?signin=1&next=${encodeURIComponent(target)}` : "/?signin=1");
        return;
      }
      const token = await tokenStore.ensureAccessToken();
      if (cancelled) return;
      if (!token) {
        goSafe("/?session_expired=1");
        return;
      }
      setReady(true);
    };

    void checkAuth();

    return () => {
      cancelled = true;
    };
  }, [goSafe, pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <InlineSpinner size="lg" label="Loading" />
      </div>
    );
  }

  return <>{children}</>;
}