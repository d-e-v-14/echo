"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";
import { handleOAuthLogin } from "@/api";
import { tokenStore } from "@/lib/auth/tokenStore";
import InlineSpinner from "@/components/loading/InlineSpinner";
import { toast } from "@/contexts/ToastContext";
import { getAuthErrorMessage } from "@/components/toast/errorNormalizer";

export default function OAuthCallback() {
  const router = useRouter();
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
              if (!cancelled) router.push("/");
            }, 3000)
          );
          return;
        }

        const response = await handleOAuthLogin(
          session.access_token,
          session.refresh_token
        );

        tokenStore.setTokens({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          expiresIn: session.expires_in || 3600,
        });
        tokenStore.setUser(response.user);

        toast.update(loadingToast, {
          type: "success",
          message: "Welcome back!",
        });

        const redirect =
          localStorage.getItem("redirectAfterLogin") || "/servers";
        localStorage.removeItem("redirectAfterLogin");

        timers.push(
          setTimeout(() => {
            if (!cancelled) router.replace(redirect);
          }, 1000)
        );
      } catch (err) {
        toast.update(loadingToast, {
          type: "error",
          message: getAuthErrorMessage(err),
        });
        setError(true);

        timers.push(
          setTimeout(() => {
            if (!cancelled) router.push("/");
          }, 3000)
        );
      }
    };

    void handleOAuthCallback();

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [router]);

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
