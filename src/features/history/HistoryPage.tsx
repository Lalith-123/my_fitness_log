import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { ConfirmDialog } from '@/components/common/Dialog';
import { useToast } from '@/components/common/Toast';
import { DateNavigator } from '@/features/dashboard/DateNavigator';
import { MealCard } from '@/features/dashboard/MealCard';
import { LogWeightDialog } from '@/features/weight/LogWeightDialog';
import { useDayData, useFirstRecordedDate } from '@/hooks/useAppData';
import { deleteWeightLog } from '@/services/weight/weight';
import { formatFullDate, getTodayLocalDate, isToday } from '@/utils/dates/dates';
import { round } from '@/utils/numbers/numbers';
import type { MealItem, MealType } from '@/types';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function HistoryPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const firstDate = useFirstRecordedDate();

  const [date, setDate] = useState(() => getTodayLocalDate());
  const [pendingWeight, setPendingWeight] = useState<string | null>(null);
  const [weightOpen, setWeightOpen] = useState(false);

  useEffect(() => {
    if (date < firstDate) setDate(firstDate);
  }, [date, firstDate]);

  const day = useDayData(date);

  const itemsByType = useMemo(() => {
    const map = new Map<MealType, MealItem[]>();
    for (const type of MEALS) {
      const meal = day.meals.find((entry) => entry.mealType === type);
      map.set(type, meal ? (day.itemsByMealId.get(meal.id) ?? []) : []);
    }
    return map;
  }, [day]);

  const totalItems = [...itemsByType.values()].reduce((sum, list) => sum + list.length, 0);
  const hasAnything = totalItems > 0 || Boolean(day.weight);

  return (
    <div className="flex flex-col">
      <PageHeader
        title="History"
        description="Review or change anything you have already logged."
        action={
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Download size={15} strokeWidth={2} aria-hidden="true" />}
            onClick={() => navigate('/settings')}
          >
            Export
          </Button>
        }
      />

      <div className="pb-4">
        <DateNavigator date={date} firstDate={firstDate} onChange={setDate} />
      </div>

      <p className="pb-3 text-[12px] text-ink-subtle">{formatFullDate(date)}</p>

      {!hasAnything ? (
        <EmptyState
          title={isToday(date) ? 'Nothing logged today' : 'Nothing logged on this day'}
          description={
            isToday(date)
              ? 'Add food from the home screen and it will appear here.'
              : 'Use the arrows to move to a day that has entries.'
          }
          actionLabel={isToday(date) ? 'Go to home' : undefined}
          onAction={isToday(date) ? () => navigate('/') : undefined}
        />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex flex-col">
            {MEALS.map((mealType) => (
              <MealCard
                key={mealType}
                date={date}
                mealType={mealType}
                items={itemsByType.get(mealType) ?? []}
              />
            ))}
          </div>

          <Card>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-[13px] font-semibold text-ink">Weight</h2>
              {day.weight ? (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setWeightOpen(true)}
                    aria-label="Edit weight for this day"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
                  >
                    <Pencil size={14} strokeWidth={2} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingWeight(day.weight?.id ?? null)}
                    aria-label="Delete weight for this day"
                    className="flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-critical-600"
                  >
                    <Trash2 size={14} strokeWidth={2} aria-hidden="true" />
                  </button>
                </div>
              ) : null}
            </div>
            {day.weight ? (
              <p className="mt-1 text-[15px] font-semibold text-ink tnum">
                {round(day.weight.weightKg, 1)} kg
              </p>
            ) : (
              <p className="mt-1 text-[12px] text-ink-subtle">No weight entry for this day.</p>
            )}
          </Card>

          <p className="text-[11px] leading-relaxed text-ink-subtle">
            Deleting an entry removes it permanently. Meals you have already logged keep the values
            recorded at the time, even if the food itself is edited later.
          </p>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingWeight)}
        title="Delete weight entry?"
        message="This removes the weight recorded for this day."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          const id = pendingWeight;
          setPendingWeight(null);
          if (!id) return;
          try {
            await deleteWeightLog(id);
            showToast('Weight entry removed.', 'success');
          } catch {
            showToast('Unable to remove that entry.', 'caution');
          }
        }}
        onCancel={() => setPendingWeight(null)}
      />

      <LogWeightDialog
        open={weightOpen}
        onClose={() => setWeightOpen(false)}
        date={date}
        existingWeightKg={day.weight?.weightKg ?? null}
      />
    </div>
  );
}
