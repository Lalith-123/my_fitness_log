import type { AccentPreference, ThemePreference } from '@/types';

export interface AccentOption {
  value: AccentPreference;
  label: string;
  /** Representative hue for the picker swatch, per colour scheme. */
  swatch: { light: string; dark: string };
}

/**
 * The palettes offered during onboarding and in settings.
 *
 * The swatches are the ramp's 500 step for each scheme. The full 10-step ramp
 * lives in `src/styles/index.css` under `[data-accent]`, so switching accent only
 * swaps custom properties and never re-renders styled subtrees.
 */
export const ACCENT_OPTIONS: AccentOption[] = [
  { value: 'bubblegum', label: 'Bubblegum', swatch: { light: '#ec3d7d', dark: '#e05596' } },
  { value: 'sky', label: 'Sky', swatch: { light: '#1e93ea', dark: '#4595e0' } },
  { value: 'mint', label: 'Mint', swatch: { light: '#17c47a', dark: '#35c48d' } },
  { value: 'peach', label: 'Peach', swatch: { light: '#f2560f', dark: '#e06c28' } },
  { value: 'grape', label: 'Grape', swatch: { light: '#8a3fe0', dark: '#8c4ad0' } },
];

export const DEFAULT_ACCENT: AccentPreference = 'bubblegum';

export function isAccentPreference(value: unknown): value is AccentPreference {
  return ACCENT_OPTIONS.some((option) => option.value === value);
}

export function accentLabel(value: AccentPreference): string {
  return ACCENT_OPTIONS.find((option) => option.value === value)?.label ?? 'Bubblegum';
}

export type ResolvedScheme = 'light' | 'dark';

export function readSystemScheme(): ResolvedScheme {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function resolveScheme(preference: ThemePreference): ResolvedScheme {
  return preference === 'system' ? readSystemScheme() : preference;
}

/** Browser chrome colour, so the address bar matches the app background. */
export const CHROME_COLOR: Record<ResolvedScheme, string> = {
  light: '#faf9f6',
  dark: '#16150f',
};
