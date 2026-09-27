import type { ActivityLevel, Sex, UserProfile } from '@/types';

/**
 * Energy is derived from the Mifflin-St Jeor equation, the most widely used
 * resting-energy estimate for adults. It is an estimate: it takes no account of
 * body composition, and it is not a measurement.
 *
 *   BMR = (10 x weightKg) + (6.25 x heightCm) - (5 x age) + sexConstant
 */
export const SEX_CONSTANTS: Record<Sex, number> = {
  male: 5,
  female: -161,
  other: -78,
};

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
};

export interface EnergyInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  activityLevel: ActivityLevel;
}

export function calculateBMR(input: EnergyInput): number {
  const base = 10 * input.weightKg + 6.25 * input.heightCm - 5 * input.age;
  return Math.max(0, base + SEX_CONSTANTS[input.sex]);
}

/**
 * Maintenance energy from a resting figure. Kept separate from `calculateTDEE`
 * so a user-supplied BMR can be scaled the same way the estimate is.
 */
export function tdeeFromBmr(bmr: number, activityLevel: ActivityLevel): number {
  return bmr * ACTIVITY_MULTIPLIERS[activityLevel];
}

export function calculateTDEE(input: EnergyInput): number {
  return tdeeFromBmr(calculateBMR(input), input.activityLevel);
}

/** Calories represented by 1 kg of body mass, using the 7,700 kcal/kg rule of thumb. */
export const KCAL_PER_KG = 7700;

export function dailyAdjustmentForWeeklyChange(weeklyChangeKg: number): number {
  return (weeklyChangeKg * KCAL_PER_KG) / 7;
}

export function energyInputFromProfile(profile: UserProfile): EnergyInput {
  return {
    weightKg: profile.currentWeightKg,
    heightCm: profile.heightCm,
    age: profile.age,
    sex: profile.sex,
    activityLevel: profile.activityLevel,
  };
}
