import type { ReactNode } from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: ReactNode;
  compact?: boolean;
}

export function EmptyState({ title, description, actionLabel, onAction, icon, compact = false }: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong',
        'bg-surface/60 text-center',
        compact ? 'px-4 py-6' : 'px-5 py-9',
      ].join(' ')}
    >
      {icon ? <div className="mb-1 text-ink-subtle">{icon}</div> : null}
      <p className="text-sm font-medium text-ink">{title}</p>
      <p className="max-w-xs text-xs leading-relaxed text-ink-muted">{description}</p>
      {actionLabel && onAction ? (
        <Button variant="secondary" size="sm" onClick={onAction} className="mt-2">
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}
