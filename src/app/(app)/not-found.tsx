"use client";

import { useAppRouter } from "@/lib/navigation/useAppRouter";

export default function AppNotFound() {
  const { goBack, goHome } = useAppRouter();

  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center text-white">
      <p className="font-jersey text-6xl text-[#FFC341]">404</p>
      <p className="mt-3 text-lg font-semibold">Not found</p>
      <p className="mt-1 max-w-md text-sm text-[#72767d]">
        This channel, conversation, or resource doesn&apos;t exist or you no
        longer have access to it.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          className="rounded-lg bg-gradient-to-r from-[#FFC341] to-[#FFD700] px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
        >
          Back
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