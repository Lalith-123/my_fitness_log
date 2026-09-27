import type { GoalType, Sex } from '@/types';
import { clamp, round } from '@/utils/numbers/numbers';
import { LIMITS, fail, type FieldResult } from '@/utils/validation/validation';
import {
  calculateBMR,
  calculateTDEE,
  dailyAdjustmentForWeeklyChange,
  tdeeFromBmr,
  type EnergyInput,
} from './energy';

/**
 * Guardrails
 * ----------
 * These are conservative boundaries chosen by this application to avoid
 * producing nonsensical targets. They are not medical thresholds, not clinical
 * guidance, and not a guarantee of any result.
 */

/** Selected weekly rate at which the application starts warning the user. */
export const WEEKLY_CAUTION_THRESHOLD_KG = 0.75;

/** Hard ceiling for a user-selected weekly rate, by goal type. */
export const WEEKLY_CHANGE_LIMITS: Record<'lose' | 'gain', { min: number; max: number }> = {
  lose: { min: 0.1, max: 1 },
  gain: { min: 0.1, max: 0.5 },
};

/** Hard ceiling on the calorie target as a multiple of maintenance energy. */
export const MAX_TARGET_TDEE_MULTIPLE = 1.25;

/** Absolute floor on a daily calorie target, by sex. */
export const MINIMUM_TARGET_KCAL: Record<Sex, number> = {
  male: 1500,
  female: 1200,
  other: 1350,
};

export const ESTIMATE_DISCLAIMER =
  'Estimates only. Your target is calculated from the information you enter and does not account for your individual metabolism, medical history or medication.';

export const AGGRESSIVE_TARGET_NOTICE =
  'The selected weekly goal results in a very aggressive target. The application has limited the calculated target to a safer application boundary. Consider consulting a qualified professional before proceeding.';

export const CAUTION_TARGET_NOTICE =
  'This is a fast rate of change. A slower rate is usually easier to sustain. Consider speaking with a qualified professional before proceeding.';

export type GuardrailSeverity = 'ok' | 'caution' | 'blocked';

export interface GuardrailResult {
  severity: GuardrailSeverity;
  message?: string;
}

export const GUARDRAIL_OK: GuardrailResult = { severity: 'ok' };

/** Validate a user-selected weekly rate against the application's boundary. */
export function validateWeeklyChange(type: GoalType, weeklyChangeKg: number): GuardrailResult {
  if (type === 'maintain') return GUARDRAIL_OK;

  const limit = type === 'lose' ? WEEKLY_CHANGE_LIMITS.lose : WEEKLY_CHANGE_LIMITS.gain;
  const label = type === 'lose' ? 'loss' : 'gain';

  if (!Number.isFinite(weeklyChangeKg) || weeklyChangeKg <= 0) {
    return { severity: 'blocked', message: `Enter a weekly ${label} between ${limit.min} and ${limit.max} kg.` };
  }

  if (weeklyChangeKg > limit.max) {
    return {
      severity: 'blocked',
      message: `This application supports a maximum weekly ${label} target of ${limit.max} kg.`,
    };
  }

  if (weeklyChangeKg >= WEEKLY_CAUTION_THRESHOLD_KG) {
    return {
      severity: 'caution',
      message: CAUTION_TARGET_NOTICE,
    };
  }

  return GUARDRAIL_OK;
}

/**
 * Clamp a raw calorie target into the application's boundaries. The result
 * reports whether the raw value was altered so the UI can explain itself.
 */
export function validateCalorieTarget(
  rawTarget: number,
  bmr: number,
  tdee: number,
  sex: Sex,
): { target: number; limited: boolean; floor: number; ceiling: number } {
  const floor = Math.max(round(MINIMUM_TARGET_KCAL[sex]), round(bmr));
  const ceiling = round(tdee * MAX_TARGET_TDEE_MULTIPLE);
  const safeFloor = Math.min(floor, ceiling);
  const target = clamp(round(rawTarget), safeFloor, Math.max(safeFloor, ceiling));
  return {
    target,
    limited: target !== round(rawTarget),
    floor: safeFloor,
    ceiling: Math.max(safeFloor, ceiling),
  };
}

export interface GoalInput {
  type: GoalType;
  startingWeightKg: number;
  targetWeightKg: number;
  weeklyChangeKg?: number;
}

export interface GoalValidation {
  weekly: GuardrailResult;
  direction: FieldResult;
  reachable: FieldResult;
  ok: boolean;
  /** Approximate weeks needed to reach the target at the selected rate. */
  estimatedWeeks: number | null;
  message?: string;
}

/**
 * Validate a complete goal request: the rate must sit inside the boundary, the
 * target must sit in the correct direction, and it must be far enough away to
 * still be meaningful.
 */
