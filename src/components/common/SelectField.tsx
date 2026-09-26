import { forwardRef, type ReactNode, type SelectHTMLAttributes, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { FieldShell } from './TextField';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SelectFieldProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'onChangeCapture'> {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  options: SelectOption[];
  selectSize?: 'sm' | 'md';
  /** Receives the selected value, not the DOM event. */
  onChange?: (value: string) => void;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(function SelectField(
  { label, hint, error, options, className = '', id, required, selectSize = 'md', onChange, ...rest },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={selectId}>
      <div className="relative">
        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={error ? true : undefined}
          className={[
            'w-full appearance-none rounded-md border bg-surface pl-3 pr-9 text-[15px] text-ink',
            'transition-colors duration-150',
            selectSize === 'sm' ? 'h-9 text-sm' : 'h-11',
            error ? 'border-critical-500' : 'border-line-strong hover:border-ink-subtle',
            className,
          ].join(' ')}
          onChange={(event) => onChange?.(event.target.value)}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          strokeWidth={2}
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-subtle"
        />
      </div>
    </FieldShell>
  );
});
