import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo, useState } from 'react';
import { db, METADATA_KEYS } from '@/db/database';
import { seedFoodDatabaseIfNeeded } from '@/db/seed';
import { getSettings } from '@/services/settings/settings';
import { calculateTargetCalories } from '@/services/nutrition/targets';
import { energyInputFromProfile } from '@/services/nutrition/energy';
import { calculateWeightProgress, evaluateGoalCompletion } from '@/services/goals/goals';
import { getMealsForDate, getItemsForMeals } from '@/services/meals/meals';
import { calculateDailyNutrition, type DayMeals } from '@/services/nutrition/nutrition';
import { getTodayLocalDate } from '@/utils/dates/dates';
import { PROFILE_ID } from '@/services/profile/profile';
import type {
  AppSettings,
  Goal,
  Meal,
  MealItem,
  NutritionTotals,
  UserProfile,
  WeightLog,
} from '@/types';

export function useProfile(): UserProfile | undefined {
  return useLiveQuery(() => db.profiles.get(PROFILE_ID), [], undefined);
}

export function useIsOnboarded(): boolean | undefined {
  return useLiveQuery(async () => {
    const [profile, marker] = await Promise.all([
      db.profiles.get(PROFILE_ID),
      db.metadata.get(METADATA_KEYS.onboardingCompleted),
    ]);
    return Boolean(profile) && marker?.value === 'true';
  }, [], undefined);
}

export function useSettings(): AppSettings | undefined {
  return useLiveQuery(() => getSettings(), [], undefined);
}

export function useActiveGoal(): Goal | undefined {
  return useLiveQuery(() => db.goals.where('status').equals('active').first(), [], undefined);
}

export function useCompletedGoals(): Goal[] {
  return useLiveQuery(() => db.goals.where('status').equals('completed').toArray(), [], []);
}

export function useAllGoals(): Goal[] {
  return useLiveQuery(() => db.goals.toArray(), [], []);
}

export function useWeightLogs(): WeightLog[] {
  return useLiveQuery(
    async () => {
      const logs = await db.weightLogs.toArray();
      return logs.sort((a, b) => a.date.localeCompare(b.date));
    },
    [],
    [],
  );
}

export function useLatestWeight(): WeightLog | undefined {
  const logs = useWeightLogs();
  return logs.length > 0 ? logs[logs.length - 1] : undefined;
}

export interface TargetCalories {
  bmr: number;
  tdee: number;
  target: number;
  rawTarget: number;
  limited: boolean;
  notice?: string;
  severity: 'ok' | 'caution' | 'blocked';
}

/** Derived daily calorie target. Never stored, always recalculated. */
export function useTargetCalories(): TargetCalories | null {
  const profile = useProfile();
  const goal = useActiveGoal();

  return useMemo(() => {
    if (!profile || !goal) return null;
    const result = calculateTargetCalories(
      energyInputFromProfile(profile),
      {
        type: goal.type,
        startingWeightKg: goal.startingWeightKg,
        targetWeightKg: goal.targetWeightKg,
        weeklyChangeKg: goal.weeklyChangeKg,
      },
      { bmr: profile.bmrOverride, tdee: profile.tdeeOverride, target: profile.targetOverride },
    );
    return {
      bmr: result.bmr,
      tdee: result.tdee,
      target: result.target,
      rawTarget: result.rawTarget,
      limited: result.limited,
      notice: result.notice,
      severity: result.severity,
    };
  }, [profile, goal]);
}

/** Macro targets derived from the calorie target using a 30/45/25 split. */
export function useMacroTargets(): { protein: number; carbs: number; fat: number } | null {
  const calories = useTargetCalories();
  return useMemo(() => {
    if (!calories) return null;
    const proteinRatio = 0.3;
    const carbRatio = 0.45;
    const fatRatio = 0.25;
    return {
      protein: Math.round((calories.target * proteinRatio) / 4),
      carbs: Math.round((calories.target * carbRatio) / 4),
      fat: Math.round((calories.target * fatRatio) / 9),
    };
  }, [calories]);
}

export function useWeightProgress() {
  const goal = useActiveGoal();
  const latest = useLatestWeight();
  return useMemo(() => calculateWeightProgress(goal, latest), [goal, latest]);
}

export interface DayData {
  date: string;
  meals: Meal[];
  nutrition: NutritionTotals;
  itemsByMealId: Map<string, MealItem[]>;
  weight: WeightLog | undefined;
  loaded: boolean;
}

export function useDayData(date: string): DayData {
  const query = useLiveQuery(async () => {
    const meals = await getMealsForDate(date);
    const itemsByMealId = await getItemsForMeals(meals.map((meal) => meal.id));
    const weight = await db.weightLogs.where('date').equals(date).first();
    return { meals, itemsByMealId, weight };
  }, [date]);

  const nutrition = useMemo(() => {
    if (!query) return null;
    const day: DayMeals = { meals: query.meals, itemsByMealId: query.itemsByMealId };
    return calculateDailyNutrition(day);
  }, [query]);

  return useMemo(
    () => ({
      date,
      meals: query?.meals ?? [],
      itemsByMealId: query?.itemsByMealId ?? new Map(),
      nutrition: nutrition ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      weight: query?.weight,
      loaded: query !== undefined,
    }),
    [date, query, nutrition],
  );
}

/** Earliest date with any record. Bounds the date navigator. */
export function useFirstRecordedDate(): string {
  return (
    useLiveQuery(async () => {
      const today = getTodayLocalDate();
      const [firstMeal, firstWeight] = await Promise.all([
        db.meals.orderBy('date').first(),
        db.weightLogs.orderBy('date').first(),
      ]);
      const candidates = [firstMeal?.date, firstWeight?.date].filter(
        (value): value is string => Boolean(value),
      );
      if (candidates.length === 0) return today;
      return candidates.reduce((earliest, value) => (value < earliest ? value : earliest), today);
    }, [], getTodayLocalDate()) ?? getTodayLocalDate()
  );
}

/**
 * Run the food seed once on startup, then re-check goal completion whenever the
 * latest weight changes.
 */
export function useAppBootstrap(
  onGoalCompleted?: (message: string) => void,
): { status: 'loading' | 'ready' | 'error' } {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const latest = useLatestWeight();
  const activeGoal = useActiveGoal();
  const onboarded = useIsOnboarded();

  useEffect(() => {
    let cancelled = false;
    seedFoodDatabaseIfNeeded()
      .then(() => {
        if (!cancelled) setStatus('ready');
      })
      .catch(() => {
        // Only a genuine failure reaches here. A slow first run stays in
        // 'loading' rather than being misreported as blocked storage.
        if (!cancelled) setStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !onboarded || !activeGoal || !latest) return;
    let cancelled = false;
    evaluateGoalCompletion(activeGoal, latest)
      .then((result) => {
        if (!cancelled && result.message) onGoalCompleted?.(result.message);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [status, onboarded, activeGoal, latest, onGoalCompleted]);

  return { status };
}
