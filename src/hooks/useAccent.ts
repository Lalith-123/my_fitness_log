import { useEffect } from 'react';
import { useSettings } from '@/hooks/useAppData';
import { DEFAULT_ACCENT, isAccentPreference } from '@/app/theme';
import type { AccentPreference } from '@/types';

const ACCENT_KEY = 'fl.accent';

function writeCached(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode: the database is still the source of truth */
  }
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

/**
 * Applies the stored accent to <html data-accent>.
 *
 * Nothing is written while there is no settings record, which is the case during
 * onboarding and on the first load of a returning user. That leaves the pre-paint
 * script and the onboarding previews in charge instead of being overwritten by the
 * defaults; once the record exists the database wins.
 */
export function useAccent(): void {
  const settings = useSettings();
  const accent: AccentPreference = isAccentPreference(settings?.accent)
    ? settings.accent
    : DEFAULT_ACCENT;

  useEffect(() => {
    if (!settings) return;
    writeCached(ACCENT_KEY, accent);
    applyAccent(accent);
  }, [accent, settings]);
}
