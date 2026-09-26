import { isValidDateKey, isValidTimestamp } from '@/utils/dates/dates';
import { BACKUP_APP_ID, BACKUP_SCHEMA_VERSION, type BackupPayload } from '@/services/export/backup';
import type {
  AppSettings,
  FavoriteEntry,
  Food,
  FoodOverride,
  Goal,
  Meal,
  MealItem,
  RecentFoodEntry,
  UserProfile,
  WeightLog,
} from '@/types';

export interface ValidationOk {
  ok: true;
  backup: BackupPayload;
  warnings: string[];
}

export interface ValidationError {
  ok: false;
  message: string;
}

export type ValidationResult = ValidationOk | ValidationError;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNonNegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isFinitePositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

const SEXES = ['male', 'female', 'other'] as const;
const GOAL_TYPES = ['lose', 'maintain', 'gain'] as const;
const GOAL_STATUSES = ['active', 'completed'] as const;
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const ACTIVITY_LEVELS = ['sedentary', 'light', 'moderate', 'active'] as const;
const THEMES = ['system', 'light', 'dark'] as const;

const MAX_RECORDS = 250_000;

function validateProfile(value: unknown): UserProfile | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) throw new Error('Profile is not an object.');
  if (!isNonEmptyString(value.id)) throw new Error('Profile id is missing.');
  if (!isNonEmptyString(value.name)) throw new Error('Profile name is missing.');
  if (!isFinitePositive(value.age)) throw new Error('Profile age is invalid.');
  if (!isOneOf(value.sex, SEXES)) throw new Error('Profile sex is invalid.');
  if (!isFinitePositive(value.heightCm)) throw new Error('Profile height is invalid.');
  if (!isFinitePositive(value.currentWeightKg)) throw new Error('Profile weight is invalid.');
  if (!isOneOf(value.activityLevel, ACTIVITY_LEVELS)) throw new Error('Profile activity level is invalid.');
  if (!isValidTimestamp(value.createdAt) || !isValidTimestamp(value.updatedAt)) {
    throw new Error('Profile timestamps are invalid.');
  }
  return value as unknown as UserProfile;
}

function validateGoal(value: unknown, index: number): Goal {
  if (!isRecord(value)) throw new Error(`Goal ${index + 1} is not an object.`);
  if (!isNonEmptyString(value.id)) throw new Error(`Goal ${index + 1} is missing an id.`);
  if (!isOneOf(value.type, GOAL_TYPES)) throw new Error(`Goal ${index + 1} has an invalid type.`);
  if (!isFinitePositive(value.startingWeightKg)) throw new Error(`Goal ${index + 1} has an invalid start weight.`);
  if (!isFinitePositive(value.targetWeightKg)) throw new Error(`Goal ${index + 1} has an invalid target weight.`);
  if (value.weeklyChangeKg !== undefined && !isFiniteNonNegative(value.weeklyChangeKg)) {
    throw new Error(`Goal ${index + 1} has an invalid weekly change.`);
  }
  if (!isOneOf(value.status, GOAL_STATUSES)) throw new Error(`Goal ${index + 1} has an invalid status.`);
  if (!isValidTimestamp(value.startedAt)) throw new Error(`Goal ${index + 1} has an invalid start date.`);
  if (value.completedAt !== undefined && !isValidTimestamp(value.completedAt)) {
    throw new Error(`Goal ${index + 1} has an invalid completion date.`);
  }
  if (value.completedAt !== undefined && value.status !== 'completed') {
    throw new Error(`Goal ${index + 1} has a completion date but is not marked completed.`);
  }
  return value as unknown as Goal;
}

function validateFood(value: unknown, index: number): Food {
  if (!isRecord(value)) throw new Error(`Food ${index + 1} is not an object.`);
  if (!isNonEmptyString(value.id)) throw new Error(`Food ${index + 1} is missing an id.`);
  if (!isNonEmptyString(value.name)) throw new Error(`Food ${index + 1} is missing a name.`);
  if (!isNonEmptyString(value.category)) throw new Error(`Food ${index + 1} is missing a category.`);
  for (const key of ['caloriesPer100g', 'proteinPer100g', 'carbsPer100g', 'fatPer100g', 'fiberPer100g']) {
    if (!isFiniteNonNegative(value[key])) throw new Error(`Food ${index + 1} has an invalid ${key}.`);
  }
  if (typeof value.isDefault !== 'boolean' || typeof value.isUserCreated !== 'boolean') {
    throw new Error(`Food ${index + 1} has invalid flags.`);
  }
  if (!isValidTimestamp(value.createdAt) || !isValidTimestamp(value.updatedAt)) {
    throw new Error(`Food ${index + 1} has invalid timestamps.`);
  }
  if (value.portion !== undefined) {
    if (
      !isRecord(value.portion) ||
      !isNonEmptyString(value.portion.label) ||
      !isFinitePositive(value.portion.grams)
    ) {
      throw new Error(`Food ${index + 1} has an invalid portion.`);
    }
  }
  return value as unknown as Food;
}

