import type { Meal, MealItem, NutritionTotals, Per100gNutrition } from '@/types';
import { EMPTY_NUTRITION } from '@/types';
import { round } from '@/utils/numbers/numbers';

export type { Per100gNutrition };

function scalePer100g(nutrition: Per100gNutrition, quantityGrams: number): NutritionTotals {
  const factor = quantityGrams / 100;
  return {
    calories: nutrition.caloriesPer100g * factor,
    protein: nutrition.proteinPer100g * factor,
    carbs: nutrition.carbsPer100g * factor,
    fat: nutrition.fatPer100g * factor,
    fiber: nutrition.fiberPer100g * factor,
  };
}

export function addNutrition(a: NutritionTotals, b: NutritionTotals): NutritionTotals {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: a.fiber + b.fiber,
  };
}

export function scaleNutrition(nutrition: NutritionTotals, grams: number): NutritionTotals {
  return {
    calories: nutrition.calories * (grams / 100),
    protein: nutrition.protein * (grams / 100),
    carbs: nutrition.carbs * (grams / 100),
    fat: nutrition.fat * (grams / 100),
    fiber: nutrition.fiber * (grams / 100),
  };
}

export function roundNutrition(nutrition: NutritionTotals): NutritionTotals {
  return {
    calories: round(nutrition.calories, 1),
    protein: round(nutrition.protein, 1),
    carbs: round(nutrition.carbs, 1),
    fat: round(nutrition.fat, 1),
    fiber: round(nutrition.fiber, 1),
  };
}

/**
 * nutrition = nutritionPer100g x quantityGrams / 100
 *
 * The result is the absolute nutrition for the entered quantity. This is the
 * single place quantity maths happens; nothing is precomputed or stored.
 */
export function calculateFoodNutrition(
  food: Per100gNutrition,
  quantityGrams: number,
): NutritionTotals {
  if (!Number.isFinite(quantityGrams) || quantityGrams <= 0) return EMPTY_NUTRITION;
  return roundNutrition(scalePer100g(food, quantityGrams));
}

export function nutritionFromItem(item: MealItem): NutritionTotals {
  return {
    calories: item.caloriesSnapshot,
    protein: item.proteinSnapshot,
    carbs: item.carbsSnapshot,
    fat: item.fatSnapshot,
    fiber: item.fiberSnapshot,
  };
}

export function calculateItemsNutrition(items: MealItem[]): NutritionTotals {
  return items.reduce<NutritionTotals>((total, item) => addNutrition(total, nutritionFromItem(item)), {
    ...EMPTY_NUTRITION,
  });
}

export function calculateMealNutrition(items: MealItem[]): NutritionTotals {
  return calculateItemsNutrition(items);
}

export interface DayMeals {
  meals: Meal[];
  itemsByMealId: Map<string, MealItem[]>;
}

export function calculateDailyNutrition(day: DayMeals): NutritionTotals {
  let total: NutritionTotals = { ...EMPTY_NUTRITION };
  for (const meal of day.meals) {
    const items = day.itemsByMealId.get(meal.id) ?? [];
    total = addNutrition(total, calculateItemsNutrition(items));
  }
  return roundNutrition(total);
}

export function groupItemsByMealId(items: MealItem[]): Map<string, MealItem[]> {
  const map = new Map<string, MealItem[]>();
  for (const item of items) {
    const list = map.get(item.mealId);
    if (list) list.push(item);
    else map.set(item.mealId, [item]);
  }
  return map;
}

/** Food items are stored immutably so historical meals never change. */
export function buildSnapshot(food: Per100gNutrition, quantityGrams: number) {
  const nutrition = calculateFoodNutrition(food, quantityGrams);
  return {
    quantityGrams: round(quantityGrams, 2),
    caloriesSnapshot: round(nutrition.calories, 1),
    proteinSnapshot: round(nutrition.protein, 1),
    carbsSnapshot: round(nutrition.carbs, 1),
    fatSnapshot: round(nutrition.fat, 1),
    fiberSnapshot: round(nutrition.fiber, 1),
  };
}
