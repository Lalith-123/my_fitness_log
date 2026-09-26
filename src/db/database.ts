import Dexie, { type EntityTable } from 'dexie';
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

export const DB_NAME = 'fitness_log';
export const DB_VERSION = 1;

export const db = new Dexie(DB_NAME) as Dexie & {
  profiles: EntityTable<UserProfile, 'id'>;
  goals: EntityTable<Goal, 'id'>;
  foods: EntityTable<Food, 'id'>;
  foodOverrides: EntityTable<FoodOverride, 'id'>;
  meals: EntityTable<Meal, 'id'>;
  mealItems: EntityTable<MealItem, 'id'>;
  weightLogs: EntityTable<WeightLog, 'id'>;
  settings: EntityTable<AppSettings, 'id'>;
  favorites: EntityTable<FavoriteEntry, 'foodId'>;
  recentFoods: EntityTable<RecentFoodEntry, 'foodId'>;
  metadata: EntityTable<MetadataEntry, 'key'>;
};

db.version(DB_VERSION).stores({
  profiles: 'id, createdAt',
  goals: 'id, status, startedAt, completedAt',
  // isDefault/isUserCreated are booleans, which IndexedDB cannot index, so
  // user-created foods are selected with a filter instead.
  foods: 'id, name, category',
  foodOverrides: 'id, foodId',
  meals: 'id, date, mealType, [date+mealType]',
  mealItems: 'id, mealId, foodId, createdAt',
  weightLogs: 'id, date, createdAt',
  settings: 'id',
  favorites: 'foodId, createdAt',
  recentFoods: 'foodId, usedAt',
  metadata: 'key',
});

export const METADATA_KEYS = {
  foodDatabaseVersion: 'foodDatabaseVersion',
  seededAt: 'seededAt',
  onboardingCompleted: 'onboardingCompleted',
  goalAutomationCheckedAt: 'goalAutomationCheckedAt',
} as const;

export async function getMetadata(key: string): Promise<string | undefined> {
  const entry = await db.metadata.get(key);
  return entry?.value;
}

export async function setMetadata(key: string, value: string): Promise<void> {
  await db.metadata.put({ key, value });
}

export async function getAppSettings(): Promise<AppSettings | undefined> {
  return db.settings.get('app');
}
