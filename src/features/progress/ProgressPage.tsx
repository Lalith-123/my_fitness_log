import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/layout/AppShell';
import { Card } from '@/components/common/Card';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { LineChart, type LineChartPoint } from '@/components/charts/LineChart';
import { BarChart, type BarChartPoint } from '@/components/charts/BarChart';
import { InsightList } from './InsightList';
import { RANGE_OPTIONS } from './progressOptions';
import {
  useActiveGoal,
  useTargetCalories,
  useWeightLogs,
  useWeightProgress,
} from '@/hooks/useAppData';
import { getDailyNutritionInRange } from '@/services/analytics/daily';
import { calculateWeightAnalytics } from '@/services/analytics/weight';
import { buildInsights } from '@/services/analytics/monthly';
import { getRecentRange, getTodayLocalDate } from '@/utils/dates/dates';
import { average, formatNumber, round } from '@/utils/numbers/numbers';

type Metric = 'weight' | 'calories';

export function ProgressPage() {
  const [range, setRange] = useState('30');
  const [metric, setMetric] = useState<Metric>('weight');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [calorieData, setCalorieData] = useState<Map<string, { calories: number; daysLogged: number }>>(new Map());

  const today = getTodayLocalDate();
  const days = Number(range);
  const dates = useMemo(() => getRecentRange(today, days), [today, days]);

  const goal = useActiveGoal();
  const target = useTargetCalories();
  const weightLogs = useWeightLogs();
  const progress = useWeightProgress();

  useEffect(() => {
    let cancelled = false;
    const start = dates[0];
    getDailyNutritionInRange(start, today).then((map) => {
      if (cancelled) return;
      const next = new Map<string, { calories: number; daysLogged: number }>();
      map.forEach((value, date) => {
        next.set(date, { calories: value.calories, daysLogged: 1 });
      });
      setCalorieData(next);
    });
    return () => {
      cancelled = true;
    };
  }, [dates, today]);

  const weightAnalytics = useMemo(
    () => calculateWeightAnalytics(weightLogs, today, days),
    [weightLogs, today, days],
  );

  const weightSeries: LineChartPoint[] = useMemo(
    () =>
      dates.flatMap((date) => {
        const point = weightAnalytics.series7[date];
        if (!point || (point.average === null && point.value === null)) return [];
        const value = point.average ?? (point.value as number);
        return [
          {
            date,
            value,
            meta: [
              {
                label: '7-day average',
                value: point.average !== null ? `${round(point.average, 1)} kg` : 'Not enough data',
              },
              {
                label: 'Logged',
                value: point.value !== null ? `${round(point.value, 1)} kg` : 'No entry',
              },
            ],
          },
        ];
      }),
    [dates, weightAnalytics],
  );

  const calorieSeries: BarChartPoint[] = useMemo(
    () =>
      dates.map((date) => ({
        date,
        value: round(calorieData.get(date)?.calories ?? 0, 0),
      })),
    [dates, calorieData],
  );

  const loggedCalorieDays = calorieSeries.filter((point) => point.value > 0);
  const averageCalories =
    loggedCalorieDays.length > 0
      ? round(
          average(loggedCalorieDays.map((point) => point.value)) as number,
          0,
        )
      : null;
  const daysLogged = loggedCalorieDays.length;

  const rangeWeightLogs = useMemo(
    () => weightLogs.filter((log) => log.date >= dates[0]),
    [weightLogs, dates],
  );

  const insights = useMemo(() => {
    const last7 = dates.slice(-7);
    const last7Calories = last7
      .map((date) => calorieData.get(date)?.calories ?? 0)
      .filter((value) => value > 0);
    return buildInsights({
      records: new Map(),
      weightLogs: rangeWeightLogs,
      today,
      targetCalories: target?.target ?? null,
      proteinTargetGrams: null,
      calories7:
        last7Calories.length > 0 ? round(average(last7Calories) as number, 0) : null,
      loggedDays7: last7Calories.length,
      totalLoggedDays: daysLogged,
    });
  }, [dates, calorieData, rangeWeightLogs, today, target?.target, daysLogged]);

  const options = RANGE_OPTIONS;

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Progress"
        description="Trends from your own entries. Nothing here is estimated for you."
      />

      <div className="flex flex-col gap-3 pb-4">
        <SegmentedControl
          label="Time range"
          fullWidth
          size="sm"
          value={range}
          onChange={(value) => {
            setRange(value);
            setSelectedDate(null);
          }}
          options={options}
        />
        <SegmentedControl
          label="Metric"
          fullWidth
          size="sm"
          value={metric}
          onChange={(value) => {
            setMetric(value);
            setSelectedDate(null);
          }}
          options={[
            { value: 'weight', label: 'Weight' },
            { value: 'calories', label: 'Calories' },
          ]}
        />
      </div>

      {metric === 'weight' ? (
        <Card>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[14px] font-semibold text-ink">Weight trend</h2>
            <p className="text-[11px] text-ink-subtle">7-day rolling average</p>
          </div>
          <LineChart
            data={weightSeries}
            ariaLabel={`Weight over the last ${days} days`}
            emptyMessage="Log your weight on a few days to see a trend. One entry is a dot, not a trend."
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            formatValue={(value) => `${round(value, 1)} kg`}
            formatAxisLabel={(value) => round(value, 0).toString()}
            reference={
              goal && goal.type !== 'maintain'
                ? { value: goal.targetWeightKg, label: `Target ${round(goal.targetWeightKg, 1)} kg` }
                : null
            }
          />
          <WeightSummary
            average7={weightAnalytics.latestAverage7}
            average30={weightAnalytics.latestAverage30}
            totalChangeKg={weightAnalytics.totalChangeKg}
            remainingKg={progress.remainingKg}
            goalType={goal?.type ?? null}
            targetWeightKg={goal?.targetWeightKg ?? null}
          />
        </Card>
      ) : (
        <Card>
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[14px] font-semibold text-ink">Daily calories</h2>
            <p className="text-[11px] text-ink-subtle tnum">
              {daysLogged} of {days} days logged
            </p>
          </div>
          <BarChart
            data={calorieSeries}
            ariaLabel={`Calories over the last ${days} days`}
            emptyMessage="Log some food and your daily calories will appear here."
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            target={target?.target ?? null}
            formatValue={(value) => `${Math.round(value)} kcal`}
          />
          <CalorieSummary
            averageCalories={averageCalories}
            targetCalories={target?.target ?? null}
            daysLogged={daysLogged}
            days={days}
          />
        </Card>
      )}

      <div className="mt-5">
        <InsightList insights={insights} />
      </div>
    </div>
  );
}

