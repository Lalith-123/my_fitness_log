import { db } from '@/db/database';
import { nowIso } from '@/utils/id';
import { DEFAULT_ACCENT } from '@/app/theme';
import type { AccentPreference, AppSettings, ThemePreference } from '@/types';

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'app',
  theme: 'system',
  accent: DEFAULT_ACCENT,
  units: 'metric',
  disclaimerAcceptedAt: '',
  createdAt: '',
  updatedAt: '',
};

export async function getSettings(): Promise<AppSettings> {
  const existing = await db.settings.get('app');
  if (existing) return existing;
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(patch: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings> {
  const current = await getSettings();
  const timestamp = nowIso();
  const next: AppSettings = {
    ...current,
    ...patch,
    id: 'app',
    createdAt: current.createdAt || timestamp,
    updatedAt: timestamp,
  };
  await db.settings.put(next);
  return next;
}

export async function setTheme(theme: ThemePreference): Promise<void> {
  await saveSettings({ theme });
}

export async function setAccent(accent: AccentPreference): Promise<void> {
  await saveSettings({ accent });
}
