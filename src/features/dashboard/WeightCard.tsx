import { TrendingDown, TrendingUp } from 'lucide-react';
import { Card, CardHeader } from '@/components/common/Card';
import { ProgressRing } from '@/components/common/ProgressRing';
import { formatDayMonth } from '@/utils/dates/dates';
import { round } from '@/utils/numbers/numbers';
import type { Goal } from '@/types';

export interface WeightCardProps {
  date: string;
  weightKg: number | null;
  weightDate: string | null;
  average7: number | null;
  average30: number | null;
  goal: Goal | null;
  progressRatio: number;
  remainingKg: number | null;
  isTodayView: boolean;
  onLogWeight: () => void;
}

export function WeightCard({
  date,
  weightKg,
  weightDate,
  average7,
  average30,
  goal,
  progressRatio,
  remainingKg,
  isTodayView,
  onLogWeight,
}: WeightCardProps) {
  const loggedToday = weightDate === date;

  return (
    <Card>
      <CardHeader
        title={<span className="flex items-center gap-1.5">Weight</span>}
        trailing={
          <button
            type="button"
            onClick={onLogWeight}
            className="text-[12px] font-medium text-brand-700 hover:text-brand-800"
          >
            {weightKg !== null ? (loggedToday ? 'Update' : 'Log') : 'Log'}
          </button>
        }
      />

      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[24px] leading-none font-semibold tracking-[-0.02em] text-ink tnum">
            {weightKg !== null ? round(weightKg, 1) : '--'}
          </span>
          <span className="text-[12px] text-ink-subtle">kg</span>
        </div>
        {weightDate ? (
          <span className="text-[11px] text-ink-subtle">
            {loggedToday ? 'Logged today' : `As of ${formatDayMonth(weightDate)}`}
          </span>
        ) : null}
      </div>

      {average7 !== null || average30 !== null ? (
        <dl className="mt-3 flex gap-4 border-t border-line pt-3">
          {average7 !== null ? (
            <div className="flex flex-col gap-0.5">
              <dt className="text-[10px] text-ink-subtle">7-day average</dt>
              <dd className="text-[13px] font-medium text-ink tnum">{round(average7, 1)} kg</dd>
            </div>
          ) : null}
          {average30 !== null ? (
            <div className="flex flex-col gap-0.5">
              <dt className="flex items-center gap-1 text-[10px] text-ink-subtle">
                30-day average
                {average7 !== null && average30 < average7 ? (
                  <TrendingDown size={11} strokeWidth={2.2} aria-hidden="true" />
                ) : null}
                {average7 !== null && average30 > average7 ? (
                  <TrendingUp size={11} strokeWidth={2.2} aria-hidden="true" />
                ) : null}
              </dt>
              <dd className="text-[13px] font-medium text-ink tnum">{round(average30, 1)} kg</dd>
            </div>
          ) : null}
        </dl>
      ) : null}

      {goal ? (
        <div className="mt-3 flex items-center gap-3 border-t border-line pt-3">
          <ProgressRing
            value={progressRatio * 100}
            size={44}
            strokeWidth={4}
            label="Goal progress"
            centerValue={`${Math.round(progressRatio * 100)}%`}
            centerLabel="done"
            tone={progressRatio >= 1 ? 'complete' : 'brand'}
          />
          <div className="min-w-0 text-[12px] text-ink-muted">
            {progressRatio >= 1 ? (
              <p>Target of {round(goal.targetWeightKg, 1)} kg reached. Now maintaining.</p>
            ) : remainingKg !== null ? (
              <>
                <p>
                  <span className="font-medium text-ink tnum">{round(remainingKg, 1)} kg</span> to go
                  toward {round(goal.targetWeightKg, 1)} kg
                </p>
                {goal.weeklyChangeKg ? (
                  <p className="text-[11px] text-ink-subtle">
                    Pacing {round(Math.abs(goal.weeklyChangeKg), 2)} kg per week
                  </p>
                ) : null}
              </>
            ) : (
              <p>Log your weight to see progress toward {round(goal.targetWeightKg, 1)} kg.</p>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-3 border-t border-line pt-3 text-[11px] text-ink-subtle">
          No goal set yet. {isTodayView ? 'You can set one in Settings.' : ''}
        </p>
      )}
    </Card>
  );
}
