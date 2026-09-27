import { db } from '@/db/database';
import { createId, nowIso } from '@/utils/id';
import { round } from '@/utils/numbers/numbers';
import { validateAge, validateEnergyKcal, validateHeightCm, validateName, validateWeightKg } from '@/utils/validation/validation';
import type { ActivityLevel, Sex, UserProfile } from '@/types';

export const PROFILE_ID = 'primary';

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

/**
 * Activity is not collected from the user. Every profile gets the same level, and
 * the daily energy figures can be overridden per person in the profile editor
 * when the estimate is wrong.
 */
export const DEFAULT_ACTIVITY_LEVEL: ActivityLevel = 'light';

export interface ProfileInput {
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  currentWeightKg: number;
  activityLevel: ActivityLevel;
  /** User-supplied energy figures, or undefined to use the calculated estimate. */
  bmrOverride?: number;
  tdeeOverride?: number;
  targetOverride?: number;
}

export function validateProfileInput(input: ProfileInput): string | null {
  return (
    validateName(input.name).message ??
    validateAge(input.age).message ??
    validateHeightCm(input.heightCm).message ??
    validateWeightKg(input.currentWeightKg).message ??
    validateEnergyKcal(input.bmrOverride, 'resting energy').message ??
    validateEnergyKcal(input.tdeeOverride, 'maintenance energy').message ??
    validateEnergyKcal(input.targetOverride, 'a daily calorie target').message ??
    null
  );
}

/** Applies the override triple, removing the keys entirely when a value is cleared. */
function withEnergyOverrides(
  profile: UserProfile,
  input: Pick<ProfileInput, 'bmrOverride' | 'tdeeOverride' | 'targetOverride'>,
): UserProfile {
  const pairs = [
    ['bmrOverride', input.bmrOverride],
    ['tdeeOverride', input.tdeeOverride],
    ['targetOverride', input.targetOverride],
  ] as const;
  for (const [key, value] of pairs) {
    if (value == null) delete profile[key];
    else profile[key] = round(value);
  }
  return profile;
}

export async function getProfile(): Promise<UserProfile | undefined> {
  return db.profiles.get(PROFILE_ID);
}

export async function createProfile(input: ProfileInput): Promise<UserProfile> {
  const error = validateProfileInput(input);
  if (error) throw new Error(error);

  const timestamp = nowIso();
  const profile: UserProfile = {
    id: PROFILE_ID,
    name: input.name.trim(),
    age: input.age,
    sex: input.sex,
    heightCm: round(input.heightCm, 1),
    currentWeightKg: round(input.currentWeightKg, 2),
    activityLevel: input.activityLevel,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  await db.profiles.put(withEnergyOverrides(profile, input));
  return profile;
}

export async function updateProfile(input: ProfileInput): Promise<UserProfile> {
  const existing = await getProfile();
  if (!existing) return createProfile(input);
  const error = validateProfileInput(input);
  if (error) throw new Error(error);

  // Replaced rather than patched, because clearing an override has to remove the
  // stored key instead of writing undefined over it.
  const next = withEnergyOverrides(
    {
      ...existing,
      name: input.name.trim(),
      age: input.age,
      sex: input.sex,
      heightCm: round(input.heightCm, 1),
      currentWeightKg: round(input.currentWeightKg, 2),
      activityLevel: input.activityLevel,
      updatedAt: nowIso(),
    },
    input,
  );
  await db.profiles.put(next);
  return next;
}

/** Used by onboarding to guarantee a row exists even if the id is missing. */
export async function ensureProfileId(): Promise<void> {
  const count = await db.profiles.count();
  if (count === 0) return;
  const rows = await db.profiles.toArray();
  const stray = rows.find((row) => row.id !== PROFILE_ID);
  if (stray) await db.profiles.delete(stray.id);
}

export async function logInitialWeight(weightKg: number, date: string): Promise<void> {
  const existing = await db.weightLogs.where('date').equals(date).first();
  if (existing) {
    await db.weightLogs.update(existing.id, { weightKg: round(weightKg, 2) });
    return;
  }
  await db.weightLogs.add({
    id: createId('wgt'),
    date,
    weightKg: round(weightKg, 2),
    createdAt: nowIso(),
  });
}
