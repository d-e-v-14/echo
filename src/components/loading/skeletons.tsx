"use client";

import React from "react";
import clsx from "clsx";
import Skeleton from "./Skeleton";
import DelayedShow from "./DelayedShow";

const BUBBLE_WIDTHS = ["w-2/3", "w-1/2", "w-3/4", "w-5/12"] as const;

function MessageRow({
  isSender,
  showName,
  lineCount,
  widthSeed,
}: {
  isSender: boolean;
  showName: boolean;
  lineCount: number;
  widthSeed: number;
}) {
  return (
    <div className={clsx("flex mb-3", isSender ? "justify-end" : "justify-start")}>
      {!isSender && <Skeleton className="mr-2 h-8 w-8 shrink-0 rounded-full" />}
      <div
        className={clsx(
          "flex max-w-[75%] flex-col gap-1",
          isSender ? "items-end" : "items-start"
        )}
      >
        {showName && !isSender && <Skeleton className="ml-1 h-3 w-20 rounded" />}
        <div
          className={clsx(
            "w-fit space-y-1.5 rounded-lg px-4 py-2.5",
            isSender ? "bg-white/[0.05]" : "bg-white/[0.03]"
          )}
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <Skeleton
              key={i}
              className={clsx(
                "h-3.5 rounded",
                BUBBLE_WIDTHS[(widthSeed + i) % BUBBLE_WIDTHS.length]
              )}
            />
          ))}
        </div>
      </div>
      {isSender && <div className="ml-3 h-8 w-8 shrink-0" />}
    </div>
  );
}

export function MessageListSkeleton({
  count = 6,
  delayMs = 150,
}: {
  count?: number;
  delayMs?: number;
}) {
  return (
    <DelayedShow show delayMs={delayMs}>
      <div aria-hidden className="h-full w-full animate-in px-6 pt-6 opacity-70">
        {Array.from({ length: count }).map((_, i) => (
          <MessageRow
            key={i}
            isSender={i % 3 === 1}
            showName={i === 0 || i % 3 === 2}
            lineCount={(i % 3) + 1}
            widthSeed={i}
          />
        ))}
      </div>
    </DelayedShow>
  );
}

export function LoadingOlderMessagesSkeleton() {
  return (
    <div aria-hidden className="space-y-2 px-6 pb-4 pt-1 opacity-60">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-start">
          <Skeleton className="mr-2 h-8 w-8 shrink-0 rounded-full" />
          <div className={clsx("w-full", i === 0 ? "max-w-[45%]" : "max-w-[60%]")}>
            <Skeleton className="h-3.5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ConversationListSkeleton({ rows = 7 }: { rows?: number }) {
  return (
    <ul aria-hidden className="animate-in space-y-2 opacity-70">
      {Array.from({ length: rows }).map((_, idx) => (
        <li
          key={idx}
          className="rounded-xl border border-slate-800/60 bg-slate-900/50 p-3"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-1/2 rounded-full" />
              <Skeleton className="h-3 w-3/4 rounded-full" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ServerRailSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div aria-hidden className="animate-in space-y-3 opacity-80">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-12 rounded-full" />
      ))}
    </div>
  );
}

export function ChannelListSkeleton({
  textRows = 4,
  voiceRows = 2,
}: {
  textRows?: number;
  voiceRows?: number;
}) {
  return (
    <div aria-hidden className="animate-in space-y-1.5 opacity-80">
      <Skeleton className="mb-2 h-3 w-16 rounded" />
      {Array.from({ length: textRows }).map((_, i) => (
        <Skeleton key={`t-${i}`} className="h-8 rounded-md" />
      ))}
      <Skeleton className="mb-2 mt-4 h-3 w-20 rounded" />
      {Array.from({ length: voiceRows }).map((_, i) => (
        <Skeleton key={`v-${i}`} className="h-8 rounded-md" />
      ))}
    </div>
  );
}
