"use client";

import Toast from "./Toast";
import type { ToastItem } from "./types";

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function ToastContainer({
  toasts,
  onDismiss,
}: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed right-4 top-4 z-[9999] flex w-[calc(100vw-2rem)] max-w-sm flex-col items-end gap-2 sm:right-6 sm:top-6"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      {toasts.map((item) => (
        <Toast key={item.id} item={item} onClose={() => onDismiss(item.id)} />
      ))}
    </div>
  );
}