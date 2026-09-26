import { Card, CardHeader } from '@/components/common/Card';
import { ProgressBar } from '@/components/common/ProgressBar';
import { formatCalories, round } from '@/utils/numbers/numbers';
import { formatRelativeDay, isToday } from '@/utils/dates/dates';
import type { GoalType, NutritionTotals } from '@/types';

export interface CalorieCardProps {
  date: string;
  consumed: number;
  target: number;
  hasFood: boolean;
  nutrition: NutritionTotals;
  goalType: GoalType | null;
  limited: boolean;
}

const MACRO_DOTS: { key: keyof NutritionTotals; label: string; color: string }[] = [
  { key: 'protein', label: 'Protein', color: 'var(--color-protein)' },
  { key: 'carbs', label: 'Carbs', color: 'var(--color-carbs)' },
  { key: 'fat', label: 'Fat', color: 'var(--color-fat)' },
  { key: 'fiber', label: 'Fiber', color: 'var(--color-fiber)' },
];

export function CalorieCard({
  date,
  consumed,
  target,
  hasFood,
  nutrition,
  goalType,
  limited,
}: CalorieCardProps) {
  const remaining = Math.round(target - consumed);
  const isOver = remaining < 0;
  // Only claim the target is met once the day actually reaches it.
  const isReached = hasFood && target > 0 && remaining <= 0;

  return (
    <Card>
      <CardHeader
        title="Calories"
        trailing={isToday(date) ? 'Today' : formatRelativeDay(date)}
      />

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[32px] leading-none font-semibold tracking-[-0.03em] text-ink tnum">
            {formatCalories(consumed)}
          </span>
          <span className="text-[12px] text-ink-subtle tnum">/ {formatCalories(target)} kcal</span>
        </div>
        {isReached ? (
          <span className="rounded-xs bg-brand-50 px-2 py-1 text-[11px] font-medium text-brand-700">
            Target reached
          </span>
        ) : null}
      </div>

      <ProgressBar
        className="mt-3"
        value={consumed}
        max={target}
        label="Daily calories"
        size="md"
        trailing={`${Math.round((target > 0 ? consumed / target : 0) * 100)}%`}
      />

      <p className="mt-2.5 text-[12px] text-ink-muted">
        {isOver ? (
          <>
            <span className="font-medium text-ink tnum">{formatCalories(Math.abs(remaining))} kcal</span>{' '}
            over target
          </>
        ) : (
          <>
            <span className="font-medium text-ink tnum">{formatCalories(remaining)} kcal</span>{' '}
            remaining
          </>
        )}
        {goalType ? <span className="text-ink-subtle"> · {GOAL_LABEL[goalType]}</span> : null}
      </p>

      {limited ? (
        <p className="mt-2 rounded-md bg-caution-50 px-3 py-2 text-[11px] leading-relaxed text-caution-900">
          Your target was adjusted to stay within a safe range. This is a guardrail, not medical
          advice.
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-4 gap-2 border-t border-line pt-3">
        {MACRO_DOTS.map((macro) => (
          <div key={macro.key} className="flex flex-col gap-0.5">
            <dt className="flex items-center gap-1.5 text-[10px] text-ink-subtle">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: macro.color }}
                aria-hidden="true"
              />
              {macro.label}
            </dt>
            <dd className="text-[14px] font-semibold text-ink tnum">
              {round(nutrition[macro.key], 0)}
              <span className="ml-0.5 text-[10px] font-normal text-ink-subtle">g</span>
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

const GOAL_LABEL: Record<GoalType, string> = {
  lose: 'Fat loss',
  gain: 'Lean gain',
  maintain: 'Maintenance',
};
