"use client";

import React from "react";
import clsx from "clsx";
import Skeleton from "./Skeleton";

export function SearchResultListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden className="animate-in space-y-2 opacity-70">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-slate-800/80 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
          <Skeleton className="mt-2 h-4 w-full rounded" />
        </div>
      ))}
    </div>
  );
}

export function FriendGridSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      aria-hidden
      className="animate-in grid grid-cols-1 gap-4 opacity-70 md:grid-cols-2 xl:grid-cols-3"
    >
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-12 w-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SettingsFormSkeleton({
  fields = 3,
  titleWidth = "w-48",
}: {
  fields?: number;
  titleWidth?: string;
}) {
  return (
    <div aria-hidden className={clsx("animate-in max-w-xl space-y-6 opacity-70")}>
      <Skeleton className={clsx("h-7 rounded", titleWidth)} />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-28 rounded" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>
      ))}
      <Skeleton className="h-9 w-28 rounded-md" />
    </div>
  );
}

export function ProfilePageSkeleton() {
  return (
    <div
      aria-hidden
      className="animate-in mx-auto flex min-h-screen max-w-4xl flex-col gap-8 px-10 py-12 opacity-70"
    >
      <div className="space-y-4">
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="flex items-end gap-6">
          <Skeleton className="-mt-16 h-32 w-32 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3 pb-2">
            <Skeleton className="h-6 w-56 rounded" />
            <Skeleton className="h-4 w-40 rounded" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 rounded-xl bg-white/[0.03] p-4">
            <Skeleton className="h-3.5 w-24 rounded" />
            <Skeleton className="h-4 w-full rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div aria-hidden className="flex h-screen w-full animate-in bg-black">
      <div className="w-64 shrink-0 space-y-4 border-r border-white/5 p-4">
        <Skeleton className="h-8 w-24 rounded" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-5 w-5 shrink-0 rounded" />
            <Skeleton className="h-4 flex-1 rounded" />
          </div>
        ))}
      </div>
      <div className="flex-1 space-y-5 p-6">
        <Skeleton className="h-7 w-64 rounded" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2 pt-1">
              <Skeleton className="h-3.5 w-1/3 rounded" />
              <Skeleton className="h-3.5 w-2/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RolePillSkeletons({ pills = 3 }: { pills?: number }) {
  return (
    <div aria-hidden className="flex flex-wrap gap-2 opacity-70">
      {Array.from({ length: pills }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx("h-6 rounded-full", i % 2 ? "w-20" : "w-14")}
        />
      ))}
    </div>
  );
}

export function MemberChipSkeletons({ chips = 4 }: { chips?: number }) {
  return (
    <div aria-hidden className="flex flex-wrap gap-1 opacity-70">
      {Array.from({ length: chips }).map((_, i) => (
        <Skeleton
          key={i}
          className={clsx("h-[22px] rounded", i % 2 ? "w-20" : "w-16")}
        />
      ))}
    </div>
  );
}
