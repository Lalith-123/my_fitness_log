import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { db, METADATA_KEYS } from '@/db/database';
import { MEDICAL_DISCLAIMER, PRIVACY_STATEMENT, PRIVACY_DETAILS } from '@/app/content';
import { Button } from '@/components/common/Button';
import { TextField } from '@/components/common/TextField';
import { NumberField } from '@/components/common/NumberField';
import { SelectField } from '@/components/common/SelectField';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { createProfile, DEFAULT_ACTIVITY_LEVEL, logInitialWeight, SEX_OPTIONS } from '@/services/profile/profile';
import { createGoal } from '@/services/goals/goals';
import {
  AGGRESSIVE_TARGET_NOTICE,
  ESTIMATE_DISCLAIMER,
  calculateTargetCalories,
  validateGoal,
  WEEKLY_CHANGE_LIMITS,
} from '@/services/nutrition/targets';
import { tdeeFromBmr } from '@/services/nutrition/energy';
import { getTodayLocalDate } from '@/utils/dates/dates';
import { formatCalories, formatNumber, formatWeight, parseNumericInput, round } from '@/utils/numbers/numbers';
import { LIMITS, validateEnergyKcal } from '@/utils/validation/validation';
import { useToast } from '@/components/common/Toast';
import { AccentPicker } from '@/components/common/AccentPicker';
import { previewAccent, previewTheme } from '@/hooks/useTheme';
import { resolveScheme } from '@/app/theme';
import type { AccentPreference, ActivityLevel, GoalType, Sex, ThemePreference } from '@/types';

const STEPS = ['Appearance', 'About you', 'Goal', 'Review'] as const;

const WEEKLY_OPTIONS_LOSE = [0.25, 0.5, 0.75, 1.0];
const WEEKLY_OPTIONS_GAIN = [0.1, 0.25, 0.5];

interface FormState {
  theme: ThemePreference;
  accent: AccentPreference;
  name: string;
  age: string;
  sex: Sex;
  heightCm: string;
  currentWeightKg: string;
  activityLevel: ActivityLevel;
  goalType: GoalType;
  weeklyChangeKg: string;
  targetWeightKg: string;
  /** User's own resting / maintenance figures. Blank means "use the estimate". */
  bmrOverride: string;
  tdeeOverride: string;
  acceptedDisclaimer: boolean;
}

const INITIAL: FormState = {
  theme: 'system',
  accent: 'bubblegum',
  name: '',
  age: '',
  sex: 'male',
  heightCm: '',
  currentWeightKg: '',
  activityLevel: DEFAULT_ACTIVITY_LEVEL,
  goalType: 'lose',
  weeklyChangeKg: '0.5',
  targetWeightKg: '',
  bmrOverride: '',
  tdeeOverride: '',
  acceptedDisclaimer: false,
};

