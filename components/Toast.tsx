"use client";

import { useEffect, useState } from "react";

interface ToastData {
  id: number;
  message: string;
  type: "success" | "error" | "info";
}

let addToastFn: ((message: string, type?: "success" | "error" | "info") => void) | null = null;

export function showToast(message: string, type: "success" | "error" | "info" = "success") {
  addToastFn?.(message, type);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  useEffect(() => {
    addToastFn = (message, type = "success") => {
      const id = Date.now();
      setToasts((prev) => [...prev, { id, message, type }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3000);
    };
    return () => { addToastFn = null; };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-slide-up rounded-2xl px-5 py-3 text-sm font-semibold shadow-lg backdrop-blur-md ${
            t.type === "success"
              ? "bg-gradient-to-r from-emerald-400 to-teal-500 text-white shadow-emerald-200"
              : t.type === "error"
              ? "bg-gradient-to-r from-rose-400 to-pink-500 text-white shadow-rose-200"
              : "bg-gradient-to-r from-[#6c5ce7] to-[#a29bfe] text-white shadow-purple-200"
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}
