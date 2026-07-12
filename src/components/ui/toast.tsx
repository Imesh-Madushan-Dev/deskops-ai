"use client";

import { useState, useCallback } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CheckmarkCircle02Icon, AlertCircleIcon } from "@hugeicons/core-free-icons";

export type ToastType = "success" | "error";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const toastContext = {
  listeners: new Set<(toast: Toast) => void>(),
  subscribe(cb: (toast: Toast) => void) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  },
  emit(toast: Toast) {
    this.listeners.forEach((cb) => cb(toast));
  },
};

export function toast(message: string, type: ToastType = "success") {
  const id = Math.random().toString(36).slice(2);
  toastContext.emit({ id, message, type });
  setTimeout(() => toastContext.emit({ id, message: "", type }), 4000);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const handleToast = useCallback((t: Toast) => {
    if (t.message) {
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4000);
    }
  }, []);

  toastContext.listeners.clear();
  toastContext.subscribe(handleToast);

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex gap-3 rounded-lg px-4 py-3 text-sm shadow-lg animate-in slide-in-from-right ${
            t.type === "success" ? "bg-[#059669] text-white" : "bg-destructive text-white"
          }`}
        >
          <HugeiconsIcon
            icon={t.type === "success" ? CheckmarkCircle02Icon : AlertCircleIcon}
            size={18}
            strokeWidth={2}
          />
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
