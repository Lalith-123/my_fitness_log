import { useEffect, useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import { ESTIMATE_DISCLAIMER } from '@/app/content';
import { DateNavigator } from './DateNavigator';
import { MealCard } from './MealCard';
import { CalorieCard } from './CalorieCard';
import { WeightCard } from './WeightCard';
import { LogWeightDialog } from '@/features/weight/LogWeightDialog';
import {
  useActiveGoal,
  useDayData,
  useFirstRecordedDate,
  useProfile,
  useTargetCalories,
  useWeightLogs,
  useWeightProgress,
} from '@/hooks/useAppData';
import { MEAL_ORDER } from '@/services/meals/meals';
import { calculateWeightAnalytics } from '@/services/analytics/weight';
import { getGreeting, getTodayLocalDate, isToday } from '@/utils/dates/dates';
import type { WeightLog } from '@/types';

/** Most recent weight entry on or before a date. */
function weightOnOrBefore(logs: WeightLog[], date: string): WeightLog | undefined {
  let match: WeightLog | undefined;
  for (const log of logs) {
    if (log.date <= date) match = log;
    else break;
  }
  return match;
}

export function DashboardPage() {
  const profile = useProfile();
  const goal = useActiveGoal();
  const firstDate = useFirstRecordedDate();
  const targets = useTargetCalories();
  const weightLogs = useWeightLogs();
  const progress = useWeightProgress();

  const [date, setDate] = useState(() => getTodayLocalDate());
  const [weightDialogOpen, setWeightDialogOpen] = useState(false);

  // Keep the selected day inside the available range.
  useEffect(() => {
    if (date < firstDate) setDate(firstDate);
  }, [date, firstDate]);

  const day = useDayData(date);
  const visibleWeight = useMemo(() => weightOnOrBefore(weightLogs, date), [weightLogs, date]);
  const weightAnalytics = useMemo(
    () => calculateWeightAnalytics(weightLogs, date),
    [weightLogs, date],
  );

  const isTodayView = isToday(date);
  const calorieTarget = targets?.target ?? 0;
  const dayHasFood = [...day.itemsByMealId.values()].some((list) => list.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div>
          <p className="text-[13px] text-ink-muted">{getGreeting()}</p>
          <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.02em] text-ink">
            {profile?.name ?? 'Welcome'}
          </h1>
        </div>
        <DateNavigator date={date} firstDate={firstDate} onChange={setDate} />
      </header>

      {!isTodayView ? (
        <p className="-mt-3 text-[11px] leading-relaxed text-ink-subtle">
          Viewing an earlier day. Anything you log here is added to that day.
        </p>
      ) : null}

      <CalorieCard
        date={date}
        consumed={day.nutrition.calories}
        target={calorieTarget}
        hasFood={dayHasFood}
        nutrition={day.nutrition}
        goalType={goal?.type ?? null}
        limited={targets?.limited ?? false}
      />

      <div className="flex flex-col">
        {MEAL_ORDER.map((mealType) => (
          <MealCard
            key={mealType}
            date={date}
            mealType={mealType}
            items={day.itemsByMealId.get(mealIdFor(day.meals, mealType)) ?? []}
            targetCalories={Math.round(calorieTarget / MEAL_ORDER.length)}
          />
        ))}
      </div>

      <WeightCard
        date={date}
        weightKg={visibleWeight?.weightKg ?? null}
        weightDate={visibleWeight?.date ?? null}
        average7={weightAnalytics.latestAverage7}
        average30={weightAnalytics.latestAverage30}
        goal={goal ?? null}
        progressRatio={progress.progressRatio}
        remainingKg={progress.remainingKg}
        isTodayView={isTodayView}
        onLogWeight={() => setWeightDialogOpen(true)}
      />

      <p className="text-[11px] leading-relaxed text-ink-subtle">
        <Info size={11} strokeWidth={2} aria-hidden="true" className="mr-1 inline align-[-1px]" />
        {ESTIMATE_DISCLAIMER}
      </p>

      <LogWeightDialog
        open={weightDialogOpen}
        onClose={() => setWeightDialogOpen(false)}
        date={isTodayView ? getTodayLocalDate() : date}
        existingWeightKg={day.weight?.weightKg ?? null}
      />
    </div>
  );
}

/** Meal id for a meal type on the selected day, or an empty string when absent. */
function mealIdFor(meals: { id: string; mealType: string }[], mealType: string): string {
  return meals.find((meal) => meal.mealType === mealType)?.id ?? '';
}
