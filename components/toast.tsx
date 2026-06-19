"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface ToastContextValue {
  show: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    setTimeout(() => setVisible(false), 2500);
  }, []);

  return (
    <ToastContext value={{ show }}>
      {children}
      {visible && (
        <div className="fixed left-1/2 top-20 z-[100] -translate-x-1/2 animate-fade-in rounded-lg border border-accent/20 bg-surface px-5 py-2.5 text-sm font-medium text-accent shadow-lg">
          {message}
        </div>
      )}
    </ToastContext>
  );
}
