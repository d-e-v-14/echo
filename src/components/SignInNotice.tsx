"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "@/contexts/ToastContext";
import { useAppRouter } from "@/lib/navigation/useAppRouter";

export function SignInNotice() {
  const { goSafe } = useAppRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const expired = searchParams.get("session_expired") === "1";
    const signinRequired = searchParams.get("signin") === "1";
    if (!expired && !signinRequired) return;

    toast.warning(
      expired
        ? "Your session has expired. Please sign in again."
        : "You're not signed in. Please sign in to continue."
    );

    goSafe("/");
  }, [searchParams, goSafe]);

  return null;
}