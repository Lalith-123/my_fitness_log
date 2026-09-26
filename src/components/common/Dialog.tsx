import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useLockBodyScroll } from '@/hooks';
import { Button } from './Button';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** Wider layout for forms. */
  width?: 'sm' | 'md';
  closeOnBackdrop?: boolean;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'sm',
  closeOnBackdrop = true,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE);
      (first ?? panelRef.current)?.focus();
    }, 20);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown, true);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/35"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        aria-describedby={description ? 'dialog-description' : undefined}
        tabIndex={-1}
        className={[
          'relative z-10 flex w-full max-h-[90dvh] flex-col overflow-hidden bg-surface',
          'rounded-t-xl border border-line shadow-lg animate-rise-in sm:rounded-xl',
          width === 'sm' ? 'sm:max-w-md' : 'sm:max-w-xl',
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-4 py-3.5 sm:px-5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id="dialog-title" className="text-[15px] font-semibold text-ink">
              {title}
            </h2>
            {description ? (
              <div id="dialog-description" className="text-xs leading-relaxed text-ink-muted">
                {description}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
          >
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
        {children ? <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div> : null}
        {footer ? (
          <div className="flex flex-col-reverse gap-2 border-t border-line px-4 py-3 safe-bottom sm:flex-row sm:justify-end sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy} className="sm:min-w-24">
            {cancelLabel}
          </Button>
          <Button
            variant={destructive ? 'danger' : 'primary'}
            onClick={onConfirm}
            disabled={busy}
            className="sm:min-w-24"
          >
            {busy ? 'Working' : confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-sm leading-relaxed text-ink-muted">{message}</div>
    </Dialog>
  );
}
