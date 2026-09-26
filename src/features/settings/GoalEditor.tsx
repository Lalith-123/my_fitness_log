import { useEffect, useMemo, useState } from 'react';
import { BottomSheet } from '@/components/common/BottomSheet';
import { Button } from '@/components/common/Button';
import { NumberField } from '@/components/common/NumberField';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { useToast } from '@/components/common/Toast';
import { useActiveGoal, useProfile, useWeightLogs } from '@/hooks/useAppData';
import { getLatestWeightLog } from '@/services/weight/weight';
import { updateGoal } from '@/services/goals/goals';
import { validateGoal } from '@/services/nutrition/targets';
import { energyInputFromProfile } from '@/services/nutrition/energy';
import { calculateTargetCalories } from '@/services/nutrition/targets';
import { parseNumericInput } from '@/utils/numbers/numbers';
import { GOAL_GUARDRAIL_NOTE } from '@/app/content';
import type { GoalType } from '@/types';

const WEEKLY_OPTIONS = ['0.25', '0.5', '0.75', '1'];

export interface GoalEditorProps {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

export function GoalEditor({ open, onClose, onSaved }: GoalEditorProps) {
  const { showToast } = useToast();
  const goal = useActiveGoal();
  const profile = useProfile();
  const weightLogs = useWeightLogs();

  const [type, setType] = useState<GoalType>('lose');
  const [target, setTarget] = useState('');
  const [weekly, setWeekly] = useState('0.5');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const latest = useMemo(() => getLatestWeightLog(weightLogs), [weightLogs]);
  const startingWeightKg = latest?.weightKg ?? profile?.currentWeightKg ?? null;

  useEffect(() => {
    if (!open) return;
    if (goal) {
      setType(goal.type);
      setTarget(String(goal.targetWeightKg));
      setWeekly(String(goal.weeklyChangeKg ?? 0.5));
    } else {
      setType('lose');
      setTarget('');
      setWeekly('0.5');
    }
    setError(null);
  }, [open, goal]);

  const preview = useMemo(() => {
    if (!profile || startingWeightKg === null) return null;
    const parsedTarget = parseNumericInput(target);
    const resolvedTarget = type === 'maintain' ? startingWeightKg : parsedTarget;
    if (resolvedTarget === null) return null;
    const parsedWeekly = parseNumericInput(weekly);
    return calculateTargetCalories(energyInputFromProfile(profile), {
      type,
      startingWeightKg,
      targetWeightKg: resolvedTarget,
      weeklyChangeKg: type === 'maintain' ? undefined : parsedWeekly ?? undefined,
    });
  }, [profile, startingWeightKg, target, weekly, type]);

  const handleSave = async () => {
    if (!goal) {
      setError('No active goal to update.');
      return;
    }
    if (startingWeightKg === null) {
      setError('Log your weight before changing your goal.');
      return;
    }

    const parsedTarget = type === 'maintain' ? startingWeightKg : parseNumericInput(target);
    if (parsedTarget === null) {
      setError('Enter a target weight.');
      return;
    }
    const parsedWeekly = parseNumericInput(weekly);

    const validation = validateGoal({
      type,
      startingWeightKg,
      targetWeightKg: parsedTarget,
      weeklyChangeKg: type === 'maintain' ? undefined : parsedWeekly ?? undefined,
    });
    if (!validation.ok) {
      setError(
        validation.direction.message ??
          validation.reachable.message ??
          validation.weekly.message ??
          'Check the goal values.',
      );
      return;
    }

    setSaving(true);
    try {
      await updateGoal(goal.id, {
        type,
        startingWeightKg,
        targetWeightKg: parsedTarget,
        weeklyChangeKg: type === 'maintain' ? undefined : parsedWeekly ?? undefined,
      });
      showToast('Goal updated.', 'success');
      onSaved?.();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your goal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Edit goal"
      description={
        startingWeightKg !== null
          ? `Starting from your latest weight of ${startingWeightKg.toFixed(1)} kg.`
          : 'Log your weight to edit a goal.'
      }
      footer={
        <div className="flex flex-col gap-2">
          {error ? (
            <p className="text-xs text-critical-700" role="alert">
              {error}
            </p>
          ) : null}
          <Button variant="primary" size="lg" fullWidth onClick={handleSave} disabled={saving}>
            {saving ? 'Saving' : 'Save goal'}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-5">
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Goal type</p>
          <SegmentedControl
            label="Goal type"
            fullWidth
            size="sm"
            value={type}
            onChange={(value) => {
              setType(value);
              setError(null);
            }}
            options={[
              { value: 'lose', label: 'Lose' },
              { value: 'maintain', label: 'Maintain' },
              { value: 'gain', label: 'Gain' },
            ]}
          />
        </div>

        {type === 'maintain' ? (
          <p className="rounded-md border border-line bg-surface-sunken px-3 py-2.5 text-[12px] leading-relaxed text-ink-muted">
            Maintenance holds your current weight as the target and keeps your calories at your
            estimated maintenance level.
          </p>
        ) : (
          <NumberField
            label="Target weight"
            unit="kg"
            value={target}
            onChange={(value) => {
              setTarget(value);
              setError(null);
            }}
            min={25}
            max={350}
            step={0.1}
            required
          />
        )}

        {type !== 'maintain' ? (
          <div>
            <p className="mb-1.5 text-sm font-medium text-ink">Weekly change</p>
            <SegmentedControl
              label="Weekly change"
              fullWidth
              size="sm"
              value={weekly}
              onChange={(value) => {
                setWeekly(value);
                setError(null);
              }}
              options={WEEKLY_OPTIONS.map((value) => ({ value, label: `${value} kg` }))}
            />
          </div>
        ) : null}

        {preview ? (
          <div className="rounded-md border border-line bg-surface-sunken px-3 py-2.5">
            <p className="text-[12px] text-ink-muted tnum">
              New target{' '}
              <span className="font-medium text-ink">{Math.round(preview.target).toLocaleString()} kcal</span>{' '}
              per day
            </p>
            {preview.limited ? (
              <p className="mt-1 text-[11px] leading-relaxed text-caution-900">
                {preview.notice ?? 'The target was adjusted to stay within a safe range.'}
              </p>
            ) : null}
          </div>
        ) : null}

        <p className="text-[11px] leading-relaxed text-ink-subtle">{GOAL_GUARDRAIL_NOTE}</p>
      </div>
    </BottomSheet>
  );
}
