import { db } from '@/db/database';
import { createId, nowIso } from '@/utils/id';
import { round } from '@/utils/numbers/numbers';
import { validateGoal, type GoalInput } from '@/services/nutrition/targets';
import type { Goal, GoalType, WeightLog } from '@/types';

export interface GoalWithMeta extends Goal {
  isAutoCompleted?: boolean;
}

export async function getGoals(): Promise<Goal[]> {
  const goals = await db.goals.toArray();
  return goals.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export async function getActiveGoal(): Promise<Goal | undefined> {
  return db.goals.where('status').equals('active').first();
}

export async function getCompletedGoals(): Promise<Goal[]> {
  const goals = await db.goals.where('status').equals('completed').toArray();
  return goals.sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
}

export async function createGoal(input: GoalInput & { startedAt?: string }): Promise<Goal> {
  const validation = validateGoal(input);
  if (validation.weekly.severity === 'blocked') {
    throw new Error(validation.weekly.message ?? 'This weekly target is outside the supported range.');
  }
  if (!validation.direction.ok) throw new Error(validation.direction.message ?? 'Invalid target weight.');
  if (!validation.reachable.ok) throw new Error(validation.reachable.message ?? 'Invalid target weight.');

  const timestamp = nowIso();
  const goal: Goal = {
    id: createId('goal'),
    type: input.type,
    startingWeightKg: round(input.startingWeightKg, 2),
    targetWeightKg: round(input.targetWeightKg, 2),
    weeklyChangeKg: input.weeklyChangeKg ? round(input.weeklyChangeKg, 2) : undefined,
    status: 'active',
    startedAt: input.startedAt ?? timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.goals.add(goal);
  return goal;
}

export async function updateGoal(goalId: string, input: GoalInput): Promise<Goal> {
  const existing = await db.goals.get(goalId);
  if (!existing) throw new Error('Goal not found.');

  const validation = validateGoal(input);
  if (validation.weekly.severity === 'blocked') {
    throw new Error(validation.weekly.message ?? 'This weekly target is outside the supported range.');
  }
  if (!validation.direction.ok) throw new Error(validation.direction.message ?? 'Invalid target weight.');
  if (!validation.reachable.ok) throw new Error(validation.reachable.message ?? 'Invalid target weight.');

  await db.goals.update(goalId, {
    type: input.type,
    startingWeightKg: round(input.startingWeightKg, 2),
    targetWeightKg: round(input.targetWeightKg, 2),
    weeklyChangeKg: input.weeklyChangeKg ? round(input.weeklyChangeKg, 2) : undefined,
    status: 'active',
    completedAt: undefined,
    updatedAt: nowIso(),
  });

  const updated = await db.goals.get(goalId);
  if (!updated) throw new Error('Goal not found.');
  return updated;
}

export interface GoalCompletionResult {
  completedGoal?: Goal;
  maintenanceGoal?: Goal;
  message?: string;
}

function hasReachedTarget(goal: Goal, latestWeightKg: number): boolean {
  if (goal.type === 'lose') return latestWeightKg <= goal.targetWeightKg;
  if (goal.type === 'gain') return latestWeightKg >= goal.targetWeightKg;
  return true;
}

const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  lose: 'weight loss',
  maintain: 'weight maintenance',
  gain: 'weight gain',
};

/**
 * When the latest recorded weight has reached the target, complete the goal and
 * switch to a maintenance goal at the achieved weight.
 *
 * The finished goal is preserved in full (start weight, target, weekly rate,
 * start date, completion date) and is never deleted.
 */
export async function evaluateGoalCompletion(
  activeGoal: Goal | undefined,
  latest: WeightLog | undefined,
): Promise<GoalCompletionResult> {
  if (!activeGoal || !latest) return {};
  if (activeGoal.type === 'maintain') return {};
  if (!hasReachedTarget(activeGoal, latest.weightKg)) return {};

  const completionDate = latest.date;
  const completed: Goal = {
    ...activeGoal,
    status: 'completed',
    completedAt: completionDate,
    updatedAt: nowIso(),
  };

  const existingMaintenance = await db.goals
    .where('status')
    .equals('active')
    .filter((goal) => goal.id !== activeGoal.id)
    .first();

  const timestamp = nowIso();
  const maintenance: Goal =
    existingMaintenance ??
    ({
      id: createId('goal'),
      type: 'maintain',
      startingWeightKg: round(latest.weightKg, 2),
      targetWeightKg: round(latest.weightKg, 2),
      status: 'active',
      startedAt: completionDate,
      createdAt: timestamp,
      updatedAt: timestamp,
    } satisfies Goal);

  await db.transaction('rw', db.goals, async () => {
    await db.goals.put(completed);
    await db.goals.put(maintenance);
  });

  return {
    completedGoal: completed,
    maintenanceGoal: maintenance,
    message: `Target reached. Your ${GOAL_TYPE_LABEL[completed.type]} goal is complete and you are now in maintenance mode.`,
  };
}

export interface WeightProgress {
  startingWeightKg: number;
  targetWeightKg: number;
  currentWeightKg: number | null;
  totalChangeKg: number | null;
  remainingKg: number | null;
  progressRatio: number;
  isOnTrack: boolean | null;
}

export function calculateWeightProgress(goal: Goal | undefined, latest: WeightLog | undefined): WeightProgress {
  const startingWeightKg = goal?.startingWeightKg ?? 0;
  const targetWeightKg = goal?.targetWeightKg ?? 0;
  const currentWeightKg = latest?.weightKg ?? null;

  if (!goal) {
    return {
      startingWeightKg,
      targetWeightKg,
      currentWeightKg,
      totalChangeKg: null,
      remainingKg: null,
      progressRatio: 0,
      isOnTrack: null,
    };
  }

  const totalDistance = goal.startingWeightKg - goal.targetWeightKg;
  const totalChangeKg = currentWeightKg === null ? null : round(currentWeightKg - goal.startingWeightKg, 1);
  const doneDistance = currentWeightKg === null ? 0 : goal.startingWeightKg - currentWeightKg;

  let progressRatio = 0;
  if (goal.type === 'maintain' || Math.abs(totalDistance) < 0.01) {
    progressRatio = 1;
  } else {
    progressRatio = doneDistance / totalDistance;
    if (goal.type === 'gain') progressRatio = -doneDistance / -totalDistance;
  }
  progressRatio = Math.max(0, Math.min(1, progressRatio));

  const remainingKg =
    currentWeightKg === null
      ? null
      : round(
          goal.type === 'lose'
            ? Math.max(0, currentWeightKg - goal.targetWeightKg)
            : goal.type === 'gain'
              ? Math.max(0, goal.targetWeightKg - currentWeightKg)
              : 0,
          1,
        );

  let isOnTrack: boolean | null = null;
  if (currentWeightKg !== null && goal.weeklyChangeKg && goal.type !== 'maintain') {
    const expectedChange = goal.weeklyChangeKg * (goal.type === 'lose' ? -1 : 1);
    const actualChange = currentWeightKg - goal.startingWeightKg;
    isOnTrack = expectedChange === 0 ? actualChange === 0 : actualChange * expectedChange >= 0;
  }

  return {
    startingWeightKg: round(goal.startingWeightKg, 1),
    targetWeightKg: round(goal.targetWeightKg, 1),
    currentWeightKg,
    totalChangeKg,
    remainingKg,
    progressRatio,
    isOnTrack,
  };
}
