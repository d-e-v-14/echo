"use client";

import { useEffect } from "react";
import { useAppRouter } from "@/lib/navigation/useAppRouter";
import { useToast } from "@/contexts/ToastContext";
export default function DashboardPage() {
  const { goSafe } = useAppRouter();
  const { showToast } = useToast();

  useEffect(() => {
    showToast("Please login to continue", "info", 4000);

    goSafe("/");
  }, [goSafe, showToast]);

  return null;
}
