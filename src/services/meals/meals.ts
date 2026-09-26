import { db } from '@/db/database';
import { createId, nowIso } from '@/utils/id';
import { round } from '@/utils/numbers/numbers';
import { isFutureDate } from '@/utils/dates/dates';
import { buildSnapshot, groupItemsByMealId } from '@/services/nutrition/nutrition';
import { recordRecentFood } from '@/services/foods/foods';
import { validateQuantityGrams } from '@/utils/validation/validation';
import type { Meal, MealItem, MealType, NutritionTotals, Per100gNutrition } from '@/types';
import { EMPTY_NUTRITION, MEAL_TYPES } from '@/types';

export const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

export const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function isMealType(value: string): value is MealType {
  return (MEAL_TYPES as string[]).includes(value);
}

/** The meal that most likely matches the current time of day, for quick logging. */
export function suggestMealTypeForTime(hour: number): MealType {
  if (hour < 10) return 'breakfast';
  if (hour < 15) return 'lunch';
  if (hour < 21) return 'dinner';
  return 'snack';
}

export async function getMealsForDate(date: string): Promise<Meal[]> {
  const meals = await db.meals.where('date').equals(date).toArray();
  return meals.sort((a, b) => MEAL_ORDER.indexOf(a.mealType) - MEAL_ORDER.indexOf(b.mealType));
}

export async function getItemsForMeals(mealIds: string[]): Promise<Map<string, MealItem[]>> {
  if (mealIds.length === 0) return new Map();
  const items = await db.mealItems.where('mealId').anyOf(mealIds).toArray();
  const grouped = groupItemsByMealId(items);
  for (const list of grouped.values()) {
    list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
  return grouped;
}

export async function getItemsForDate(date: string): Promise<MealItem[]> {
  const meals = await db.meals.where('date').equals(date).toArray();
  if (meals.length === 0) return [];
  return db.mealItems.where('mealId').anyOf(meals.map((meal) => meal.id)).toArray();
}

/** Reuse the meal row for a date and type; create it only when missing. */
export async function ensureMeal(date: string, mealType: MealType): Promise<Meal> {
  if (isFutureDate(date)) throw new Error('Cannot log food for a future date.');
  const existing = await db.meals.where('[date+mealType]').equals([date, mealType]).first();
  if (existing) return existing;
  const meal: Meal = { id: createId('meal'), date, mealType, createdAt: nowIso() };
  await db.meals.add(meal);
  return meal;
}

export interface AddItemInput {
  date: string;
  mealType: MealType;
  foodId: string;
  foodName: string;
  quantityGrams: number;
  nutrition: Per100gNutrition;
}

export async function addMealItem(input: AddItemInput): Promise<MealItem> {
  const validation = validateQuantityGrams(input.quantityGrams);
  if (!validation.ok) throw new Error(validation.message ?? 'Invalid quantity.');

  const snapshot = buildSnapshot(input.nutrition, input.quantityGrams);
  const item: MealItem = {
    id: createId('item'),
    mealId: '',
    foodId: input.foodId,
    foodNameSnapshot: input.foodName,
    per100g: { ...input.nutrition },
    ...snapshot,
    createdAt: nowIso(),
  };

  const meal = await ensureMeal(input.date, input.mealType);
  item.mealId = meal.id;

  await db.mealItems.add(item);
  await recordRecentFood(input.foodId);
  return item;
}

/**
 * Change the amount of a logged item.
 *
 * Only the quantity and the rescaled totals change. The per 100 g reference and
 * the name snapshot stored on the item are reused, so a later edit to the food
 * itself can never rewrite this entry.
 */
export async function updateMealItemQuantity(itemId: string, quantityGrams: number): Promise<void> {
  const validation = validateQuantityGrams(quantityGrams);
  if (!validation.ok) throw new Error(validation.message ?? 'Invalid quantity.');

  const item = await db.mealItems.get(itemId);
  if (!item) throw new Error('Entry not found.');

  const snapshot = buildSnapshot(item.per100g, quantityGrams);
  await db.mealItems.update(itemId, snapshot);
}

export async function deleteMealItem(itemId: string): Promise<void> {
  await db.mealItems.delete(itemId);
}

export async function deleteMeal(mealId: string): Promise<void> {
  await db.transaction('rw', db.meals, db.mealItems, async () => {
    await db.mealItems.where('mealId').equals(mealId).delete();
    await db.meals.delete(mealId);
  });
}

export function sumItemsNutrition(items: MealItem[]): NutritionTotals {
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

export function roundItemQuantity(value: number): number {
  return round(value, 2);
}
