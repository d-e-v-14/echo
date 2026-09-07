export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface ToastOptions {
  duration?: number;
  title?: string;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
  createdAt: number;
}