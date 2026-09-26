import { db, METADATA_KEYS } from '@/db/database';
import { FOOD_DATABASE_VERSION } from '@/db/migrations';
import { seedFoodDatabaseIfNeeded } from '@/db/seed';
import type { BackupPayload } from '@/services/export/backup';

export type ImportMode = 'replace' | 'merge';

export interface ImportSummary {
  profile: boolean;
  goals: number;
  foods: number;
  foodOverrides: number;
  meals: number;
  mealItems: number;
  weightLogs: number;
  settings: boolean;
  favorites: number;
  recentFoods: number;
  mode: ImportMode;
}

export interface ImportResult {
  summary: ImportSummary;
  warnings: string[];
}

const WRITABLE_TABLES = [
  db.profiles,
  db.goals,
  db.foods,
  db.foodOverrides,
  db.meals,
  db.mealItems,
  db.weightLogs,
  db.settings,
  db.favorites,
  db.recentFoods,
  db.metadata,
] as const;

/**
 * Write a validated backup into the database.
 *
 * This function is only ever called with a payload that has already passed
 * `validateBackup`. Everything happens inside a single IndexedDB transaction,
 * so a failure part-way through rolls back and leaves the existing data intact.
 *
 * `replace` removes the current data first, so the result matches the backup.
 * `merge` keeps existing rows and only writes the ones in the file, which
 * matches records by primary key.
 */
export async function restoreBackup(
  backup: BackupPayload,
  mode: ImportMode = 'merge',
  warnings: string[] = [],
): Promise<ImportResult> {
  const { data } = backup;
  const existingOnboarding =
    mode === 'replace' ? undefined : (await db.metadata.get(METADATA_KEYS.onboardingCompleted))?.value;

  await db.transaction('rw', WRITABLE_TABLES, async () => {
    if (mode === 'replace') {
      await db.profiles.clear();
      await db.goals.clear();
      await db.foods.clear();
      await db.foodOverrides.clear();
      await db.meals.clear();
      await db.mealItems.clear();
      await db.weightLogs.clear();
      await db.settings.clear();
      await db.favorites.clear();
      await db.recentFoods.clear();
      await db.metadata.clear();
    }

    if (data.profile) await db.profiles.put(data.profile);
    if (data.settings) await db.settings.put(data.settings);

    if (data.goals.length > 0) await db.goals.bulkPut(data.goals);
    if (data.foods.length > 0) await db.foods.bulkPut(data.foods);
    if (data.foodOverrides.length > 0) await db.foodOverrides.bulkPut(data.foodOverrides);
    if (data.meals.length > 0) await db.meals.bulkPut(data.meals);
    if (data.mealItems.length > 0) await db.mealItems.bulkPut(data.mealItems);
    if (data.weightLogs.length > 0) await db.weightLogs.bulkPut(data.weightLogs);
    if (data.favorites.length > 0) await db.favorites.bulkPut(data.favorites);
    if (data.recentFoods.length > 0) await db.recentFoods.bulkPut(data.recentFoods);

    for (const entry of data.metadata) {
      // Never let an imported file roll the seed marker backwards.
      if (entry.key === METADATA_KEYS.foodDatabaseVersion) continue;
      await db.metadata.put(entry);
    }

    await db.metadata.put({
      key: METADATA_KEYS.onboardingCompleted,
      value: data.profile ? 'true' : (existingOnboarding ?? 'false'),
    });
  });

  // Guarantee the current food database is present, including anything newer
  // than the backup, without overwriting any restored or user-created rows.
  await seedFoodDatabaseIfNeeded();
  await db.metadata.put({
    key: METADATA_KEYS.foodDatabaseVersion,
    value: String(FOOD_DATABASE_VERSION),
  });

  return {
    warnings,
    summary: {
      profile: Boolean(data.profile),
      goals: data.goals.length,
      foods: data.foods.length,
      foodOverrides: data.foodOverrides.length,
      meals: data.meals.length,
      mealItems: data.mealItems.length,
      weightLogs: data.weightLogs.length,
      settings: Boolean(data.settings),
      favorites: data.favorites.length,
      recentFoods: data.recentFoods.length,
      mode,
    },
  };
}

/**
 * Remove everything the user created: profile, goals, meals, weight history,
 * settings, favourites, recents, food overrides and custom foods. The built-in
 * food database is reference data, so it is re-seeded rather than deleted.
 */
export async function clearAllData(): Promise<void> {
  await db.transaction('rw', WRITABLE_TABLES, async () => {
    await db.profiles.clear();
    await db.goals.clear();
    await db.meals.clear();
    await db.mealItems.clear();
    await db.weightLogs.clear();
    await db.settings.clear();
    await db.foodOverrides.clear();
    await db.favorites.clear();
    await db.recentFoods.clear();
    await db.metadata.clear();
    const customFoodIds = await db.foods.filter((food) => food.isUserCreated).primaryKeys();
    if (customFoodIds.length > 0) await db.foods.bulkDelete(customFoodIds);
  });

  // The food database is re-seeded so the app is usable straight away.
  await seedFoodDatabaseIfNeeded();
  await db.metadata.put({
    key: METADATA_KEYS.foodDatabaseVersion,
    value: String(FOOD_DATABASE_VERSION),
  });
}