export function OnboardingPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: null }));
  };

  // Palette and scheme are previewed on the spot so the choice is made against
  // the real colours, then written to the database on submit.
  const chooseAccent = (accent: AccentPreference) => {
    update('accent', accent);
    previewAccent(accent);
  };
  const chooseTheme = (theme: ThemePreference) => {
    update('theme', theme);
    previewTheme(theme);
  };

  /**
   * Resting energy sits above maintenance in the chain, so changing it clears
   * any manually entered maintenance figure and lets that re-derive from the new
   * resting value. The daily target follows automatically, since it is never
   * stored.
   */
  const updateBmrOverride = (value: string) => {
    setForm((current) => ({ ...current, bmrOverride: value, tdeeOverride: '' }));
    setErrors((current) => ({ ...current, bmrOverride: null, tdeeOverride: null }));
  };
  const previewScheme = resolveScheme(form.theme);

  const bmrOverride = parseNumericInput(form.bmrOverride);
  const tdeeOverride = parseNumericInput(form.tdeeOverride);

  const age = parseNumericInput(form.age);
  const heightCm = parseNumericInput(form.heightCm);
  const currentWeightKg = parseNumericInput(form.currentWeightKg);
  const targetWeightKg = parseNumericInput(form.targetWeightKg);
  const weeklyChangeKg = parseNumericInput(form.weeklyChangeKg);

  const energyInput = useMemo(() => {
    if (age === null || heightCm === null || currentWeightKg === null) return null;
    return {
      weightKg: currentWeightKg,
      heightCm,
      age,
      sex: form.sex,
      activityLevel: form.activityLevel,
    };
  }, [age, heightCm, currentWeightKg, form.sex, form.activityLevel]);

  const goalInput = useMemo(() => {
    if (form.name.trim() === '' || currentWeightKg === null) return null;
    // Maintenance targets the current weight, so only lose/gain need a target.
    const resolvedTarget = form.goalType === 'maintain' ? currentWeightKg : targetWeightKg;
    if (resolvedTarget === null) return null;
    return {
      type: form.goalType,
      startingWeightKg: currentWeightKg,
      targetWeightKg: resolvedTarget,
      weeklyChangeKg: form.goalType === 'maintain' ? undefined : (weeklyChangeKg ?? undefined),
    };
  }, [form.name, form.goalType, currentWeightKg, targetWeightKg, weeklyChangeKg]);

  const calculation = useMemo(() => {
    const energy = energyInput;
    if (!energy || !goalInput) return null;
    return calculateTargetCalories(energy, goalInput, {
      bmr: bmrOverride ?? undefined,
      tdee: tdeeOverride ?? undefined,
    });
  }, [energyInput, goalInput, bmrOverride, tdeeOverride]);

  /** The untouched estimate, used as the placeholder on the editable fields. */
  const calculated = useMemo(() => {
    if (!energyInput || !goalInput) return null;
    return calculateTargetCalories(energyInput, goalInput);
  }, [energyInput, goalInput]);

  /**
   * What maintenance would become if its field were left blank, so the field can
   * advertise the figure it would fall back to.
   */
  const derivedTdee = useMemo(() => {
    if (!calculated) return 0;
    if (bmrOverride === null) return calculated.tdee;
    return round(tdeeFromBmr(bmrOverride, form.activityLevel));
  }, [calculated, bmrOverride, form.activityLevel]);

  const goalValidation = useMemo(() => {
    if (currentWeightKg === null) return null;
    const resolvedTarget = form.goalType === 'maintain' ? currentWeightKg : targetWeightKg;
    if (resolvedTarget === null) return null;
    return validateGoal({
      type: form.goalType,
      startingWeightKg: currentWeightKg,
      targetWeightKg: resolvedTarget,
      weeklyChangeKg: form.goalType === 'maintain' ? undefined : (weeklyChangeKg ?? undefined),
    });
  }, [form.goalType, currentWeightKg, targetWeightKg, weeklyChangeKg]);

  const validateStep = (index: number): boolean => {
    const nextErrors: Record<string, string | null> = {};

    // Step 0 is the appearance picker; it has no required fields.
    if (index === 1) {
      if (form.name.trim() === '') nextErrors.name = 'Enter your name.';
      else if (form.name.trim().length > 40) nextErrors.name = 'Use 40 characters or fewer.';

      if (age === null || age < LIMITS.age.min || age > LIMITS.age.max) {
        nextErrors.age = `Enter an age between ${LIMITS.age.min} and ${LIMITS.age.max}.`;
      }
      if (heightCm === null || heightCm < LIMITS.heightCm.min || heightCm > LIMITS.heightCm.max) {
        nextErrors.heightCm = `Enter a height between ${LIMITS.heightCm.min} and ${LIMITS.heightCm.max} cm.`;
      }
      if (
        currentWeightKg === null ||
        currentWeightKg < LIMITS.weightKg.min ||
        currentWeightKg > LIMITS.weightKg.max
      ) {
        nextErrors.currentWeightKg = `Enter a weight between ${LIMITS.weightKg.min} and ${LIMITS.weightKg.max} kg.`;
      }
    }

    if (index === 2) {
      if (form.goalType !== 'maintain') {
        if (
          targetWeightKg === null ||
          targetWeightKg < LIMITS.weightKg.min ||
          targetWeightKg > LIMITS.weightKg.max
        ) {
          nextErrors.targetWeightKg = `Enter a target between ${LIMITS.weightKg.min} and ${LIMITS.weightKg.max} kg.`;
        } else if (goalValidation && !goalValidation.direction.ok) {
          nextErrors.targetWeightKg = goalValidation.direction.message ?? null;
        } else if (goalValidation && !goalValidation.reachable.ok) {
          nextErrors.targetWeightKg = goalValidation.reachable.message ?? null;
        }
      }
    }

    if (index === 3) {
      nextErrors.bmrOverride =
        validateEnergyKcal(form.bmrOverride, 'resting energy').message ?? null;
      nextErrors.tdeeOverride =
        validateEnergyKcal(form.tdeeOverride, 'maintenance energy').message ?? null;

      if (!form.acceptedDisclaimer) {
        nextErrors.acceptedDisclaimer = 'Please confirm you have read the notice before continuing.';
      }
    }

    setErrors(nextErrors);
    return Object.values(nextErrors).every((value) => !value);
  };

  const goNext = () => {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((current) => Math.max(current - 1, 0));

  const submit = async () => {
    if (!validateStep(3)) return;
    if (calculation === null) {
      setSubmitError('Some details are missing. Go back and check each step.');
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      const today = getTodayLocalDate();
      await createProfile({
        name: form.name,
        age: age as number,
        sex: form.sex,
        heightCm: heightCm as number,
        currentWeightKg: currentWeightKg as number,
        activityLevel: form.activityLevel,
        bmrOverride: bmrOverride ?? undefined,
        tdeeOverride: tdeeOverride ?? undefined,
      });
      await logInitialWeight(currentWeightKg as number, today);
      await createGoal({
        type: form.goalType,
        startingWeightKg: currentWeightKg as number,
        targetWeightKg: form.goalType === 'maintain' ? (currentWeightKg as number) : (targetWeightKg as number),
        weeklyChangeKg: form.goalType === 'maintain' ? undefined : weeklyChangeKg ?? undefined,
        startedAt: today,
      });
      await db.settings.put({
        id: 'app',
        theme: form.theme,
        accent: form.accent,
        units: 'metric',
        disclaimerAcceptedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      await db.metadata.put({ key: METADATA_KEYS.onboardingCompleted, value: 'true' });
      showToast('Setup complete.', 'success');
      navigate('/', { replace: true });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to save your details. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-4 pb-10 pt-[calc(env(safe-area-inset-top,0px)+2.5rem)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-semibold tracking-[-0.01em] text-ink">Fitness Log</p>
        <p className="text-xs text-ink-subtle tnum">
          {step + 1} of {STEPS.length}
        </p>
      </div>

      <ol className="mt-4 flex items-center gap-1.5" aria-label="Setup progress">
        {STEPS.map((label, index) => (
          <li key={label} className="flex-1">
            <div
              className={[
                'h-1 rounded-full transition-colors duration-300',
                index < step ? 'bg-brand-500' : index === step ? 'bg-brand-600' : 'bg-line',
              ].join(' ')}
            />
          </li>
        ))}
      </ol>

      <div className="mt-5 flex-1">
        {step === 0 ? (
          <section className="flex flex-col gap-5 animate-rise-in">
            <div>
              <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink">Appearance</h1>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                Pick the colour you will see every day. You can change it later in Settings.
              </p>
            </div>
            <AccentPicker value={form.accent} onChange={chooseAccent} scheme={previewScheme} />
            <div>
              <p className="mb-2 text-[13px] font-medium text-ink-muted">Light or dark</p>
              <SegmentedControl
                className="w-full"
                size="sm"
                label="Light or dark"
                value={form.theme}
                onChange={chooseTheme}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ]}
              />
            </div>
          </section>
        ) : step === 1 ? (
          <section className="flex flex-col gap-5 animate-rise-in">
            <div>
              <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink">About you</h1>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                These details are used to estimate your calorie target. They stay on this device.
              </p>
            </div>
            <TextField
              label="Name"
              value={form.name}
              onChange={(value) => update('name', value)}
              error={errors.name}
              placeholder="Your name"
              autoComplete="name"
              maxLength={40}
              required
            />
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Age"
                unit="years"
                value={form.age}
                onChange={(value) => update('age', value)}
                error={errors.age}
                min={LIMITS.age.min}
                max={LIMITS.age.max}
                step={1}
                inputMode="numeric"
                placeholder="30"
                required
              />
              <SelectField
                label="Sex"
                value={form.sex}
                onChange={(value) => update('sex', value as Sex)}
                options={SEX_OPTIONS}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <NumberField
                label="Height"
                unit="cm"
                value={form.heightCm}
                onChange={(value) => update('heightCm', value)}
                error={errors.heightCm}
                min={LIMITS.heightCm.min}
                max={LIMITS.heightCm.max}
                step={1}
                placeholder="170"
                required
              />
              <NumberField
                label="Current weight"
                unit="kg"
                value={form.currentWeightKg}
                onChange={(value) => update('currentWeightKg', value)}
                error={errors.currentWeightKg}
                min={LIMITS.weightKg.min}
                max={LIMITS.weightKg.max}
                step={0.5}
                placeholder="70"
                required
              />
            </div>
          </section>
        ) : null}

        {step === 2 ? (
          <section className="flex flex-col gap-5 animate-rise-in">
            <div>
              <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink">What is your goal?</h1>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                This sets your calorie target and how progress is measured.
              </p>
            </div>

            <SegmentedControl
              label="Goal type"
              fullWidth
              value={form.goalType}
              onChange={(value) => {
                setForm((current) => ({
                  ...current,
                  goalType: value,
                  weeklyChangeKg: value === 'maintain' ? '' : value === 'lose' ? '0.5' : '0.25',
                  targetWeightKg: '',
                }));
                setErrors({});
              }}
              options={[
                { value: 'lose', label: 'Lose' },
                { value: 'maintain', label: 'Maintain' },
                { value: 'gain', label: 'Gain' },
              ]}
            />

            {form.goalType === 'maintain' ? (
              <p className="rounded-md border border-line bg-surface-sunken px-3 py-2.5 text-xs leading-relaxed text-ink-muted">
                Maintenance keeps your target at your current weight. You can set a new loss or gain goal later.
              </p>
            ) : (
              <>
                <fieldset className="flex flex-col gap-2">
                  <legend className="mb-1.5 text-sm font-medium text-ink">
                    {form.goalType === 'lose' ? 'How much per week?' : 'How much per week?'}
                  </legend>
                  <div className="grid grid-cols-4 gap-2">
                    {(form.goalType === 'lose' ? WEEKLY_OPTIONS_LOSE : WEEKLY_OPTIONS_GAIN).map((option) => {
                      const selected = weeklyChangeKg === option;
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => update('weeklyChangeKg', String(option))}
                          className={[
                            'flex h-11 items-center justify-center rounded-md border text-sm font-medium transition-colors duration-150 tnum',
                            selected
                              ? 'border-brand-500 bg-brand-50 text-brand-800'
                              : 'border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink',
                          ].join(' ')}
                        >
                          {formatNumber(option, option % 1 === 0 ? 1 : 2)}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[11px] text-ink-subtle tnum">
                    kg per week
                    {form.goalType === 'lose'
                      ? ` · supported range ${WEEKLY_CHANGE_LIMITS.lose.min} to ${WEEKLY_CHANGE_LIMITS.lose.max} kg`
                      : ` · supported range ${WEEKLY_CHANGE_LIMITS.gain.min} to ${WEEKLY_CHANGE_LIMITS.gain.max} kg`}
                  </p>
                </fieldset>

                {goalValidation?.weekly.message ? (
                  <p
                    className={[
                      'rounded-md border px-3 py-2.5 text-xs leading-relaxed',
                      goalValidation.weekly.severity === 'blocked'
                        ? 'border-critical-100 bg-critical-50 text-critical-700'
                        : 'border-caution-100 bg-caution-50 text-caution-700',
                    ].join(' ')}
                  >
                    {goalValidation.weekly.message}
                  </p>
                ) : null}

                <NumberField
                  label="Target weight"
                  unit="kg"
                  value={form.targetWeightKg}
                  onChange={(value) => update('targetWeightKg', value)}
                  error={errors.targetWeightKg}
                  min={LIMITS.weightKg.min}
                  max={LIMITS.weightKg.max}
                  step={0.5}
                  placeholder={currentWeightKg !== null ? formatWeight(currentWeightKg - 5) : '65'}
                  hint={
                    goalValidation?.estimatedWeeks
                      ? `At this rate, about ${goalValidation.estimatedWeeks} weeks.`
                      : 'The weight at which the goal is considered reached.'
                  }
                  required
                />
              </>
            )}
          </section>
        ) : null}

        {step === 3 && calculation && calculated ? (
          <section className="flex flex-col gap-5 animate-rise-in">
            <div>
              <h1 className="text-xl font-semibold tracking-[-0.02em] text-ink">Your estimate</h1>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                Review these numbers before starting. You can change them at any time.
              </p>
            </div>

            {calculation.notice ? (
              <p className="rounded-md border border-caution-100 bg-caution-50 px-3 py-2.5 text-xs leading-relaxed text-caution-700">
                {calculation.notice}
              </p>
            ) : null}

            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-subtle">
              Your energy figures
            </p>
            <p className="-mt-3 text-xs leading-relaxed text-ink-subtle">
              These are estimates from your details. If you know your own numbers, enter them below
              and everything will recalculate.
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <NumberField
                label="Resting energy (BMR)"
                unit="kcal"
                value={form.bmrOverride}
                onChange={updateBmrOverride}
                error={errors.bmrOverride}
                placeholder={String(calculated.bmr)}
                min={LIMITS.energyKcal.min}
                max={LIMITS.energyKcal.max}
                hint="Leave blank to use the estimate."
              />
              <NumberField
                label="Maintenance energy"
                unit="kcal"
                value={form.tdeeOverride}
                onChange={(value) => update('tdeeOverride', value)}
                error={errors.tdeeOverride}
                placeholder={String(derivedTdee)}
                min={LIMITS.energyKcal.min}
                max={LIMITS.energyKcal.max}
                hint="Leave blank to use the estimate."
              />
            </div>

            <dl className="divide-y divide-line rounded-lg border border-line bg-surface px-4">
              <SummaryRow
                label="Resting energy in use"
                value={`${formatCalories(calculation.bmr)} kcal`}
              />
              <SummaryRow
                label="Maintenance in use"
                value={`${formatCalories(calculation.tdee)} kcal`}
              />
              <SummaryRow
                label="Daily target"
                value={`${formatCalories(calculation.target)} kcal`}
                emphasis
              />
              <SummaryRow
                label="Goal"
                value={
                  form.goalType === 'maintain'
                    ? 'Maintain weight'
                    : `${form.goalType === 'lose' ? 'Lose' : 'Gain'} to ${formatWeight(targetWeightKg as number)} kg`
                }
              />
              {form.goalType !== 'maintain' && weeklyChangeKg ? (
                <SummaryRow label="Weekly rate" value={`${formatNumber(weeklyChangeKg, 2)} kg`} />
              ) : null}
            </dl>

            <p className="text-xs leading-relaxed text-ink-subtle">{ESTIMATE_DISCLAIMER}</p>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-line bg-surface px-3.5 py-3">
              <input
                type="checkbox"
                checked={form.acceptedDisclaimer}
                onChange={(event) => update('acceptedDisclaimer', event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand-700"
              />
              <span className="text-xs leading-relaxed text-ink-muted">{MEDICAL_DISCLAIMER}</span>
            </label>
            {errors.acceptedDisclaimer ? (
              <p className="-mt-3 text-xs text-critical-700" role="alert">
                {errors.acceptedDisclaimer}
              </p>
            ) : null}

            <div className="rounded-lg border border-line bg-surface-sunken px-3.5 py-3">
              <p className="text-xs font-medium text-ink">{PRIVACY_STATEMENT}</p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {PRIVACY_DETAILS.map((detail) => (
                  <li key={detail} className="flex gap-1.5 text-[11px] leading-relaxed text-ink-muted">
                    <span aria-hidden="true" className="text-ink-subtle">
                      &middot;
                    </span>
                    {detail}
                  </li>
                ))}
              </ul>
            </div>

            {submitError ? (
              <p className="rounded-md border border-critical-100 bg-critical-50 px-3 py-2.5 text-xs text-critical-700" role="alert">
                {submitError}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>

      <div className="mt-7 flex items-center gap-2">
        {step > 0 ? (
          <Button variant="secondary" size="lg" onClick={goBack} leadingIcon={<ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />}>
            Back
          </Button>
        ) : null}
        {step < STEPS.length - 1 ? (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={goNext}
            trailingIcon={<ArrowRight size={16} strokeWidth={2} aria-hidden="true" />}
          >
            Continue
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={submit}
            disabled={busy || !form.acceptedDisclaimer}
            trailingIcon={<ArrowRight size={16} strokeWidth={2} aria-hidden="true" />}
          >
            {busy ? 'Saving' : 'Start tracking'}
          </Button>
        )}
      </div>

      {calculation?.limited ? (
        <p className="mt-3 text-[11px] leading-relaxed text-ink-subtle">{AGGRESSIVE_TARGET_NOTICE}</p>
      ) : null}
    </div>
  );
}

function SummaryRow({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className={`text-sm font-medium tnum ${emphasis ? 'text-brand-800' : 'text-ink'}`}>{value}</dd>
    </div>
  );
}
