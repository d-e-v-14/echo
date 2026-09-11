"use client";

import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
  XCircle,
} from "lucide-react";
import type { ToastItem } from "./types";

const EXIT_MS = 220;

const TOAST_CONFIG = {
  success: {
    Icon: CheckCircle2,
    iconColor: "text-[#3ba55c]",
  },
  error: {
    Icon: XCircle,
    iconColor: "text-[#ed4245]",
  },
  warning: {
    Icon: AlertTriangle,
    iconColor: "text-amber-400",
  },
  info: {
    Icon: Info,
    iconColor: "text-[#FFC341]",
  },
  loading: {
    Icon: Loader2,
    iconColor: "text-[#FFC341]",
  },
} as const;

interface ToastProps {
  item: ToastItem;
  onClose: () => void;
}

export default function Toast({ item, onClose }: ToastProps) {
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { Icon, iconColor } = TOAST_CONFIG[item.type];
  const sticky = item.duration <= 0;
  const isAlert = item.type === "error" || item.type === "warning";

  useEffect(() => {
    if (sticky) return;
    timerRef.current = setTimeout(() => {
      setExiting(true);
      timerRef.current = setTimeout(onClose, EXIT_MS);
    }, item.duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [item.duration, item.id, sticky, onClose]);

  const handleClose = () => {
    if (exiting) return;
    setExiting(true);
    setTimeout(onClose, EXIT_MS);
  };

  return (
    <div
      role={isAlert ? "alert" : "status"}
      aria-live={isAlert ? "assertive" : "polite"}
      className={`pointer-events-auto w-full overflow-hidden rounded-lg border border-white/10 bg-[#1e1f22]/95 shadow-2xl shadow-black/40 backdrop-blur-md ${
        exiting ? "animate-toast-out" : "animate-toast-in"
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <Icon
          className={`mt-0.5 h-5 w-5 shrink-0 ${iconColor} ${
            item.type === "loading" ? "animate-spin" : ""
          }`}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          {item.title && (
            <p className="text-sm font-semibold text-white">{item.title}</p>
          )}
          <p
            className={`break-words text-sm leading-snug ${
              item.title ? "text-[#b5bac1]" : "text-white"
            }`}
          >
            {item.message}
          </p>
        </div>
        <button
          type="button"
          onClick={handleClose}
          aria-label="Dismiss notification"
          className="shrink-0 rounded p-1 text-[#72767d] transition hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}