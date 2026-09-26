import { useEffect, useState } from 'react';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { NumberField } from '@/components/common/NumberField';
import { SelectField } from '@/components/common/SelectField';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { useToast } from '@/components/common/Toast';
import { useProfile } from '@/hooks/useAppData';
import {
  ACTIVITY_OPTIONS,
  SEX_OPTIONS,
  updateProfile,
  validateProfileInput,
} from '@/services/profile/profile';
import { parseNumericInput } from '@/utils/numbers/numbers';
import { LIMITS } from '@/utils/validation/validation';
import type { ActivityLevel, Sex } from '@/types';

export interface ProfileEditorProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function ProfileEditor({ open, onClose, onSaved }: ProfileEditorProps) {
  const { showToast } = useToast();
  const profile = useProfile();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [sex, setSex] = useState<Sex>('other');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !profile) return;
    setName(profile.name);
    setAge(String(profile.age));
    setHeightCm(String(profile.heightCm));
    setWeightKg(String(profile.currentWeightKg));
    setSex(profile.sex);
    setActivityLevel(profile.activityLevel);
    setError(null);
  }, [open, profile]);

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

        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Activity level</p>
          <SegmentedControl
            label="Activity level"
            fullWidth
            size="sm"
            value={activityLevel}
            onChange={(value) => setActivityLevel(value)}
            options={ACTIVITY_OPTIONS.map((level) => ({ value: level, label: ACTIVITY_SHORT[level] }))}
          />
          <p className="mt-1.5 text-[11px] text-ink-subtle">{ACTIVITY_DETAIL[activityLevel]}</p>
        </div>
      </div>
    </BottomSheet>
  );
}

const ACTIVITY_SHORT = {
  sedentary: 'Sitting',
  light: 'Light',
  moderate: 'Moderate',
  active: 'Very active',
} as const;

const ACTIVITY_DETAIL = {
  sedentary: 'Desk work with little exercise.',
  light: 'Light exercise one or two days a week.',
  moderate: 'Exercise three to five days a week.',
  active: 'Hard exercise most days of the week.',
} as const;