function validateFoodOverride(value: unknown, index: number): FoodOverride {
  if (!isRecord(value)) throw new Error(`Food override ${index + 1} is not an object.`);
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.foodId)) {
    throw new Error(`Food override ${index + 1} is missing an id.`);
  }
  if (!isNonEmptyString(value.name)) throw new Error(`Food override ${index + 1} is missing a name.`);
  for (const key of ['caloriesPer100g', 'proteinPer100g', 'carbsPer100g', 'fatPer100g', 'fiberPer100g']) {
    if (!isFiniteNonNegative(value[key])) throw new Error(`Food override ${index + 1} has an invalid ${key}.`);
  }
  if (!isValidTimestamp(value.createdAt) || !isValidTimestamp(value.updatedAt)) {
    throw new Error(`Food override ${index + 1} has invalid timestamps.`);
  }
  return value as unknown as FoodOverride;
}

function validateMeal(value: unknown, index: number): Meal {
  if (!isRecord(value)) throw new Error(`Meal ${index + 1} is not an object.`);
  if (!isNonEmptyString(value.id)) throw new Error(`Meal ${index + 1} is missing an id.`);
  if (!isValidDateKey(value.date)) throw new Error(`Meal ${index + 1} has an invalid date.`);
  if (!isOneOf(value.mealType, MEAL_TYPES)) throw new Error(`Meal ${index + 1} has an invalid meal type.`);
  if (!isValidTimestamp(value.createdAt)) throw new Error(`Meal ${index + 1} has an invalid timestamp.`);
  return value as unknown as Meal;
}

function validateMealItem(value: unknown, index: number): MealItem {
  if (!isRecord(value)) throw new Error(`Food entry ${index + 1} is not an object.`);
  if (!isNonEmptyString(value.id)) throw new Error(`Food entry ${index + 1} is missing an id.`);
  if (!isNonEmptyString(value.mealId)) throw new Error(`Food entry ${index + 1} is missing a meal reference.`);
  if (!isNonEmptyString(value.foodNameSnapshot)) {
    throw new Error(`Food entry ${index + 1} is missing the recorded food name.`);
  }
  if (!isFinitePositive(value.quantityGrams)) throw new Error(`Food entry ${index + 1} has an invalid quantity.`);
  if (!isRecord(value.per100g)) throw new Error(`Food entry ${index + 1} is missing its per 100 g values.`);
  for (const key of [
    'caloriesPer100g',
    'proteinPer100g',
    'carbsPer100g',
    'fatPer100g',
    'fiberPer100g',
  ]) {
    if (!isFiniteNonNegative(value.per100g[key])) {
      throw new Error(`Food entry ${index + 1} has an invalid ${key}.`);
    }
  }
  for (const key of ['caloriesSnapshot', 'proteinSnapshot', 'carbsSnapshot', 'fatSnapshot', 'fiberSnapshot']) {
    if (!isFiniteNonNegative(value[key])) throw new Error(`Food entry ${index + 1} has an invalid ${key}.`);
  }
  if (!isValidTimestamp(value.createdAt)) throw new Error(`Food entry ${index + 1} has an invalid timestamp.`);
  return value as unknown as MealItem;
}

function validateWeightLog(value: unknown, index: number): WeightLog {
  if (!isRecord(value)) throw new Error(`Weight entry ${index + 1} is not an object.`);
  if (!isNonEmptyString(value.id)) throw new Error(`Weight entry ${index + 1} is missing an id.`);
  if (!isValidDateKey(value.date)) throw new Error(`Weight entry ${index + 1} has an invalid date.`);
  if (!isFinitePositive(value.weightKg)) throw new Error(`Weight entry ${index + 1} has an invalid weight.`);
  if (!isValidTimestamp(value.createdAt)) throw new Error(`Weight entry ${index + 1} has an invalid timestamp.`);
  return value as unknown as WeightLog;
}

function validateSettings(value: unknown): AppSettings | null {
  if (value === null || value === undefined) return null;
  if (!isRecord(value)) throw new Error('Settings are not an object.');
  if (!isOneOf(value.theme, THEMES)) throw new Error('Settings theme is invalid.');
  if (value.units !== 'metric') throw new Error('Settings units are invalid.');
  if (value.id !== 'app') throw new Error('Settings id is invalid.');
  if (!isValidTimestamp(value.createdAt) || !isValidTimestamp(value.updatedAt)) {
    throw new Error('Settings timestamps are invalid.');
  }
  return value as unknown as AppSettings;
}

function validateFavorites(value: unknown): FavoriteEntry[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('Favourites are not a list.');
  return value.map((entry, index) => {
    if (!isRecord(entry) || !isNonEmptyString(entry.foodId) || !isValidTimestamp(entry.createdAt)) {
      throw new Error(`Favourite ${index + 1} is invalid.`);
    }
    return entry as unknown as FavoriteEntry;
  });
}

