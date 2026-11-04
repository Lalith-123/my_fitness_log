import type { Goal } from '@/types';
import { diffInDays } from '@/utils/dates/dates';
import { round } from '@/utils/numbers/numbers';

/**
 * The weight the active goal's pace puts the user at on `date`.
 *
 * Used to pre-fill the daily weight prompt so the expected figure is already
 * there; the user can adjust it when their real weight differs. Losing and
 * gaining stop at the goal target instead of projecting past it.
 */
export function suggestedWeightForDate(goal: Goal | null, date: string): number | null {
  if (!goal) return null;

  const weeklyChange = Math.abs(goal.weeklyChangeKg ?? 0);
  if (goal.type === 'maintain' || weeklyChange === 0) {
    return round(goal.targetWeightKg, 1);
  }

  const days = diffInDays(goal.startedAt, date);
  if (days <= 0) return round(goal.startingWeightKg, 1);

  const change = (days / 7) * weeklyChange;
  const projected =
    goal.type === 'lose'
      ? goal.startingWeightKg - change
      : goal.startingWeightKg + change;

  const bounded =
    goal.type === 'lose'
      ? Math.max(projected, Math.min(goal.targetWeightKg, goal.startingWeightKg))
      : Math.min(projected, Math.max(goal.targetWeightKg, goal.startingWeightKg));

  return round(bounded, 1);
}