export function validateGoal(input: GoalInput): GoalValidation {
  const weekly = validateWeeklyChange(input.type, input.weeklyChangeKg ?? 0);

  const { startingWeightKg, targetWeightKg } = input;

  let direction: FieldResult = { ok: true };
  if (input.type === 'lose' && targetWeightKg >= startingWeightKg) {
    direction = fail('For weight loss, the target must be lower than your current weight.');
  } else if (input.type === 'gain' && targetWeightKg <= startingWeightKg) {
    direction = fail('For weight gain, the target must be higher than your current weight.');
  } else if (input.type === 'maintain' && Math.abs(targetWeightKg - startingWeightKg) > 0.05) {
    direction = fail('For maintenance, the target should match your current weight.');
  }

  let reachable: FieldResult = { ok: true };
  if (!Number.isFinite(targetWeightKg) || targetWeightKg < LIMITS.weightKg.min) {
    reachable = fail(`Enter a target weight between ${LIMITS.weightKg.min} and ${LIMITS.weightKg.max} kg.`);
  } else if (input.type !== 'maintain' && Math.abs(targetWeightKg - startingWeightKg) < 0.1) {
    // Maintenance legitimately targets the current weight, so only lose/gain
    // need a meaningful distance to track.
    reachable = fail('The target is too close to your current weight to track.');
  }

  let estimatedWeeks: number | null = null;
  const rate = input.weeklyChangeKg;
  if (input.type !== 'maintain' && rate && rate > 0) {
    const distance = Math.abs(targetWeightKg - startingWeightKg);
    estimatedWeeks = Math.ceil(distance / rate);
  }

  return {
    weekly,
    direction,
    reachable,
    ok: weekly.severity !== 'blocked' && direction.ok && reachable.ok,
    estimatedWeeks,
  };
}

export interface CalorieTargetResult {
  bmr: number;
  tdee: number;
  rawTarget: number;
  target: number;
  limited: boolean;
  notice?: string;
  severity: GuardrailSeverity;
}

/**
 * Daily figures the user supplied themselves, in kcal per day, for when they
 * have measured numbers that beat the estimate. Each is optional, and an absent
 * value means "derive it".
 *
 * The three form a chain, and each level wins over the one derived from it:
 * BMR feeds maintenance, and maintenance feeds the daily target. The target is
 * only ever entered from Settings; during onboarding it stays derived so that
 * choosing a rate or a direction can never leave a stale number behind.
 *
 * User-supplied figures are still checked against the same boundaries as the
 * estimate, so an override can correct a number but never bypass the guardrails.
 */
export interface CalorieOverrides {
  bmr?: number;
  tdee?: number;
  target?: number;
}

/**
 * Full calorie target calculation for a goal request. All safety logic lives
 * here; components receive the finished result and never clamp values
 * themselves.
 *
 * Precedence for each figure is: the user's own number, then the value derived
 * from the figure above it, then the plain calculated estimate.
 */
export function calculateTargetCalories(
  energy: EnergyInput,
  goal: GoalInput,
  overrides: CalorieOverrides = {},
): CalorieTargetResult {
  const estimatedBmr = round(calculateBMR(energy));
  const estimatedTdee = round(calculateTDEE(energy));

  const bmr = overrides.bmr != null ? round(overrides.bmr) : estimatedBmr;
  // A pinned BMR re-scales maintenance; a pinned maintenance wins outright.
  const tdee =
    overrides.tdee != null
      ? round(overrides.tdee)
      : overrides.bmr != null
        ? round(tdeeFromBmr(bmr, energy.activityLevel))
        : estimatedTdee;

  let rawTarget = tdee;
  let severity: GuardrailSeverity = 'ok';
  let notice: string | undefined;

  if (goal.type !== 'maintain' && goal.weeklyChangeKg) {
    const adjustment = dailyAdjustmentForWeeklyChange(goal.weeklyChangeKg);
    rawTarget = goal.type === 'lose' ? tdee - adjustment : tdee + adjustment;
    const weeklyResult = validateWeeklyChange(goal.type, goal.weeklyChangeKg);
    severity = weeklyResult.severity;
    if (weeklyResult.message && weeklyResult.severity !== 'ok') {
      notice = weeklyResult.message;
    }
  }

  // User-supplied figures are checked against the same boundaries as the
  // estimate, so a correction can never be used to bypass the guardrails.
  const desired = overrides.target != null ? round(overrides.target) : round(rawTarget);
  const { target, limited } = validateCalorieTarget(desired, bmr, tdee, energy.sex);
  if (limited) {
    severity = 'blocked';
    notice = AGGRESSIVE_TARGET_NOTICE;
  }

  return { bmr, tdee, rawTarget: round(rawTarget), target, limited, notice, severity };
}
