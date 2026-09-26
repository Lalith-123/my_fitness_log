import { forwardRef, type ButtonHTMLAttributes } from 'react';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: every icon-only control needs an accessible name. */
  label: string;
  variant?: 'ghost' | 'secondary' | 'quiet';
  size?: 'sm' | 'md';
  active?: boolean;
}

const VARIANTS = {
  ghost: 'text-ink-muted hover:bg-surface-sunken hover:text-ink',
  quiet: 'bg-surface-sunken text-ink-muted hover:bg-line/70 hover:text-ink',
  secondary: 'border border-line-strong text-ink hover:bg-surface-sunken',
} as const;

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', active = false, className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active || undefined}
      className={[
        'inline-flex items-center justify-center rounded-md transition-colors duration-150',
        'disabled:cursor-not-allowed disabled:opacity-40',
        size === 'sm' ? 'h-9 w-9' : 'h-11 w-11',
        VARIANTS[variant],
        className,
      ].join(' ')}
      {...rest}
    />
  );
});
