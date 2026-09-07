"use client";

import { useEffect } from "react";
import { useAppRouter } from "@/lib/navigation/useAppRouter";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { goHome } = useAppRouter();

  useEffect(() => {
    console.error("Uncaught page error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center px-4 py-16 text-center text-white">
      <p className="font-jersey text-5xl text-[#FFC341]">Oops</p>
      <p className="mt-3 text-base font-semibold">Something went wrong</p>
      <p className="mt-1 max-w-md text-sm text-[#72767d]">
        An unexpected error occurred while loading this page.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-gradient-to-r from-[#FFC341] to-[#FFD700] px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
        >
          Try Again
        </button>
        <button
          type="button"
          onClick={goHome}
          className="rounded-lg border border-white/[0.06] bg-[#18191c] px-4 py-2 text-sm font-medium text-[#b5bac1] transition hover:bg-[#23272a] hover:text-white"
        >
          Home
        </button>
      </div>
    </div>
  );
}