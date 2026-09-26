import type { ReactNode } from 'react';

export function VisuallyHidden({ children }: { children: ReactNode }) {
  return <span className="absolute -m-px h-px w-px overflow-hidden border-0 p-0 whitespace-nowrap">{children}</span>;
}

/** Live region for status messages that should not steal focus. */
export function LiveRegion({ message }: { message: string }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={['animate-pulse rounded-md bg-surface-sunken', className].join(' ')} />;
}

export function Spinner({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-line-strong border-t-brand-600 ${className}`}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}
