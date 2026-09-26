import { useEffect, useState } from 'react';
import { useSettings } from '@/hooks/useAppData';
import type { ThemePreference } from '@/types';

const STORAGE_KEY = 'fl.theme';

function readSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function readCachedPreference(): ThemePreference | null {
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === 'light' || value === 'dark' || value === 'system' ? value : null;
}

export function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
  return preference === 'system' ? readSystemTheme() : preference;
}

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  root.dataset.theme = theme;
  // Keep the browser chrome (address bar, form controls) in step with the page.
  root.style.colorScheme = theme;
}

/**
 * Applies the stored theme preference to <html data-theme> and keeps it in sync
 * with the OS setting while the preference is `system`.
 */
export function useTheme(): void {
  const settings = useSettings();
  const preference = settings?.theme ?? 'system';
  const [, forceRender] = useState(0);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, preference);
    const resolved = resolveTheme(preference);
    applyTheme(resolved);
    if (preference !== 'system') return;

    // While following the system, react to OS changes.
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      applyTheme(media.matches ? 'dark' : 'light');
      forceRender((value) => value + 1);
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [preference]);
}

/**
 * Applies the last known theme before React mounts, so the first paint is not
 * the wrong colour scheme. Call once from index.html.
 */
export function applyStoredThemePreference(): void {
  const cached = readCachedPreference() ?? 'system';
  applyTheme(resolveTheme(cached));
}
