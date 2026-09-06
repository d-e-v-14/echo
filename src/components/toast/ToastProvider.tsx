"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import ToastContainer from "./ToastContainer";
import {
  dismiss,
  getToasts,
  showToast,
  subscribe,
  toast,
} from "./toastService";
import type { ToastItem, ToastType } from "./types";

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => string;
  removeToast: (id: string) => void;
  toast: typeof toast;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    setToasts(getToasts());
    return subscribe(setToasts);
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast,
      removeToast: dismiss,
      toast,
    }),
    []
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}