import { db, METADATA_KEYS, getMetadata } from '@/db/database';
import { FOOD_DATABASE_VERSION } from '@/db/migrations';
import { seedFoodDatabaseIfNeeded } from '@/db/seed';
import { createId, nowIso } from '@/utils/id';
import { round } from '@/utils/numbers/numbers';
import { validateFoodName, validateNutritionFields } from '@/utils/validation/validation';
import type { Food, FoodOverride } from '@/types';
import { fail, type FieldResult } from '@/utils/validation/validation';

const RECENT_LIMIT = 24;

export interface ResolvedFood extends Food {
  /** True when a user override is currently applied to this food. */
  isOverridden: boolean;
  original?: Pick<Food, 'name' | 'caloriesPer100g' | 'proteinPer100g' | 'carbsPer100g' | 'fatPer100g' | 'fiberPer100g'>;
}

export interface FoodInput {
  name: string;
  category: string;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g: number;
  portion?: { label: string; grams: number };
}

export function applyOverride(food: Food, override?: FoodOverride): ResolvedFood {
  if (!override) return { ...food, isOverridden: false };
  return {
    ...food,
    name: override.name,
    caloriesPer100g: override.caloriesPer100g,
    proteinPer100g: override.proteinPer100g,
    carbsPer100g: override.carbsPer100g,
    fatPer100g: override.fatPer100g,
    fiberPer100g: override.fiberPer100g,
    isOverridden: true,
    original: {
      name: food.name,
      caloriesPer100g: food.caloriesPer100g,
      proteinPer100g: food.proteinPer100g,
      carbsPer100g: food.carbsPer100g,
      fatPer100g: food.fatPer100g,
      fiberPer100g: food.fiberPer100g,
    },
  };
}

