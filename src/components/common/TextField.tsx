import { forwardRef, type InputHTMLAttributes, type ReactNode, useId } from 'react';
import { AlertCircle } from 'lucide-react';

export interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  required?: boolean;
  htmlFor: string;
  children: ReactNode;
  trailing?: ReactNode;
}

export function FieldShell({ label, hint, error, required, htmlFor, children, trailing }: FieldShellProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
          {label}
          {required ? <span className="ml-1 text-ink-subtle">*</span> : null}
        </label>
        {trailing}
      </div>
      {children}
      {error ? (
        <p className="flex items-start gap-1.5 text-xs text-critical-700" role="alert">
          <AlertCircle size={13} strokeWidth={2} className="mt-px shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="text-xs leading-relaxed text-ink-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'onChangeCapture'> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  trailing?: ReactNode;
  containerClassName?: string;
  /** Receives the raw input value, not the DOM event. */
  onChange?: (value: string) => void;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, hint, error, trailing, containerClassName = '', className = '', id, required, onChange, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  return (
    <div className={containerClassName}>
      <FieldShell
        label={label}
        hint={hint}
        error={error}
        required={required}
        htmlFor={inputId}
        trailing={trailing}
      >
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          className={[
            'h-11 w-full rounded-md border bg-surface px-3 text-[15px] text-ink',
            'placeholder:text-ink-subtle',
            'transition-colors duration-150',
            error ? 'border-critical-500' : 'border-line-strong hover:border-ink-subtle',
          ]
            .filter(Boolean)
            .join(' ')}
          onChange={(event) => onChange?.(event.target.value)}
          {...rest}
        />
      </FieldShell>
    </div>
  );
});
