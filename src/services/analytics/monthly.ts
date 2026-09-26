import { db } from '@/db/database';
import { MEAL_LABELS } from '@/services/meals/meals';
import { average, round } from '@/utils/numbers/numbers';
import {
  formatFullDate,
  getMonthBounds,
  getMonthRange,
  getMonthKey,
  type DateInput,
} from '@/utils/dates/dates';
import type { DailyNutritionRecord } from './daily';
import type { Meal, MealItem, NutritionTotals, WeightLog } from '@/types';
import { EMPTY_NUTRITION } from '@/types';

export interface MonthlySummary {
  monthKey: string;
  daysInMonth: number;
  daysLogged: number;
  averageCalories: number | null;
  averageProtein: number | null;
  averageCarbs: number | null;
  averageFat: number | null;
  averageFiber: number | null;
  totalCalories: number;
  startingWeightKg: number | null;
  endingWeightKg: number | null;
  weightChangeKg: number | null;
  firstLogDate: string | null;
  lastLogDate: string | null;
}

/**
 * Calendar-month summary. Averages use only days with logged food, so missing
 * days never register as zero intake.
 */
export function calculateMonthlySummary(
  monthKey: string,
  records: Map<string, DailyNutritionRecord>,
  weightLogs: WeightLog[],
): MonthlySummary {
  const { start, end } = getMonthBounds(monthKey);
  const inMonth = (date: string) => date >= start && date <= end;

  const monthRecords = Array.from(records.values()).filter((record) => inMonth(record.date));
  const monthWeights = weightLogs.filter((log) => inMonth(log.date));

  const values = (key: keyof NutritionTotals) => monthRecords.map((record) => record[key]);

  const totalCalories = round(
    monthRecords.reduce((total, record) => total + record.calories, 0),
    0,
  );

  const startingWeightKg = monthWeights.length > 0 ? monthWeights[0].weightKg : null;
  const endingWeightKg = monthWeights.length > 0 ? monthWeights[monthWeights.length - 1].weightKg : null;

  return {
    monthKey,
    daysInMonth: getMonthRange(monthKey).length,
    daysLogged: monthRecords.length,
    averageCalories: monthRecords.length > 0 ? round(average(values('calories')) as number, 0) : null,
    averageProtein: monthRecords.length > 0 ? round(average(values('protein')) as number, 1) : null,
    averageCarbs: monthRecords.length > 0 ? round(average(values('carbs')) as number, 1) : null,
    averageFat: monthRecords.length > 0 ? round(average(values('fat')) as number, 1) : null,
    averageFiber: monthRecords.length > 0 ? round(average(values('fiber')) as number, 1) : null,
    totalCalories,
    startingWeightKg,
    endingWeightKg,
    weightChangeKg:
      startingWeightKg !== null && endingWeightKg !== null
        ? round(endingWeightKg - startingWeightKg, 1)
        : null,
    firstLogDate: monthWeights.length > 0 ? monthWeights[0].date : null,
    lastLogDate: monthWeights.length > 0 ? monthWeights[monthWeights.length - 1].date : null,
  };
}

export interface MonthOption {
  monthKey: string;
  daysLogged: number;
  hasWeight: boolean;
}

