import { forwardRef, type ReactNode, useId } from 'react';
import { Minus, Plus } from 'lucide-react';
import { FieldShell } from './TextField';
import { parseNumericInput } from '@/utils/numbers/numbers';

export interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  hint?: ReactNode;
  error?: string | null;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  inputMode?: 'decimal' | 'numeric' | 'text';
  autoFocus?: boolean;
  onEnter?: () => void;
  id?: string;
}

interface NumberFieldInputProps extends Omit<NumberFieldProps, 'value' | 'onChange'> {
  value: string;
  onChange: (value: string) => void;
}

/** Text input that accepts decimals and rejects non-numeric characters. */
function NumberFieldInput({
  label,
  value,
  onChange,
  unit,
  hint,
  error,
  min,
  max,
  step,
  placeholder,
  required,
  disabled,
  inputMode = 'decimal',
  autoFocus,
  onEnter,
  id,
}: NumberFieldInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const numeric = parseNumericInput(value);

  const clampValue = (next: number) => {
    if (min !== undefined && next < min) return min;
    if (max !== undefined && next > max) return max;
    return next;
  };

  const nudge = (direction: 1 | -1) => {
    if (disabled) return;
    // When the field is still empty, step away from the placeholder the user can
    // see rather than from an invisible minimum.
    const base = numeric ?? parseNumericInput(placeholder ?? '') ?? min ?? 0;
    const amount = step ?? 1;
    const next = clampValue(roundTo(base + direction * amount));
    onChange(String(next));
  };

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={inputId}
      trailing={unit ? <span className="text-xs font-medium text-ink-subtle">{unit}</span> : undefined}
    >
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <input
            id={inputId}
            type="text"
            inputMode={inputMode}
            value={value}
            onChange={(event) => {
              const raw = event.target.value;
              if (raw === '' || /^-?\d*[.,]?\d*$/.test(raw)) onChange(raw);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && onEnter) {
                event.preventDefault();
                onEnter();
              }
            }}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            autoFocus={autoFocus}
            aria-invalid={error ? true : undefined}
            className={[
              'h-11 w-full rounded-md border bg-surface pl-3 pr-3 text-[15px] text-ink tnum',
              'placeholder:font-sans placeholder:text-ink-subtle',
              'disabled:bg-surface-sunken disabled:text-ink-subtle',
              'transition-colors duration-150',
              error ? 'border-critical-500' : 'border-line-strong hover:border-ink-subtle',
            ].join(' ')}
          />
        </div>
        <div className="flex shrink-0 items-stretch overflow-hidden rounded-md border border-line-strong">
          <button
            type="button"
            onClick={() => nudge(-1)}
            disabled={disabled || (numeric !== null && min !== undefined && numeric <= min)}
            aria-label={`Decrease ${label}`}
            className="flex w-11 items-center justify-center bg-surface text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-40"
          >
            <Minus size={16} strokeWidth={2} aria-hidden="true" />
          </button>
          <div className="w-px bg-line" aria-hidden="true" />
          <button
            type="button"
            onClick={() => nudge(1)}
            disabled={disabled || (numeric !== null && max !== undefined && numeric >= max)}
            aria-label={`Increase ${label}`}
            className="flex w-11 items-center justify-center bg-surface text-ink-muted transition-colors hover:bg-surface-sunken hover:text-ink disabled:opacity-40"
          >
            <Plus size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
    </FieldShell>
  );
}

function roundTo(value: number): number {
  return Math.round(value * 100) / 100;
}

export const NumberField = forwardRef<HTMLDivElement, NumberFieldProps>(function NumberField(props, ref) {
  return (
    <div ref={ref}>
      <NumberFieldInput {...props} />
    </div>
  );
});
