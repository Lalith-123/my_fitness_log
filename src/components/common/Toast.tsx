import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, Info, TriangleAlert, X } from 'lucide-react';

export type ToastTone = 'neutral' | 'success' | 'caution' | 'info';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
  durationMs: number;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone, durationMs?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { border: string; icon: ReactNode; iconClass: string }> = {
  neutral: {
    border: 'border-line-strong',
    icon: <Info size={15} strokeWidth={2} aria-hidden="true" />,
    iconClass: 'text-ink-muted',
  },
  success: {
    border: 'border-brand-200',
    icon: <Check size={15} strokeWidth={2.2} aria-hidden="true" />,
    iconClass: 'text-brand-600',
  },
  caution: {
    border: 'border-caution-100',
    icon: <TriangleAlert size={15} strokeWidth={2} aria-hidden="true" />,
    iconClass: 'text-caution-700',
  },
  info: {
    border: 'border-accent-100',
    icon: <Info size={15} strokeWidth={2} aria-hidden="true" />,
    iconClass: 'text-accent-700',
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (message: string, tone: ToastTone = 'neutral', durationMs = 3200) => {
      const id = nextId.current;
      nextId.current += 1;
      setToasts((current) => [...current.slice(-2), { id, message, tone, durationMs }]);
      const timer = window.setTimeout(() => dismiss(id), durationMs);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach((timer) => window.clearTimeout(timer));
      pending.clear();
    };
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 sm:bottom-6"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => {
          const style = TONE_STYLES[toast.tone];
          return (
            <div
              key={toast.id}
              role="status"
              aria-live="polite"
              className={[
                'pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-md border bg-surface',
                'px-3.5 py-2.5 text-sm text-ink shadow-md animate-toast-in',
                style.border,
              ].join(' ')}
            >
              <span className={`mt-0.5 shrink-0 ${style.iconClass}`}>{style.icon}</span>
              <span className="min-w-0 flex-1 leading-snug">{toast.message}</span>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Dismiss notification"
                className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink-subtle transition-colors hover:text-ink"
              >
                <X size={13} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider.');
  return context;
}
