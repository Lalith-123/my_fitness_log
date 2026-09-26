import { db } from '@/db/database';
import { createId, nowIso } from '@/utils/id';
import { isFutureDate, isValidDateKey } from '@/utils/dates/dates';
import { validateWeightKg } from '@/utils/validation/validation';
import { round } from '@/utils/numbers/numbers';
import type { WeightLog } from '@/types';

export async function getWeightLogs(): Promise<WeightLog[]> {
  const logs = await db.weightLogs.toArray();
  return logs.sort((a, b) => a.date.localeCompare(b.date));
}

export async function getWeightLog(date: string): Promise<WeightLog | undefined> {
  return db.weightLogs.where('date').equals(date).first();
}

export function validateWeightInput(date: string, weightKg: number): string | null {
  if (!isValidDateKey(date)) return 'Enter a valid date.';
  if (isFutureDate(date)) return 'Weight cannot be logged for a future date.';
  return validateWeightKg(weightKg).message ?? null;
}

/** One primary weight record per day. Logging again updates the same row. */
export async function logWeight(date: string, weightKg: number): Promise<WeightLog> {
  const error = validateWeightInput(date, weightKg);
  if (error) throw new Error(error);

  const existing = await db.weightLogs.where('date').equals(date).first();
  if (existing) {
    await db.weightLogs.update(existing.id, { weightKg: round(weightKg, 2) });
    return { ...existing, weightKg: round(weightKg, 2) };
  }

  const log: WeightLog = {
    id: createId('wgt'),
    date,
    weightKg: round(weightKg, 2),
    createdAt: nowIso(),
  };
  await db.weightLogs.add(log);
  return log;
}

export async function deleteWeightLog(logId: string): Promise<void> {
  await db.weightLogs.delete(logId);
}

export function getLatestWeightLog(logs: WeightLog[]): WeightLog | undefined {
  return logs.length > 0 ? logs[logs.length - 1] : undefined;
}
