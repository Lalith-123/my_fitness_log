import type { DailyNutritionRecord } from './daily';
import type { WeightLog } from '@/types';
import { addDays, getRecentRange } from '@/utils/dates/dates';
import { average, round } from '@/utils/numbers/numbers';

export interface RollingAverage<TValue> {
  /** The raw value on this date, when one exists. */
  value: TValue | null;
  /** Rolling mean across the window ending on this date, logged days only. */
  average: number | null;
  /** How many of the window's days have a logged value. */
  loggedDays: number;
  windowDays: number;
}

export type RollingSeries = Record<string, RollingAverage<number>>;

function buildRollingSeries(
  byDate: Map<string, number>,
  dates: string[],
  windowDays: number,
): RollingSeries {
  const series: RollingSeries = {};
  dates.forEach((date, index) => {
    const window = dates.slice(Math.max(0, index - windowDays + 1), index + 1);
    const values = window.map((key) => byDate.get(key)).filter((value): value is number => typeof value === 'number');
    series[date] = {
      value: byDate.get(date) ?? null,
      average: values.length > 0 ? round(average(values) as number, 2) : null,
      loggedDays: values.length,
      windowDays: window.length,
    };
  });
  return series;
}

export interface WeightAnalytics {
  /** 30-day rolling mean per date. */
  series: RollingSeries;
  /** 7-day rolling mean per date. */
  series7: RollingSeries;
  latest: WeightLog | undefined;
  latestAverage7: number | null;
  latestAverage30: number | null;
  totalChangeKg: number | null;
  first: WeightLog | undefined;
}

export function calculateWeightAnalytics(logs: WeightLog[], today: string, days = 90): WeightAnalytics {
  const byDate = new Map(logs.map((log) => [log.date, log.weightKg]));
  const dates = getRecentRange(today, days);
  const series = buildRollingSeries(byDate, dates, 30);
  const series7 = buildRollingSeries(byDate, dates, 7);

  const latest = logs.length > 0 ? logs[logs.length - 1] : undefined;
  const first = logs.length > 0 ? logs[0] : undefined;

  return {
    series,
    series7,
    latest,
    latestAverage7: latest ? series7[latest.date]?.average ?? null : null,
    latestAverage30: latest ? series[latest.date]?.average ?? null : null,
    totalChangeKg:
      first && latest ? round(latest.weightKg - first.weightKg, 1) : null,
    first,
  };
}

export interface CalorieAnalytics {
  /** Raw daily calories, only for days with food logged. */
  byDate: Record<string, number>;
  series7: RollingSeries;
  series30: RollingSeries;
  last7: number | null;
  last30: number | null;
  loggedDays7: number;
  loggedDays30: number;
}

/**
 * Rolling calorie averages. Days without logged food are excluded entirely, so
 * a gap lowers the "days logged" count rather than dragging the average down.
 */
export function calculateCalorieAnalytics(
  records: Map<string, DailyNutritionRecord>,
  today: string,
  days = 90,
): CalorieAnalytics {
  const byDateMap = new Map<string, number>();
  records.forEach((record, date) => byDateMap.set(date, record.calories));

  const dates = getRecentRange(today, days);
  const series30 = buildRollingSeries(byDateMap, dates, 30);
  const series7 = buildRollingSeries(byDateMap, dates, 7);

  const window7 = dates.slice(-7);
  const window30 = dates.slice(-30);
  const logged7 = window7.filter((date) => byDateMap.has(date));
  const logged30 = window30.filter((date) => byDateMap.has(date));

  return {
    byDate: Object.fromEntries(byDateMap),
    series7,
    series30,
    last7: logged7.length > 0 ? round(average(logged7.map((date) => byDateMap.get(date) as number)) as number, 0) : null,
    last30:
      logged30.length > 0
        ? round(average(logged30.map((date) => byDateMap.get(date) as number)) as number, 0)
        : null,
    loggedDays7: logged7.length,
    loggedDays30: logged30.length,
  };
}

export interface ConsistencySummary {
  loggedDays: number;
  windowDays: number;
  /** Consecutive days ending today (or yesterday) that have food logged. */
  currentStreak: number;
}

export function calculateConsistency(
  records: Map<string, DailyNutritionRecord>,
  today: string,
  windowDays: number,
): ConsistencySummary {
  const dates = getRecentRange(today, windowDays);
  const loggedDays = dates.filter((date) => records.has(date)).length;

  let streak = 0;
  let cursor = today;
  if (!records.has(cursor)) {
    cursor = addDays(today, -1);
  }
  while (records.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }

  return { loggedDays, windowDays: dates.length, currentStreak: streak };
}
