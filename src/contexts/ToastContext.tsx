import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastVariant = 'default' | 'success' | 'destructive' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

export interface ToastContextType {
  toasts: ToastItem[];
  showToast: (options: ToastOptions) => string;
  dismissToast: (id: string) => void;
  toast: {
    (options: ToastOptions): string;
    success: (title: string, description?: string, duration?: number) => string;
    error: (title: string, description?: string, duration?: number) => string;
    warning: (title: string, description?: string, duration?: number) => string;
    info: (title: string, description?: string, duration?: number) => string;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    ({ title, description, variant = 'default', duration = 4000 }: ToastOptions) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: ToastItem = { id, title, description, variant, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }

      return id;
    },
    [dismissToast]
  );

  const toastMethods = useMemo(() => {
    const fn = (options: ToastOptions) => showToast(options);
    fn.success = (title: string, description?: string, duration?: number) =>
      showToast({ title, description, variant: 'success', duration });
    fn.error = (title: string, description?: string, duration?: number) =>
      showToast({ title, description, variant: 'error', duration });
    fn.warning = (title: string, description?: string, duration?: number) =>
      showToast({ title, description, variant: 'warning', duration });
    fn.info = (title: string, description?: string, duration?: number) =>
      showToast({ title, description, variant: 'info', duration });
    return fn;
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, dismissToast, toast: toastMethods }}>
      {children}
      {/* Toast Container */}
      <div
        aria-live="polite"
        className="fixed bottom-4 right-4 z-50 flex max-h-screen w-full max-w-sm flex-col gap-2 p-4 sm:bottom-6 sm:right-6"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            role="alert"
            className={`group pointer-events-auto flex w-full items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 animate-in slide-in-from-bottom-5 ${
              item.variant === 'error' || item.variant === 'destructive'
                ? 'border-red-500/30 bg-red-950/80 text-red-100 shadow-red-950/50'
                : item.variant === 'success'
                ? 'border-emerald-500/30 bg-slate-900/90 text-emerald-100 shadow-emerald-950/50'
                : item.variant === 'warning'
                ? 'border-amber-500/30 bg-amber-950/80 text-amber-100 shadow-amber-950/50'
                : 'border-purple-500/30 bg-slate-900/90 text-slate-100 shadow-purple-950/50'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {item.variant === 'error' || item.variant === 'destructive' ? (
                <AlertCircle className="h-5 w-5 text-red-400" />
              ) : item.variant === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              ) : item.variant === 'warning' ? (
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              ) : (
                <Info className="h-5 w-5 text-purple-400" />
              )}
            </div>

            <div className="flex-1 text-sm">
              <div className="font-semibold">{item.title}</div>
              {item.description && (
                <div className="mt-1 text-xs opacity-90 leading-relaxed text-slate-300">
                  {item.description}
                </div>
              )}
            </div>

            <button
              onClick={() => dismissToast(item.id)}
              aria-label="Tutup notifikasi"
              className="shrink-0 rounded-lg p-1 text-slate-400 opacity-70 transition-opacity hover:opacity-100 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToastContext = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  return context;
};
