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
  onLogged?: () => void;
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
  onLogged,
}: LogWeightDialogProps) {
  const { showToast } = useToast();
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setValue(existingWeightKg ? String(round(existingWeightKg, 1)) : '');
    setError(null);
  }, [open, existingWeightKg]);

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
      title="Log weight"
      description={formatLongDate(date)}
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
        />
        {isFutureDate(date) ? (
          <p className="text-[11px] text-critical-700">Weight cannot be logged for a future date.</p>
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
