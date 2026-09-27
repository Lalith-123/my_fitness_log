import { useEffect, useMemo, useState } from 'react';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { NumberField } from '@/components/common/NumberField';
import { SelectField } from '@/components/common/SelectField';
import { useToast } from '@/components/common/Toast';
import { useProfile, useActiveGoal } from '@/hooks/useAppData';
import { SEX_OPTIONS, DEFAULT_ACTIVITY_LEVEL, updateProfile, validateProfileInput } from '@/services/profile/profile';
import { energyInputFromProfile } from '@/services/nutrition/energy';
import { calculateTargetCalories } from '@/services/nutrition/targets';
import { parseNumericInput } from '@/utils/numbers/numbers';
import { LIMITS } from '@/utils/validation/validation';
import type { Sex } from '@/types';

export interface ProfileEditorProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function ProfileEditor({ open, onClose, onSaved }: ProfileEditorProps) {
  const { showToast } = useToast();
  const profile = useProfile();
  const goalState = useActiveGoal();
  // Activity is no longer editable, so the stored value is carried through
  // untouched on save and used as-is for the energy estimate.
  const activityLevel = profile?.activityLevel ?? DEFAULT_ACTIVITY_LEVEL;

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [sex, setSex] = useState<Sex>('other');
  const [bmrOverride, setBmrOverride] = useState('');
  const [tdeeOverride, setTdeeOverride] = useState('');
  const [targetOverride, setTargetOverride] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !profile) return;
    setName(profile.name);
    setAge(String(profile.age));
    setHeightCm(String(profile.heightCm));
    setWeightKg(String(profile.currentWeightKg));
    setSex(profile.sex);
    setBmrOverride(profile.bmrOverride ? String(profile.bmrOverride) : '');
    setTdeeOverride(profile.tdeeOverride ? String(profile.tdeeOverride) : '');
    setTargetOverride(profile.targetOverride ? String(profile.targetOverride) : '');
    setError(null);
  }, [open, profile]);

  /**
   * The figures the dashboard would show right now, given the values in these
   * fields and the current activity level.
   *
   * Each field uses its own figure as a placeholder. That is only correct
   * because an empty field means "derive it", and a filled field hides its own
   * placeholder - so the value shown is always the figure that would apply.
   */
  const live = useMemo(() => {
    if (!profile) return null;
    const overrides = {
      bmr: parseNumericInput(bmrOverride) ?? undefined,
      tdee: parseNumericInput(tdeeOverride) ?? undefined,
      target: parseNumericInput(targetOverride) ?? undefined,
    };
    const energy = energyInputFromProfile({ ...profile, activityLevel });
    const goal = goalState
      ? {
          type: goalState.type,
          startingWeightKg: goalState.startingWeightKg,
          targetWeightKg: goalState.targetWeightKg,
          weeklyChangeKg: goalState.weeklyChangeKg,
        }
      : {
          type: 'maintain' as const,
          startingWeightKg: profile.currentWeightKg,
          targetWeightKg: profile.currentWeightKg,
        };
    return calculateTargetCalories(energy, goal, overrides);
  }, [profile, goalState, activityLevel, bmrOverride, tdeeOverride, targetOverride]);

  /**
   * The three figures form a chain, so a new number supersedes everything
   * derived from the one above it. Changing resting energy discards maintenance
   * and the daily target; changing maintenance discards just the target.
   */
  const applyBmr = (value: string) => {
    setBmrOverride(value);
    setTdeeOverride('');
    setTargetOverride('');
  };
  const applyTdee = (value: string) => {
    setTdeeOverride(value);
    setTargetOverride('');
  };

  const handleSave = async () => {
    const parsedAge = parseNumericInput(age);
    const parsedHeight = parseNumericInput(heightCm);
    const parsedWeight = parseNumericInput(weightKg);

    if (parsedAge === null || parsedHeight === null || parsedWeight === null) {
      setError('Enter a number for your age, height and weight.');
      return;
    }

    const message = validateProfileInput({
      name: name.trim(),
      age: parsedAge,
      heightCm: parsedHeight,
      currentWeightKg: parsedWeight,
      sex,
      activityLevel,
      bmrOverride: parseNumericInput(bmrOverride) ?? undefined,
      tdeeOverride: parseNumericInput(tdeeOverride) ?? undefined,
      targetOverride: parseNumericInput(targetOverride) ?? undefined,
    });
    if (message) {
      setError(message);
      return;
    }

    setSaving(true);
    try {
      await updateProfile({
        name: name.trim(),
        age: parsedAge,
        heightCm: parsedHeight,
        currentWeightKg: parsedWeight,
        sex,
        activityLevel,
        bmrOverride: parseNumericInput(bmrOverride) ?? undefined,
        tdeeOverride: parseNumericInput(tdeeOverride) ?? undefined,
        targetOverride: parseNumericInput(targetOverride) ?? undefined,
      });
      showToast('Profile updated.', 'success');
      onSaved?.();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Edit profile"
      description="These values are used to estimate your calorie target."
      footer={
        <div className="flex flex-col gap-2">
          {error ? (
            <p className="text-xs text-critical-700" role="alert">
              {error}
            </p>
          ) : null}
          <Button variant="primary" size="lg" fullWidth onClick={handleSave} disabled={saving}>
            {saving ? 'Saving' : 'Save profile'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <TextField
          label="Name"
          value={name}
          onChange={(value) => {
            setName(value);
            setError(null);
          }}
          maxLength={40}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Age"
            unit="years"
            value={age}
            onChange={(value) => {
              setAge(value);
              setError(null);
            }}
            min={LIMITS.age.min}
            max={LIMITS.age.max}
            step={1}
            required
          />
          <NumberField
            label="Height"
            unit="cm"
            value={heightCm}
            onChange={(value) => {
              setHeightCm(value);
              setError(null);
            }}
            min={LIMITS.heightCm.min}
            max={LIMITS.heightCm.max}
            step={1}
            required
          />
        </div>

        <NumberField
          label="Current weight"
          unit="kg"
          value={weightKg}
          onChange={(value) => {
            setWeightKg(value);
            setError(null);
          }}
          min={LIMITS.weightKg.min}
          max={LIMITS.weightKg.max}
          step={0.1}
          required
        />

        <SelectField
          label="Sex"
          value={sex}
          onChange={(value) => setSex(value as Sex)}
          options={SEX_OPTIONS}
        />

        <div className="border-t border-line pt-4">
          <p className="text-sm font-medium text-ink">Your own energy figures</p>
          <p className="mb-3 mt-1 text-[11px] leading-relaxed text-ink-subtle">
            Leave a field blank to use the estimate. Filling one in overrides it, and anything
            calculated from it updates too.
          </p>
          <div className="flex flex-col gap-3">
            <NumberField
              label="Resting energy (BMR)"
              unit="kcal"
              value={bmrOverride}
              onChange={applyBmr}
              placeholder={live ? String(live.bmr) : ''}
              min={LIMITS.energyKcal.min}
              max={LIMITS.energyKcal.max}
            />
            <NumberField
              label="Maintenance energy"
              unit="kcal"
              value={tdeeOverride}
              onChange={applyTdee}
              placeholder={live ? String(live.tdee) : ''}
              min={LIMITS.energyKcal.min}
              max={LIMITS.energyKcal.max}
            />
            <NumberField
              label="Daily calorie target"
              unit="kcal"
              value={targetOverride}
              onChange={setTargetOverride}
              placeholder={live ? String(live.target) : ''}
              min={LIMITS.energyKcal.min}
              max={LIMITS.energyKcal.max}
              hint="Still checked against the safe limits for your sex."
            />
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
