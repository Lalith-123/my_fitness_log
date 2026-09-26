import { db } from '@/db/database';
import { groupItemsByMealId } from '@/services/nutrition/nutrition';
import { round } from '@/utils/numbers/numbers';
import type { MealItem, NutritionTotals } from '@/types';
import { EMPTY_NUTRITION } from '@/types';

export interface DailyNutritionRecord extends NutritionTotals {
  date: string;
  itemCount: number;
}

export interface DailyCalorieRecord {
  date: string;
  calories: number;
}

/**
 * Daily nutrition totals for every date in the list that actually has logged
 * food. Days with no entries are absent from the result, never zero.
 */
export async function getDailyNutrition(dates: string[]): Promise<Map<string, DailyNutritionRecord>> {
  if (dates.length === 0) return new Map();
  const unique = Array.from(new Set(dates));
  const meals = await db.meals.where('date').anyOf(unique).toArray();
  if (meals.length === 0) return new Map();

  const items = await db.mealItems.where('mealId').anyOf(meals.map((meal) => meal.id)).toArray();

  const mealDate = new Map(meals.map((meal) => [meal.id, meal.date]));
  const records = new Map<string, DailyNutritionRecord>();

  for (const item of items) {
    const date = mealDate.get(item.mealId);
    if (!date) continue;
    const existing =
      records.get(date) ??
      ({ date, ...EMPTY_NUTRITION, itemCount: 0 } satisfies DailyNutritionRecord);
    existing.calories += item.caloriesSnapshot;
    existing.protein += item.proteinSnapshot;
    existing.carbs += item.carbsSnapshot;
    existing.fat += item.fatSnapshot;
    existing.fiber += item.fiberSnapshot;
    existing.itemCount += 1;
    records.set(date, existing);
  }

  for (const record of records.values()) {
    record.calories = round(record.calories, 1);
    record.protein = round(record.protein, 1);
    record.carbs = round(record.carbs, 1);
    record.fat = round(record.fat, 1);
    record.fiber = round(record.fiber, 1);
  }

  return records;
}

export async function getDailyNutritionInRange(start: string, end: string): Promise<Map<string, DailyNutritionRecord>> {
  const meals = await db.meals.where('date').between(start, end, true, true).toArray();
  if (meals.length === 0) return new Map();
  const items = await db.mealItems.where('mealId').anyOf(meals.map((meal) => meal.id)).toArray();
  const mealDate = new Map(meals.map((meal) => [meal.id, meal.date]));
  const records = new Map<string, DailyNutritionRecord>();
  for (const item of items) {
    const date = mealDate.get(item.mealId);
    if (!date) continue;
    const existing = records.get(date) ?? ({ date, ...EMPTY_NUTRITION, itemCount: 0 } satisfies DailyNutritionRecord);
    existing.calories += item.caloriesSnapshot;
    existing.protein += item.proteinSnapshot;
    existing.carbs += item.carbsSnapshot;
    existing.fat += item.fatSnapshot;
    existing.fiber += item.fiberSnapshot;
    existing.itemCount += 1;
    records.set(date, existing);
  }
  return records;
}

export async function getAllMealItemsByDate(): Promise<Map<string, MealItem[]>> {
  const meals = await db.meals.toArray();
  if (meals.length === 0) return new Map();
  const items = await db.mealItems.where('mealId').anyOf(meals.map((meal) => meal.id)).toArray();
  const mealDate = new Map(meals.map((meal) => [meal.id, meal.date]));
  const byDate = new Map<string, MealItem[]>();
  for (const item of items) {
    const date = mealDate.get(item.mealId);
    if (!date) continue;
    const list = byDate.get(date);
    if (list) list.push(item);
    else byDate.set(date, [item]);
  }
  return byDate;
}

export function itemsToNutrition(items: MealItem[]): NutritionTotals {
  return items.reduce<NutritionTotals>(
    (total, item) => ({
      calories: total.calories + item.caloriesSnapshot,
      protein: total.protein + item.proteinSnapshot,
      carbs: total.carbs + item.carbsSnapshot,
      fat: total.fat + item.fatSnapshot,
      fiber: total.fiber + item.fiberSnapshot,
    }),
    { ...EMPTY_NUTRITION },
  );
}

export function groupByDate(items: MealItem[]): Map<string, MealItem[]> {
  return groupItemsByMealId(items);
}
