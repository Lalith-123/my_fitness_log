import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useLockBodyScroll } from '@/hooks';

export interface BottomSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  /** Sheet height on larger screens where it is centred. */
  desktopWidth?: 'sm' | 'md' | 'lg';
  headerAction?: ReactNode;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet on phones, centred panel from `sm` up. Used for every add/edit
 * flow so the primary interaction is reachable with one thumb.
 */
export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  desktopWidth = 'md',
  headerAction,
}: BottomSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
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
      document.removeEventListener('keydown', onKeyDown, true);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const widthClass =
    desktopWidth === 'sm' ? 'sm:max-w-sm' : desktopWidth === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <div className="absolute inset-0 animate-fade-in bg-ink/40" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        tabIndex={-1}
        className={[
          'relative z-10 flex w-full flex-col overflow-hidden bg-surface',
          'rounded-t-xl border border-line shadow-lg animate-sheet-in',
          'max-h-[92dvh] sm:rounded-xl sm:max-h-[86dvh]',
          widthClass,
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 pt-3 pb-3 sm:px-5">
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 id="sheet-title" className="text-[15px] font-semibold text-ink">
              {title}
            </h2>
            {description ? <p className="text-xs leading-relaxed text-ink-muted">{description}</p> : null}
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {headerAction}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 flex h-9 w-9 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
            >
              <X size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
        {footer ? (
          <div className="border-t border-line px-4 py-3 safe-bottom sm:px-5">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}
