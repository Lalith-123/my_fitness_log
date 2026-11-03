import { useId } from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
  className?: string;
  /** `brand` inverts the control: brand track, white labels, white selected chip. */
  tone?: 'default' | 'brand';
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  fullWidth = false,
  className = '',
  tone = 'default',
}: SegmentedControlProps<T>) {
  const name = useId();
  const isBrand = tone === 'brand';

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={[
        'inline-flex items-center gap-0.5 rounded-md border p-0.5',
        isBrand ? 'border-brand-600 bg-brand-700' : 'border-line bg-surface-sunken',
        fullWidth ? 'w-full' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {options.map((option) => {
        const selected = option.value === value;
        const id = `${name}-${option.value}`;
        return (
          <button
            key={option.value}
            id={id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={[
              'flex-1 rounded-[5px] px-3 font-medium transition-colors duration-150 whitespace-nowrap',
              size === 'sm' ? 'h-8 text-xs' : 'h-9 text-[13px]',
              selected
                ? isBrand
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'bg-surface text-ink shadow-xs'
                : isBrand
                  ? 'text-white/90 hover:bg-white/10 hover:text-white'
                  : 'text-ink-muted hover:text-ink',
            ].join(' ')}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
