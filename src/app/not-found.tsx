"use client";

import { useAppRouter } from "@/lib/navigation/useAppRouter";
import AppLink from "@/components/navigation/AppLink";

export default function NotFound() {
  const { goBack } = useAppRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4 text-center text-white">
      <p className="font-jersey text-7xl text-[#FFC341]">404</p>
      <p className="mt-3 text-lg font-semibold">Invalid page</p>
      <p className="mt-1 text-sm text-[#72767d]">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={goBack}
          className="rounded-lg bg-gradient-to-r from-[#FFC341] to-[#FFD700] px-4 py-2 text-sm font-medium text-black transition hover:opacity-90"
        >
          Back
        </button>
        <AppLink
          to="HOME"
          className="rounded-lg border border-white/[0.06] bg-[#18191c] px-4 py-2 text-sm font-medium text-[#b5bac1] transition hover:bg-[#23272a] hover:text-white"
        >
          Home
        </AppLink>
      </div>
    </div>
  );
}