function WeightSummary({
  average7,
  average30,
  totalChangeKg,
  remainingKg,
  goalType,
  targetWeightKg,
}: {
  average7: number | null;
  average30: number | null;
  totalChangeKg: number | null;
  remainingKg: number | null;
  goalType: 'lose' | 'gain' | 'maintain' | null;
  targetWeightKg: number | null;
}) {
  if (average7 === null && totalChangeKg === null) {
    return (
      <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-subtle">
        Daily swings are normal. The average smooths them out, so judge progress on the average
        rather than a single number.
      </p>
    );
  }

  return (
    <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3">
      <div>
        <dt className="text-[10px] text-ink-subtle">Current average</dt>
        <dd className="text-[14px] font-semibold text-ink tnum">
          {average7 !== null ? `${round(average7, 1)} kg` : '--'}
        </dd>
      </div>
      <div>
        <dt className="text-[10px] text-ink-subtle">Change so far</dt>
        <dd className="text-[14px] font-semibold text-ink tnum">
          {totalChangeKg !== null ? `${totalChangeKg > 0 ? '+' : ''}${round(totalChangeKg, 1)} kg` : '--'}
        </dd>
      </div>
      <div>
        <dt className="text-[10px] text-ink-subtle">
          {goalType === 'gain' ? 'Still to gain' : 'Still to lose'}
        </dt>
        <dd className="text-[14px] font-semibold text-ink tnum">
          {remainingKg !== null && targetWeightKg !== null ? `${round(remainingKg, 1)} kg` : '--'}
        </dd>
      </div>
      {average30 !== null ? (
        <div className="col-span-3">
          <dt className="text-[10px] text-ink-subtle">30-day average</dt>
          <dd className="text-[14px] font-semibold text-ink tnum">{round(average30, 1)} kg</dd>
        </div>
      ) : null}
    </dl>
  );
}

function CalorieSummary({
  averageCalories,
  targetCalories,
  daysLogged,
  days,
}: {
  averageCalories: number | null;
  targetCalories: number | null;
  daysLogged: number;
  days: number;
}) {
  if (averageCalories === null) {
    return (
      <p className="mt-3 border-t border-line pt-3 text-[11px] leading-relaxed text-ink-subtle">
        Days without food are left blank rather than counted as zero, so your average reflects the
        days you actually tracked.
      </p>
    );
  }

  const difference = targetCalories !== null ? averageCalories - targetCalories : null;

  return (
    <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-line pt-3">
      <div>
        <dt className="text-[10px] text-ink-subtle">Daily average</dt>
        <dd className="text-[14px] font-semibold text-ink tnum">
          {formatNumber(averageCalories, 0)} kcal
        </dd>
      </div>
      <div>
        <dt className="text-[10px] text-ink-subtle">Against target</dt>
        <dd className="text-[14px] font-semibold text-ink tnum">
          {difference === null
            ? '--'
            : `${difference > 0 ? '+' : ''}${formatNumber(difference, 0)} kcal`}
        </dd>
      </div>
      <div>
        <dt className="text-[10px] text-ink-subtle">Days logged</dt>
        <dd className="text-[14px] font-semibold text-ink tnum">
          {daysLogged}
          <span className="text-[10px] font-normal text-ink-subtle">/{days}</span>
        </dd>
      </div>
    </dl>
  );
}
