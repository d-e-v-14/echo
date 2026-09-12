"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { handleOAuthLogin } from "@/api";
import { tokenStore } from "@/lib/auth/tokenStore";
import InlineSpinner from "@/components/loading/InlineSpinner";
import { toast } from "@/contexts/ToastContext";
import { getAuthErrorMessage } from "@/components/toast/errorNormalizer";
import { useAppRouter } from "@/lib/navigation/useAppRouter";
import { buildPath } from "@/lib/navigation/paths";

export default function OAuthCallback() {
  const { goSafe } = useAppRouter();
  const [error, setError] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    let cancelled = false;

    const handleOAuthCallback = async () => {
      const loadingToast = toast.loading("Signing you in…");

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError || !session) {
          toast.update(loadingToast, {
            type: "error",
            message: "Unable to sign in. Please try again.",
          });
          setError(true);
          timers.push(
            setTimeout(() => {
              if (!cancelled) goSafe("/");
            }, 3000)
          );
          return;
        }

        const response = await handleOAuthLogin(
          session.access_token,
          session.refresh_token,
          session.expires_in
        );

        tokenStore.setUser(response.user);

        toast.update(loadingToast, {
          type: "success",
          message: "Welcome back!",
        });

        const redirect =
          localStorage.getItem("redirectAfterLogin") || buildPath("SERVERS");
        localStorage.removeItem("redirectAfterLogin");

        timers.push(
          setTimeout(() => {
            if (!cancelled) goSafe(redirect);
          }, 1000)
        );
      } catch (err) {
        const backendError = (
          err as {
            response?: { data?: { code?: string; message?: string } };
          }
        )?.response?.data;

        const notRegistered = backendError?.code === "NOT_REGISTERED";

        if (notRegistered) {
          try {
            await supabase.auth.signOut();
          } catch {
            // Best-effort: clearing the local Supabase session must not stop
            // the not-registered message from showing.
          }
        }

        toast.update(loadingToast, {
          type: "error",
          message: notRegistered
            ? backendError?.message || "You are not registered with us."
            : getAuthErrorMessage(err),
        });
        setError(true);

        timers.push(
          setTimeout(() => {
            if (!cancelled) goSafe("/");
          }, 3000)
        );
      }
    };

    void handleOAuthCallback();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [goSafe]);

  return (
    <>
      <div className="flex h-screen bg-black font-sans items-center justify-center">
        <div className="text-center">
          <div className="mb-6">
            <div className="relative inline-block">
              <div className="font-jersey text-[64px] font-normal text-white">
                echo
              </div>
              <svg
                width="13"
                height="34"
                className="absolute left-[116px] top-[34px]"
                fill="none"
              >
                <path
                  d="M2 2C14.2659 13.7159 13.7311 20.2841 2 32"
                  stroke="white"
                  strokeWidth="4"
                />
              </svg>
              <svg
                width="16"
                height="46"
                className="absolute left-[120px] top-[28px]"
                fill="none"
              >
                <path
                  d="M2 2C18.3545 18.4022 17.6415 27.5977 2 44"
                  stroke="white"
                  strokeWidth="4"
                />
              </svg>
            </div>
          </div>

          {!error && (
            <div className="mb-4">
              <InlineSpinner size="lg" className="mx-auto" label="Signing in" />
            </div>
          )}

          {error && (
            <p className="text-gray-400 mt-2 text-sm">
              Redirecting to signin page...
            </p>
          )}
        </div>
      </div>
    </>
  );
}
