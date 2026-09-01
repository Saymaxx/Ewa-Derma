'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import { clsx } from 'clsx';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, type, message, title };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => {
          const icons = {
            success: <CheckCircle2 className="w-5 h-5 text-status-success shrink-0" />,
            warning: <AlertTriangle className="w-5 h-5 text-status-warning shrink-0" />,
            error: <AlertCircle className="w-5 h-5 text-status-danger shrink-0" />,
            info: <Info className="w-5 h-5 text-status-info shrink-0" />,
          };

          const borders = {
            success: 'border-green-200 bg-white shadow-md',
            warning: 'border-amber-200 bg-white shadow-md',
            error: 'border-red-200 bg-white shadow-md',
            info: 'border-blue-200 bg-white shadow-md',
          };

          return (
            <div
              key={toast.id}
              className={clsx(
                'pointer-events-auto flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 animate-in slide-in-from-bottom-2',
                borders[toast.type],
              )}
            >
              {icons[toast.type]}
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <h4 className="text-sm font-semibold text-text-primary mb-0.5">
                    {toast.title}
                  </h4>
                )}
                <p className="text-xs text-text-secondary leading-relaxed">{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-text-muted hover:text-text-primary p-0.5 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