/** Months that contain data, newest first, including the current month. */
export async function getAvailableMonths(today: string): Promise<MonthOption[]> {
  const [meals, weightLogs] = await Promise.all([db.meals.toArray(), db.weightLogs.toArray()]);
  const counts = new Map<string, number>();
  for (const meal of meals) {
    const key = getMonthKey(meal.date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const weights = new Set(weightLogs.map((log) => getMonthKey(log.date)));

  const keys = new Set<string>([getMonthKey(today), ...counts.keys(), ...weights]);
  return Array.from(keys)
    .sort((a, b) => b.localeCompare(a))
    .map((monthKey) => ({
      monthKey,
      daysLogged: new Set(meals.filter((meal) => getMonthKey(meal.date) === monthKey).map((meal) => meal.date)).size,
      hasWeight: weights.has(monthKey),
    }));
}

export interface Insight {
  id: string;
  text: string;
}

export interface InsightInput {
  records: Map<string, DailyNutritionRecord>;
  weightLogs: WeightLog[];
  today: string;
  targetCalories: number | null;
  proteinTargetGrams: number | null;
  calories7: number | null;
  loggedDays7: number;
  totalLoggedDays: number;
}

/**
 * Descriptive observations only. Nothing here tells the user what to do or
 * judges intake; every line reports what was recorded.
 */
export function buildInsights(input: InsightInput): Insight[] {
  const insights: Insight[] = [];

  if (input.calories7 !== null) {
    const targetSuffix =
      input.targetCalories !== null
        ? ` against a target of ${Math.round(input.targetCalories).toLocaleString()} kcal`
        : '';
    insights.push({
      id: 'calories-7',
      text: `Average intake over the last ${input.loggedDays7} logged day${input.loggedDays7 === 1 ? '' : 's'}: ${Math.round(input.calories7).toLocaleString()} kcal${targetSuffix}.`,
    });
  }

  const { weightLogs } = input;
  if (weightLogs.length >= 2) {
    const first = weightLogs[0];
    const last = weightLogs[weightLogs.length - 1];
    const change = round(last.weightKg - first.weightKg, 1);
    const direction = change > 0 ? 'up' : change < 0 ? 'down' : 'unchanged';
    insights.push({
      id: 'weight-change',
      text: `Weight went from ${first.weightKg.toFixed(1)} kg to ${last.weightKg.toFixed(1)} kg (${direction} ${Math.abs(change).toFixed(1)} kg) across ${weightLogs.length} recorded entries.`,
    });
  }

  insights.push({
    id: 'consistency-7',
    text: `Food was logged on ${input.loggedDays7} of the last 7 days.`,
  });

  if (input.totalLoggedDays > 0) {
    insights.push({
      id: 'total-logged',
      text: `${input.totalLoggedDays} day${input.totalLoggedDays === 1 ? '' : 's'} of food records in total.`,
    });
  }

  return insights;
}

export interface MonthlyRow {
  date: string;
  displayDate: string;
  mealLabel: string;
  food: string;
  quantityGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  weightKg: number | null;
}

export interface MonthlyCsvRow {
  date: string;
  meal: string;
  food: string;
  quantityGrams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  weightKg: number | null;
}

/** Build the flat row set for a month's CSV, ordered by date then meal order. */
export async function buildMonthlyRows(monthKey: string): Promise<MonthlyCsvRow[]> {
  const { start, end } = getMonthBounds(monthKey);
  const meals = (await db.meals.where('date').between(start, end, true, true).toArray()) as Meal[];
  if (meals.length === 0) return [];

  const items = (await db.mealItems.where('mealId').anyOf(meals.map((meal) => meal.id)).toArray()) as MealItem[];
  const weights = await db.weightLogs.where('date').between(start, end, true, true).toArray();
  const weightByDate = new Map(weights.map((log) => [log.date, log.weightKg]));

  const mealById = new Map(meals.map((meal) => [meal.id, meal]));
  const order = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 } as const;

  const rows: MonthlyCsvRow[] = items.map((item) => {
    const meal = mealById.get(item.mealId);
    return {
      date: meal?.date ?? '',
      meal: meal ? MEAL_LABELS[meal.mealType] : '',
      food: item.foodNameSnapshot,
      quantityGrams: round(item.quantityGrams, 1),
      calories: round(item.caloriesSnapshot, 0),
      protein: round(item.proteinSnapshot, 1),
      carbs: round(item.carbsSnapshot, 1),
      fat: round(item.fatSnapshot, 1),
      fiber: round(item.fiberSnapshot, 1),
      weightKg: meal ? (weightByDate.get(meal.date) ?? null) : null,
    };
  });

  rows.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    const mealA = Object.keys(order).find((key) => MEAL_LABELS[key as keyof typeof MEAL_LABELS] === a.meal) ?? 'snack';
    const mealB = Object.keys(order).find((key) => MEAL_LABELS[key as keyof typeof MEAL_LABELS] === b.meal) ?? 'snack';
    return order[mealA as keyof typeof order] - order[mealB as keyof typeof order];
  });

  return rows;
}

export function nutritionForMonth(
  records: Map<string, DailyNutritionRecord>,
  monthKey: string,
): NutritionTotals {
  const { start, end } = getMonthBounds(monthKey);
  let total: NutritionTotals = { ...EMPTY_NUTRITION };
  for (const record of records.values()) {
    if (record.date < start || record.date > end) continue;
    total = {
      calories: total.calories + record.calories,
      protein: total.protein + record.protein,
      carbs: total.carbs + record.carbs,
      fat: total.fat + record.fat,
      fiber: total.fiber + record.fiber,
    };
  }
  return total;
}

export function formatDateForCsv(date: string): string {
  return formatFullDate(date);
}

export function toDateInput(value: DateInput): string {
  if (typeof value === 'string') return value;
  return value instanceof Date ? formatFullDate(value.toISOString().slice(0, 10)) : String(value);
}
