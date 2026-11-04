import { useEffect, useState } from 'react';
import { Dialog } from '@/components/common/Dialog';
import { Button } from '@/components/common/Button';
import { NumberField } from '@/components/common/NumberField';
import { useToast } from '@/components/common/Toast';
import { logWeight, validateWeightInput } from '@/services/weight/weight';
import { formatLongDate, isFutureDate } from '@/utils/dates/dates';
import { parseNumericInput, round } from '@/utils/numbers/numbers';

export interface LogWeightDialogProps {
  open: boolean;
  onClose: () => void;
  date: string;
  existingWeightKg?: number | null;
  /** Goal-based weight for this day, used when there is no entry yet. */
  suggestedWeightKg?: number | null;
  onLogged?: () => void;
  /** Secondary action for the daily prompt, which can be postponed. */
  onAskLater?: () => void;
}

/**
 * Weight entry for a single day. The day is fixed by the caller (today, or a
 * day being viewed on the dashboard) and can never be in the future.
 */
export function LogWeightDialog({
  open,
  onClose,
  date,
  existingWeightKg,
  suggestedWeightKg,
  onLogged,
  onAskLater,
}: LogWeightDialogProps) {
  const { showToast } = useToast();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [prefilledFromGoal, setPrefilledFromGoal] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (existingWeightKg !== null && existingWeightKg !== undefined) {
      setValue(String(round(existingWeightKg, 1)));
      setPrefilledFromGoal(false);
    } else if (suggestedWeightKg !== null && suggestedWeightKg !== undefined) {
      setValue(String(round(suggestedWeightKg, 1)));
      setPrefilledFromGoal(true);
    } else {
      setValue('');
      setPrefilledFromGoal(false);
    }
    setError(null);
  }, [open, existingWeightKg, suggestedWeightKg]);

  const handleSave = async () => {
    const parsed = parseNumericInput(value);
    if (parsed === null) {
      setError('Enter your weight in kg.');
      return;
    }
    const validation = validateWeightInput(date, parsed);
    if (validation) {
      setError(validation);
      return;
    }

    setSaving(true);
    try {
      await logWeight(date, parsed);
      showToast(`Weight saved for ${formatLongDate(date)}.`, 'success');
      onLogged?.();
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save your weight.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Enter weight"
      description={formatLongDate(date)}
      headerTone="brand"
      footer={
        <div className="flex flex-col gap-2">
          {error ? (
            <p className="text-xs text-critical-700" role="alert">
              {error}
            </p>
          ) : null}
          <Button variant="primary" size="lg" fullWidth onClick={handleSave} disabled={saving}>
            {saving ? 'Saving' : 'Save weight'}
          </Button>
          {onAskLater ? (
            <Button variant="secondary" size="lg" fullWidth onClick={onAskLater} disabled={saving}>
              Ask me later
            </Button>
          ) : null}
        </div>
      }
    >
      <div className="flex flex-col gap-3 px-4 py-4 sm:px-5">
        <NumberField
          label="Weight"
          unit="kg"
          value={value}
          onChange={(next) => {
            setValue(next);
            setError(null);
          }}
          error={error}
          min={25}
          max={350}
          step={0.1}
          placeholder="70.5"
          autoFocus
          stepperTone="brand"
        />
        {isFutureDate(date) ? (
          <p className="text-[11px] text-critical-700">Weight cannot be logged for a future date.</p>
        ) : prefilledFromGoal ? (
          <p className="text-[11px] leading-relaxed text-ink-subtle">
            Prefilled from your goal&rsquo;s pace. Adjust it to match your actual weight. One entry
            per day, and saving again updates it.
          </p>
        ) : (
          <p className="text-[11px] leading-relaxed text-ink-subtle">
            One entry per day. Logging again on the same day updates it. Weigh yourself at a similar
            time each day for the clearest trend.
          </p>
        )}
      </div>
    </Dialog>
  );
}
