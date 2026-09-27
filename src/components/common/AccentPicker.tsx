import { Check } from 'lucide-react';
import { ACCENT_OPTIONS } from '@/app/theme';
import type { AccentPreference } from '@/types';

export interface AccentPickerProps {
  value: AccentPreference;
  onChange: (value: AccentPreference) => void;
  /** Swatch hue for the given colour scheme, so previews match the active theme. */
  scheme: 'light' | 'dark';
  columns?: 2 | 3;
}

/**
 * Palette chooser. Each option previews the real ramp, so the choice reads as
 * "how will the app look" rather than "which word do I pick".
 */
export function AccentPicker({ value, onChange, scheme, columns = 2 }: AccentPickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Accent colour"
      className={columns === 3 ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-2'}
    >
      {ACCENT_OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={[
              'group flex items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors duration-150',
              selected
                ? 'border-brand-500 bg-brand-50'
                : 'border-line bg-surface hover:border-line-strong',
            ].join(' ')}
          >
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
              style={{ backgroundColor: option.swatch[scheme] }}
            >
              {selected ? <Check size={14} strokeWidth={2.6} className="text-white" /> : null}
            </span>
            <span
              className={[
                'min-w-0 flex-1 truncate text-[13px] font-medium',
                selected ? 'text-brand-800' : 'text-ink',
              ].join(' ')}
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
