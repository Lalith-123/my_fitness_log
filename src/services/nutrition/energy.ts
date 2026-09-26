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

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Lightly active',
  moderate: 'Moderately active',
  active: 'Very active',
};

export const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  sedentary: 'Desk work, little or no deliberate exercise',
  light: 'Light exercise on 1 to 3 days a week',
  moderate: 'Moderate exercise on 3 to 5 days a week',
  active: 'Hard exercise on 6 to 7 days a week',
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

export function calculateTDEE(input: EnergyInput): number {
  return calculateBMR(input) * ACTIVITY_MULTIPLIERS[input.activityLevel];
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
