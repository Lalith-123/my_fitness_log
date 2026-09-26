import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'quiet';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-700 text-ink-inverse hover:bg-brand-800 active:bg-brand-900 disabled:bg-brand-700/40 shadow-xs',
  secondary:
    'bg-surface text-ink border border-line-strong hover:bg-surface-sunken active:bg-line/60 disabled:text-ink-subtle',
  ghost: 'bg-transparent text-ink-muted hover:bg-surface-sunken hover:text-ink active:bg-line/60',
  quiet: 'bg-surface-sunken text-ink-muted hover:bg-line/70 hover:text-ink',
  danger: 'bg-critical-500 text-ink-inverse hover:bg-critical-700 active:bg-critical-700 shadow-xs',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'secondary',
    size = 'md',
    fullWidth = false,
    leadingIcon,
    trailingIcon,
    className = '',
    children,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={[
        'inline-flex items-center justify-center rounded-md font-medium tracking-[-0.006em]',
        'transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60',
        VARIANTS[variant],
        SIZES[size],
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {leadingIcon}
      {children}
      {trailingIcon}
    </button>
  );
});
