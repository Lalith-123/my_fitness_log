import { useEffect } from 'react';
import { useSettings } from '@/hooks/useAppData';
import {
  CHROME_COLOR,
  DEFAULT_ACCENT,
  isAccentPreference,
  readSystemScheme,
  resolveScheme,
  type ResolvedScheme,
} from '@/app/theme';
import type { AccentPreference, ThemePreference } from '@/types';

const THEME_KEY = 'fl.theme';
const ACCENT_KEY = 'fl.accent';

function readCached(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeCached(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode: the database is still the source of truth */
  }
}

function applyScheme(scheme: ResolvedScheme): void {
  const root = document.documentElement;
  root.dataset.theme = scheme;
  // Keep the browser chrome (address bar, form controls) in step with the page.
  root.style.colorScheme = scheme;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', CHROME_COLOR[scheme]);
}

function applyAccent(accent: AccentPreference): void {
  document.documentElement.dataset.accent = accent;
}

/**
 * Applies an accent immediately, before it is committed to the database. Used by
 * the onboarding picker so the choice can be previewed live.
 */
export function previewAccent(accent: AccentPreference): void {
  writeCached(ACCENT_KEY, accent);
  applyAccent(accent);
}

/** As `previewAccent`, for the light/dark/system choice. */
export function previewTheme(theme: ThemePreference): void {
  writeCached(THEME_KEY, theme);
  applyScheme(resolveScheme(theme));
}

/**
 * Applies the stored scheme and accent to <html data-theme data-accent>, and keeps
 * the scheme in sync with the OS while the preference is `system`.
 *
 * Nothing is written while there is no settings record, which is the case during
 * onboarding and on the first load of a returning user. That leaves the pre-paint
 * script and the onboarding previews in charge instead of being overwritten by the
 * defaults; once the record exists the database wins.
 */
export function useTheme(): void {
  const settings = useSettings();
  const theme: ThemePreference = settings?.theme ?? 'system';
  const accent: AccentPreference = isAccentPreference(settings?.accent)
    ? settings.accent
    : DEFAULT_ACCENT;

  useEffect(() => {
    if (!settings) return;
    writeCached(THEME_KEY, theme);
    applyScheme(resolveScheme(theme));
    if (theme !== 'system') return;

    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyScheme(media.matches ? 'dark' : 'light');
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [theme, settings]);

  useEffect(() => {
    if (!settings) return;
    writeCached(ACCENT_KEY, accent);
    applyAccent(accent);
  }, [accent, settings]);
}

/**
 * Applies the last known scheme and accent before React mounts, so the first
 * paint is already correct. Kept in sync with this module.
 */
export function applyStoredThemePreference(): void {
  const cachedTheme = readCached(THEME_KEY);
  const theme: ThemePreference =
    cachedTheme === 'light' || cachedTheme === 'dark' || cachedTheme === 'system'
      ? cachedTheme
      : 'system';
  applyScheme(resolveScheme(theme));

  const cachedAccent = readCached(ACCENT_KEY);
  applyAccent(isAccentPreference(cachedAccent) ? cachedAccent : DEFAULT_ACCENT);
}

export { readSystemScheme, resolveScheme };
