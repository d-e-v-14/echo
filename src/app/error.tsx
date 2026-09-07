"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Uncaught page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center text-white">
      <p className="font-jersey text-6xl text-[#FFC341]">Oops</p>
      <p className="mt-3 text-lg font-semibold">Something went wrong</p>
      <p className="mt-1 max-w-md text-sm text-[#72767d]">
        An unexpected error occurred while loading this page. Please try again.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-gradient-to-r from-[#FFC341] to-[#FFD700] px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
        >
          Try Again
        </button>
        <a
          href="/"
          className="rounded-lg border border-white/[0.06] bg-[#18191c] px-4 py-2 text-sm font-medium text-[#b5bac1] transition hover:bg-[#23272a] hover:text-white"
        >
          Home
        </a>
      </div>
    </div>
  );
}