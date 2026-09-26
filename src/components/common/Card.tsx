import type { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  /** Removes the default padding for cards that manage their own spacing. */
  flush?: boolean;
  as?: 'div' | 'section' | 'article' | 'li';
}

export function Card({ children, className = '', flush = false, as: Tag = 'div' }: CardProps) {
  return (
    <Tag
      className={[
        'rounded-lg border border-line bg-surface',
        flush ? '' : 'p-4 sm:p-5',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </Tag>
  );
}

export interface SectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}

/** A page section that uses a heading and dividers rather than nesting cards. */
export function Section({ title, description, action, children, className = '', id }: SectionProps) {
  return (
    <section id={id} className={['flex flex-col gap-3', className].filter(Boolean).join(' ')}>
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {description ? <p className="text-xs text-ink-subtle">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Divider({ className = '' }: { className?: string }) {
  return <hr className={['border-0 border-t border-line', className].filter(Boolean).join(' ')} />;
}

export interface CardHeaderProps {
  title: ReactNode;
  trailing?: ReactNode;
  className?: string;
}

/** Small label row used at the top of a card, above the main figure. */
export function CardHeader({ title, trailing, className = '' }: CardHeaderProps) {
  return (
    <div className={['flex items-center justify-between gap-3', className].filter(Boolean).join(' ')}>
      <span className="text-[12px] font-medium text-ink-muted">{title}</span>
      {trailing ? <span className="text-[11px] text-ink-subtle">{trailing}</span> : null}
    </div>
  );
}

export function Row({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className={`text-sm font-medium text-ink ${mono ? 'tnum' : ''}`}>{value}</dd>
    </div>
  );
}

export function StatList({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <dl className={['divide-y divide-line', className].filter(Boolean).join(' ')}>{children}</dl>;
}
