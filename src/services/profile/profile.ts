import { db } from '@/db/database';
import { createId, nowIso } from '@/utils/id';
import { round } from '@/utils/numbers/numbers';
import { validateAge, validateHeightCm, validateName, validateWeightKg } from '@/utils/validation/validation';
import type { ActivityLevel, Sex, UserProfile } from '@/types';

export const PROFILE_ID = 'primary';

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

export const ACTIVITY_OPTIONS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active'];

export interface ProfileInput {
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  currentWeightKg: number;
  activityLevel: ActivityLevel;
}

export function validateProfileInput(input: ProfileInput): string | null {
  return (
    validateName(input.name).message ??
    validateAge(input.age).message ??
    validateHeightCm(input.heightCm).message ??
    validateWeightKg(input.currentWeightKg).message ??
    null
  );
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
  await db.profiles.put(profile);
  return profile;
}

export async function updateProfile(input: ProfileInput): Promise<UserProfile> {
  const existing = await getProfile();
  if (!existing) return createProfile(input);
  const error = validateProfileInput(input);
  if (error) throw new Error(error);

  await db.profiles.update(PROFILE_ID, {
    name: input.name.trim(),
    age: input.age,
    sex: input.sex,
    heightCm: round(input.heightCm, 1),
    currentWeightKg: round(input.currentWeightKg, 2),
    activityLevel: input.activityLevel,
    updatedAt: nowIso(),
  });
  const updated = await getProfile();
  if (!updated) throw new Error('Profile not found.');
  return updated;
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
