import type { ToastItem, ToastOptions, ToastType } from "./types";

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3000,
  error: 5000,
  warning: 4000,
  info: 3000,
  loading: 0,
};

type Listener = (toasts: ToastItem[]) => void;

let toasts: ToastItem[] = [];
const listeners = new Set<Listener>();
let counter = 0;

const emit = () => {
  const snapshot = [...toasts];
  listeners.forEach((listener) => listener(snapshot));
};

const resolveDuration = (type: ToastType, duration?: number) =>
  duration !== undefined ? duration : DEFAULT_DURATIONS[type];

/**
 * Imperative toast API. Works outside React (interceptors, socket handlers,
 * token refresh), because the ToastProvider subscribes to this store.
 */
export function showToast(
  message: string,
  type: ToastType = "info",
  duration?: number
): string {
  // Collapse duplicate notifications that are already on screen so a single
  // failure (e.g. session expiry detected from two paths) never double-toasts.
  const existing = toasts.find(
    (t) => t.type === type && t.message === message
  );
  if (existing) {
    existing.createdAt = Date.now();
    emit();
    return existing.id;
  }

  const id = `toast-${Date.now()}-${counter++}`;
  toasts = [
    ...toasts,
    {
      id,
      type,
      message,
      duration: resolveDuration(type, duration),
      createdAt: Date.now(),
    },
  ];
  emit();
  return id;
}

export function updateToast(
  id: string,
  patch: Partial<Pick<ToastItem, "type" | "message" | "title" | "duration">>
) {
  toasts = toasts.map((t) => {
    if (t.id !== id) return t;
    const type = patch.type ?? t.type;
    const duration =
      patch.duration ?? (t.duration === 0 ? DEFAULT_DURATIONS[type] : t.duration);
    return { ...t, ...patch, type, duration };
  });
  emit();
}

export function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function dismissAll() {
  toasts = [];
  emit();
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getToasts(): ToastItem[] {
  return [...toasts];
}

export const toast = {
  success: (message: string, options?: ToastOptions) =>
    showToast(message, "success", options?.duration),
  error: (message: string, options?: ToastOptions) =>
    showToast(message, "error", options?.duration),
  warning: (message: string, options?: ToastOptions) =>
    showToast(message, "warning", options?.duration),
  info: (message: string, options?: ToastOptions) =>
    showToast(message, "info", options?.duration),
  loading: (message: string, options?: ToastOptions) =>
    showToast(message, "loading", options?.duration),
  update: updateToast,
  dismiss,
  dismissAll,
};