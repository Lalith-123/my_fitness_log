import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { FieldShell } from './TextField';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SelectFieldProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'onChange' | 'onChangeCapture' | 'value' | 'defaultValue'
  > {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  options: SelectOption[];
  selectSize?: 'sm' | 'md';
  value: string;
  /** Marks the field as required in the label. */
  required?: boolean;
  /** Receives the selected value, not the DOM event. */
  onChange?: (value: string) => void;
}

/**
 * A themed listbox.
 *
 * A native <select> draws its popup with OS chrome that ignores the app's design
 * tokens, which is jarring in dark mode and inconsistent across platforms. This
 * keeps the familiar select appearance and keyboard behaviour while rendering
 * the option list with the app's own surfaces, borders and type.
 */
export const SelectField = forwardRef<HTMLButtonElement, SelectFieldProps>(function SelectField(
  { label, hint, error, options, className = '', selectSize = 'sm', value, required, onChange, ...rest },
  ref,
) {
  const generatedId = useId();
  const listboxId = `${generatedId}-listbox`;
  const optionId = (index: number) => `${generatedId}-option-${index}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(
      0,
      options.findIndex((option) => option.value === value),
    ),
  );

  const selected = options.find((option) => option.value === value);

  // Keep the highlighted row in step with the committed value.
  useEffect(() => {
    if (open) return;
    const index = options.findIndex((option) => option.value === value);
    if (index >= 0) setActiveIndex(index);
  }, [open, options, value]);

  // Dismiss on any outside press, without stealing the click from other controls.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const commit = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange?.(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const move = (delta: number) => {
    setActiveIndex((current) => {
      const next = current + delta;
      if (next < 0) return options.length - 1;
      if (next >= options.length) return 0;
      return next;
    });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) setOpen(true);
        else move(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) setOpen(true);
        else move(-1);
        break;
      case 'Home':
        if (open) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (open) {
          event.preventDefault();
          setActiveIndex(options.length - 1);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (open) commit(activeIndex);
        else setOpen(true);
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          setOpen(false);
        }
        break;
      case 'Tab':
        setOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={generatedId}>
      <div ref={containerRef} className="relative">
        <button
          {...rest}
          id={generatedId}
          ref={(node) => {
            triggerRef.current = node;
            if (typeof ref === 'function') ref(node);
            else if (ref) ref.current = node;
          }}
          type="button"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open ? optionId(activeIndex) : undefined}
          aria-invalid={error ? true : undefined}
          onClick={() => setOpen((current) => !current)}
          onKeyDown={onKeyDown}
          className={[
            'flex w-full items-center justify-between gap-2 rounded-md border bg-surface text-left text-ink',
            'transition-colors duration-150',
            selectSize === 'sm' ? 'h-9 px-3 text-sm' : 'h-11 pl-3 pr-3 text-[15px]',
            'disabled:bg-surface-sunken disabled:text-ink-subtle',
            error ? 'border-critical-500' : 'border-line-strong hover:border-ink-subtle',
            className,
          ].join(' ')}
        >
          <span className={selected ? 'truncate' : 'truncate text-ink-subtle'}>
            {selected?.label ?? 'Select'}
          </span>
          <ChevronDown
            size={16}
            strokeWidth={2}
            aria-hidden="true"
            className={[
              'shrink-0 text-ink-subtle transition-transform duration-150',
              open ? 'rotate-180' : '',
            ].join(' ')}
          />
        </button>

        {open ? (
          <ul
            id={listboxId}
            role="listbox"
            aria-label={label}
            className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto overscroll-contain rounded-md border border-line bg-surface p-1 shadow-lg animate-fade-in"
          >
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isActive = index === activeIndex;
              return (
                <li key={option.value} role="none">
                  <button
                    id={optionId(index)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    // Pointer hover should not fight the keyboard highlight.
                    onPointerEnter={() => setActiveIndex(index)}
                    onClick={() => commit(index)}
                    className={[
                      'flex w-full items-center gap-2 rounded-[5px] px-2.5 py-2 text-left transition-colors duration-100',
                      selectSize === 'sm' ? 'text-[13px]' : 'text-[15px]',
                      isActive ? 'bg-surface-sunken text-ink' : 'text-ink-muted',
                    ].join(' ')}
                  >
                    <Check
                      size={15}
                      strokeWidth={2.4}
                      aria-hidden="true"
                      className={isSelected ? 'shrink-0 text-brand-600' : 'shrink-0 opacity-0'}
                    />
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </FieldShell>
  );
});
