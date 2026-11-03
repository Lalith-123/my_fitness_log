import type { AccentPreference } from '@/types';

export interface AccentOption {
  value: AccentPreference;
  label: string;
  /** Representative hue for the picker swatch. */
  swatch: string;
}

/**
 * The palettes offered during onboarding and in settings.
 *
 * The swatches are the ramp's 500 step. The full 10-step ramp lives in
 * `src/styles/index.css` under `[data-accent]`, so switching accent only swaps
 * custom properties and never re-renders styled subtrees.
 */
export const ACCENT_OPTIONS: AccentOption[] = [
  { value: 'bubblegum', label: 'Bubblegum', swatch: '#ec3d7d' },
  { value: 'sky', label: 'Sky', swatch: '#1e93ea' },
  { value: 'mint', label: 'Mint', swatch: '#17c47a' },
  { value: 'peach', label: 'Peach', swatch: '#f2560f' },
  { value: 'grape', label: 'Grape', swatch: '#8a3fe0' },
];

export const DEFAULT_ACCENT: AccentPreference = 'bubblegum';

export function isAccentPreference(value: unknown): value is AccentPreference {
  return ACCENT_OPTIONS.some((option) => option.value === value);
}

export function accentLabel(value: AccentPreference): string {
  return ACCENT_OPTIONS.find((option) => option.value === value)?.label ?? 'Bubblegum';
}
