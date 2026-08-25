"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/contexts/ToastContext";
export default function DashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();

  useEffect(() => {
    showToast("Please login to continue", "info", 4000);

    router.replace("/");
  }, [router, showToast]);

  return null;
}