export async function getResolvedFoods(): Promise<ResolvedFood[]> {
  const [foods, overrides] = await Promise.all([db.foods.toArray(), db.foodOverrides.toArray()]);
  const overrideMap = new Map(overrides.map((override) => [override.foodId, override]));
  return foods
    .map((food) => applyOverride(food, overrideMap.get(food.id)))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getResolvedFood(foodId: string): Promise<ResolvedFood | undefined> {
  const food = await db.foods.get(foodId);
  if (!food) return undefined;
  const override = await db.foodOverrides.where('foodId').equals(foodId).first();
  return applyOverride(food, override);
}

export function validateFoodInput(input: FoodInput): FieldResult {
  const name = validateFoodName(input.name);
  if (!name.ok) return name;
  if (!input.category || !input.category.trim()) return fail('Select a category.');
  return validateNutritionFields(input);
}

export async function createUserFood(input: FoodInput): Promise<Food> {
  const validation = validateFoodInput(input);
  if (!validation.ok) throw new Error(validation.message ?? 'Invalid food.');

  const timestamp = nowIso();
  const food: Food = {
    id: createId('food'),
    name: input.name.trim(),
    category: input.category.trim(),
    caloriesPer100g: round(input.caloriesPer100g, 1),
    proteinPer100g: round(input.proteinPer100g, 1),
    carbsPer100g: round(input.carbsPer100g, 1),
    fatPer100g: round(input.fatPer100g, 1),
    fiberPer100g: round(input.fiberPer100g, 1),
    portion: input.portion,
    isDefault: false,
    isUserCreated: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.foods.add(food);
  return food;
}

/**
 * Edit a food.
 *
 * A default food is never modified in place. Its changes are written to
 * `foodOverrides` so a future seed update can refresh the base record without
 * discarding the user's customisation. Historical meals are unaffected either
 * way because they store snapshots.
 */
export async function updateFood(foodId: string, input: FoodInput): Promise<ResolvedFood> {
  const validation = validateFoodInput(input);
  if (!validation.ok) throw new Error(validation.message ?? 'Invalid food.');

  const food = await db.foods.get(foodId);
  if (!food) throw new Error('Food not found.');

  const values = {
    name: input.name.trim(),
    caloriesPer100g: round(input.caloriesPer100g, 1),
    proteinPer100g: round(input.proteinPer100g, 1),
    carbsPer100g: round(input.carbsPer100g, 1),
    fatPer100g: round(input.fatPer100g, 1),
    fiberPer100g: round(input.fiberPer100g, 1),
  };
  const timestamp = nowIso();

  if (food.isUserCreated) {
    await db.foods.update(foodId, {
      ...values,
      category: input.category.trim(),
      portion: input.portion,
      updatedAt: timestamp,
    });
  } else {
    const existing = await db.foodOverrides.where('foodId').equals(foodId).first();
    if (existing) {
      await db.foodOverrides.update(existing.id, { ...values, updatedAt: timestamp });
    } else {
      const override: FoodOverride = {
        id: createId('ovr'),
        foodId,
        ...values,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await db.foodOverrides.add(override);
    }
  }

  const updated = await getResolvedFood(foodId);
  if (!updated) throw new Error('Food not found.');
  return updated;
}

/** Revert a default food to its seeded values. */
export async function resetFoodOverride(foodId: string): Promise<void> {
  const override = await db.foodOverrides.where('foodId').equals(foodId).first();
  if (override) await db.foodOverrides.delete(override.id);
}

export async function deleteUserFood(foodId: string): Promise<void> {
  const food = await db.foods.get(foodId);
  if (!food) return;
  if (food.isDefault) {
    // Removing a seed entry would come back on the next seed run. Only user
    // foods can be deleted; a custom value can be set on defaults instead.
    throw new Error('Built-in foods cannot be deleted. Edit the food to customise it.');
  }
  await db.transaction('rw', db.foods, db.mealItems, db.favorites, db.recentFoods, async () => {
    await db.foods.delete(foodId);
    // Logged items keep working: they are self-contained snapshots.
    await db.mealItems.where('foodId').equals(foodId).modify({ foodId: `deleted:${foodId}` });
    await db.favorites.delete(foodId);
    await db.recentFoods.delete(foodId);
  });
}

export async function toggleFavorite(foodId: string, currentlyFavorite: boolean): Promise<void> {
  if (currentlyFavorite) {
    await db.favorites.delete(foodId);
    return;
  }
  await db.favorites.put({ foodId, createdAt: nowIso() });
}

export async function recordRecentFood(foodId: string): Promise<void> {
  const timestamp = nowIso();
  await db.recentFoods.put({ foodId, usedAt: timestamp });
  const count = await db.recentFoods.count();
  if (count > RECENT_LIMIT) {
    const extras = await db.recentFoods.orderBy('usedAt').limit(count - RECENT_LIMIT).primaryKeys();
    await db.recentFoods.bulkDelete(extras);
  }
}

export async function getRecentFoodIds(): Promise<string[]> {
  const rows = await db.recentFoods.orderBy('usedAt').reverse().toArray();
  return rows.map((row) => row.foodId);
}

export async function getFavoriteFoodIds(): Promise<string[]> {
  const rows = await db.favorites.orderBy('createdAt').reverse().toArray();
  return rows.map((row) => row.foodId);
}

export interface ScoredFood {
  food: ResolvedFood;
  score: number;
}

/**
 * Rank foods for the search sheet. An exact name match wins, then a name
 * prefix, then a word-start match, then any substring, then a category match.
 * User-created foods are nudged above seeded ones on equal relevance.
 */
export function searchFoods(
  foods: ResolvedFood[],
  query: string,
  options: { limit?: number; category?: string } = {},
): ResolvedFood[] {
  const limit = options.limit ?? Number.POSITIVE_INFINITY;
  const pool = options.category
    ? foods.filter((food) => food.category === options.category)
    : foods;

  const term = query.trim().toLowerCase();
  if (!term) {
    return pool
      .slice()
      .sort((a, b) => Number(b.isUserCreated) - Number(a.isUserCreated) || a.name.localeCompare(b.name))
      .slice(0, limit);
  }

  const scored: ScoredFood[] = [];
  for (const food of pool) {
    const name = food.name.toLowerCase();
    let score = 0;
    if (name === term) score = 1000;
    else if (name.startsWith(term)) score = 900 - name.length;
    else {
      const wordStart = new RegExp(`\\b${escapeRegExp(term)}`).test(name);
      if (wordStart) score = 700 - name.length;
      else if (name.includes(term)) score = 500 - name.length;
      else if (food.category.toLowerCase().includes(term)) score = 200;
    }
    if (score === 0) continue;
    if (food.isUserCreated) score += 25;
    if (food.isOverridden) score += 5;
    scored.push({ food, score });
  }

  return scored
    .sort((a, b) => b.score - a.score || a.food.name.localeCompare(b.food.name))
    .slice(0, limit)
    .map((entry) => entry.food);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function countFoods(): Promise<number> {
  return db.foods.count();
}

export async function ensureFoodDatabaseReady(): Promise<void> {
  const version = await getMetadata(METADATA_KEYS.foodDatabaseVersion);
  if (version === String(FOOD_DATABASE_VERSION)) {
    // Still add anything added since the version marker, without touching rows.
    await seedFoodDatabaseIfNeeded();
    return;
  }
  await seedFoodDatabaseIfNeeded();
}