function validateRecent(value: unknown): RecentFoodEntry[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('Recently used foods are not a list.');
  return value.map((entry, index) => {
    if (!isRecord(entry) || !isNonEmptyString(entry.foodId) || !isValidTimestamp(entry.usedAt)) {
      throw new Error(`Recently used food ${index + 1} is invalid.`);
    }
    return entry as unknown as RecentFoodEntry;
  });
}

function validateMetadata(value: unknown): BackupPayload['data']['metadata'] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error('Database metadata is not a list.');
  return value.map((entry, index) => {
    if (!isRecord(entry) || !isNonEmptyString(entry.key) || typeof entry.value !== 'string') {
      throw new Error(`Metadata entry ${index + 1} is invalid.`);
    }
    return entry as { key: string; value: string };
  });
}

function requireArray(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} is missing or not a list.`);
  if (value.length > MAX_RECORDS) throw new Error(`${label} contains too many records to restore.`);
  return value;
}

/**
 * Validate a parsed backup file in full before anything is written.
 *
 * Every record is checked for shape, types, numeric ranges, date format and
 * cross-references. Any failure returns an error and the caller must leave the
 * database untouched.
 */
export function validateBackup(input: unknown): ValidationResult {
  const warnings: string[] = [];

  if (!isRecord(input)) {
    return { ok: false, message: 'Invalid backup file. Your existing data has not been changed.' };
  }

  if (input.app !== BACKUP_APP_ID) {
    return { ok: false, message: 'This file was not created by this application. Your existing data has not been changed.' };
  }

  if (typeof input.schemaVersion !== 'number' || !Number.isInteger(input.schemaVersion)) {
    return { ok: false, message: 'The backup file is missing a valid schema version.' };
  }

  if (input.schemaVersion > BACKUP_SCHEMA_VERSION) {
    return {
      ok: false,
      message: 'This backup was created by a newer version of the application. Update the application, then try again.',
    };
  }

  if (!isValidTimestamp(input.exportedAt)) {
    return { ok: false, message: 'The backup file has an invalid export date.' };
  }

  if (!isRecord(input.data)) {
    return { ok: false, message: 'The backup file does not contain any data.' };
  }

  try {
    const data = input.data;

    const profile = validateProfile(data.profile);
    const goals = requireArray(data.goals, 'Goals').map(validateGoal);
    const foods = requireArray(data.foods, 'Foods').map(validateFood);
    const foodOverrides = requireArray(data.foodOverrides, 'Food overrides').map(validateFoodOverride);
    const meals = requireArray(data.meals, 'Meals').map(validateMeal);
    const mealItems = requireArray(data.mealItems, 'Food entries').map(validateMealItem);
    const weightLogs = requireArray(data.weightLogs, 'Weight entries').map(validateWeightLog);
    const settings = validateSettings(data.settings);
    const favorites = validateFavorites(data.favorites);
    const recentFoods = validateRecent(data.recentFoods);
    const metadata = validateMetadata(data.metadata);

    const mealIds = new Set(meals.map((meal) => meal.id));
    const orphan = mealItems.find((item) => !mealIds.has(item.mealId));
    if (orphan) {
      throw new Error('Some food entries reference a meal that is not in the backup.');
    }

    const duplicateMealKey = findDuplicate(
      meals.map((meal) => `${meal.date}|${meal.mealType}`),
      'meal',
    );
    if (duplicateMealKey) {
      warnings.push('Some meals shared a date and meal type. Only the first was kept.');
    }

    const seenItems = new Set<string>();
    const dedupedItems = mealItems.filter((item) => {
      if (seenItems.has(item.id)) return false;
      seenItems.add(item.id);
      return true;
    });

    const seenWeights = new Set<string>();
    const dedupedWeights = weightLogs.filter((log) => {
      if (seenWeights.has(log.date)) {
        warnings.push('Some weight entries shared a date. Only the earliest was kept.');
        return false;
      }
      seenWeights.add(log.date);
      return true;
    });

    const seenFoodIds = new Set<string>();
    const dedupedFoods = foods.filter((food) => {
      if (seenFoodIds.has(food.id)) return false;
      seenFoodIds.add(food.id);
      return true;
    });

    return {
      ok: true,
      warnings,
      backup: {
        app: BACKUP_APP_ID,
        schemaVersion: input.schemaVersion,
        exportedAt: input.exportedAt,
        data: {
          profile,
          goals,
          foods: dedupedFoods,
          foodOverrides,
          meals,
          mealItems: dedupedItems,
          weightLogs: dedupedWeights,
          settings,
          favorites,
          recentFoods,
          metadata,
        },
      },
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : 'Unknown validation problem.';
    return { ok: false, message: `Invalid backup file: ${detail} Your existing data has not been changed.` };
  }
}

function findDuplicate(values: string[], label: string): string | null {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) return label;
    seen.add(value);
  }
  return null;
}
