import { db, DB_NAME, DB_VERSION, METADATA_KEYS } from '@/db/database';
import { FOOD_DATABASE_VERSION } from '@/db/migrations';
import { downloadTextFile } from '@/utils/download';
import { sanitizeFilenamePart } from '@/utils/validation/validation';
import { nowIso } from '@/utils/id';
import { getTodayLocalDate } from '@/utils/dates/dates';
import type {
  AppSettings,
  FavoriteEntry,
  Food,
  FoodOverride,
  Goal,
  Meal,
  MealItem,
  MetadataEntry,
  RecentFoodEntry,
  UserProfile,
  WeightLog,
} from '@/types';

export const BACKUP_APP_ID = 'fitness-log';
export const BACKUP_SCHEMA_VERSION = 1;

export interface BackupPayload {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  data: {
    profile: UserProfile | null;
    goals: Goal[];
    foods: Food[];
    foodOverrides: FoodOverride[];
    meals: Meal[];
    mealItems: MealItem[];
    weightLogs: WeightLog[];
    settings: AppSettings | null;
    favorites: FavoriteEntry[];
    recentFoods: RecentFoodEntry[];
    metadata: MetadataEntry[];
  };
}

export interface BackupManifest {
  databaseName: string;
  databaseVersion: number;
  foodDatabaseVersion: number;
  counts: Record<string, number>;
}

export interface FullBackup extends BackupPayload {
  manifest: BackupManifest;
}

async function collectCounts(): Promise<Record<string, number>> {
  const [profile, goals, foods, overrides, meals, mealItems, weightLogs, settings, favorites, recent, metadata] =
    await Promise.all([
      db.profiles.count(),
      db.goals.count(),
      db.foods.count(),
      db.foodOverrides.count(),
      db.meals.count(),
      db.mealItems.count(),
      db.weightLogs.count(),
      db.settings.count(),
      db.favorites.count(),
      db.recentFoods.count(),
      db.metadata.count(),
    ]);
  return {
    profile,
    goals,
    foods,
    foodOverrides: overrides,
    meals,
    mealItems,
    weightLogs,
    settings,
    favorites,
    recentFoods: recent,
    metadata,
  };
}

export async function buildFullBackup(): Promise<FullBackup> {
  const [profiles, goals, foods, foodOverrides, meals, mealItems, weightLogs, settings, favorites, recentFoods, metadata] =
    await Promise.all([
      db.profiles.toArray(),
      db.goals.toArray(),
      db.foods.toArray(),
      db.foodOverrides.toArray(),
      db.meals.toArray(),
      db.mealItems.toArray(),
      db.weightLogs.toArray(),
      db.settings.toArray(),
      db.favorites.toArray(),
      db.recentFoods.toArray(),
      db.metadata.toArray(),
    ]);

  return {
    app: BACKUP_APP_ID,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: nowIso(),
    manifest: {
      databaseName: DB_NAME,
      databaseVersion: DB_VERSION,
      foodDatabaseVersion: FOOD_DATABASE_VERSION,
      counts: await collectCounts(),
    },
    data: {
      profile: profiles[0] ?? null,
      goals,
      foods,
      foodOverrides,
      meals,
      mealItems,
      weightLogs,
      settings: settings[0] ?? null,
      favorites,
      recentFoods,
      metadata,
    },
  };
}

export function buildBackupFilename(name: string): string {
  const today = getTodayLocalDate();
  return `${sanitizeFilenamePart(name)}-fitness-backup-${today}.json`;
}

export async function exportFullBackup(name: string): Promise<string> {
  const backup = await buildFullBackup();
  const filename = buildBackupFilename(name);
  downloadTextFile(filename, JSON.stringify(backup, null, 2), 'application/json');
  return filename;
}

/** A backup with no user records still needs to restore the food database. */
export function isBackupEmpty(backup: BackupPayload): boolean {
  const { data } = backup;
  return (
    !data.profile &&
    data.goals.length === 0 &&
    data.meals.length === 0 &&
    data.mealItems.length === 0 &&
    data.weightLogs.length === 0
  );
}

export async function readBackupFile(file: File): Promise<{ backup?: unknown; error?: string }> {
  if (file.size > 25 * 1024 * 1024) {
    return { error: 'That file is too large to be a backup from this application.' };
  }
  let text: string;
  try {
    text = await file.text();
  } catch {
    return { error: 'The file could not be read.' };
  }
  try {
    return { backup: JSON.parse(text) };
  } catch {
    return { error: 'The file is not valid JSON.' };
  }
}

export { METADATA_KEYS };
