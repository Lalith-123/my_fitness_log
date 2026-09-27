import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, Pencil } from 'lucide-react';
import { PageHeader } from '@/components/layout/AppShell';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Dialog } from '@/components/common/Dialog';
import { EmptyState } from '@/components/common/EmptyState';
import { SelectField } from '@/components/common/SelectField';
import { useToast } from '@/components/common/Toast';
import { DateNavigator } from '@/features/dashboard/DateNavigator';
import { MealCard } from '@/features/dashboard/MealCard';
import { LogWeightDialog } from '@/features/weight/LogWeightDialog';
import { useDayData, useFirstRecordedDate, useProfile } from '@/hooks/useAppData';
import { getAvailableMonths, type MonthOption } from '@/services/analytics/monthly';
import { exportMonthlyCsv } from '@/services/export/csv';
import {
  formatFullDate,
  formatMonthYear,
  getMonthKey,
  getTodayLocalDate,
  isToday,
} from '@/utils/dates/dates';
import { round } from '@/utils/numbers/numbers';
import type { MealItem, MealType } from '@/types';

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export function HistoryPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const firstDate = useFirstRecordedDate();
  const profile = useProfile();

  const [date, setDate] = useState(() => getTodayLocalDate());
  const [weightOpen, setWeightOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMonthKey, setExportMonthKey] = useState(() => getMonthKey(getTodayLocalDate()));
  const [exportMonths, setExportMonths] = useState<MonthOption[]>([]);
  const [exporting, setExporting] = useState(false);

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

  // Default to the month on screen so the dialog opens on what the user is looking at.
  const openExport = () => {
    setExportMonthKey(getMonthKey(date));
    setExportOpen(true);
    getAvailableMonths(getTodayLocalDate()).then(setExportMonths).catch(() => setExportMonths([]));
  };

  const exportMonthOptions = useMemo(
    () =>
      exportMonths.map((month) => ({
        value: month.monthKey,
        label:
          month.daysLogged > 0
            ? `${formatMonthYear(month.monthKey)} (${month.daysLogged}d)`
            : formatMonthYear(month.monthKey),
      })),
    [exportMonths],
  );

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const result = await exportMonthlyCsv(profile?.name ?? 'fitness-log', exportMonthKey);
      showToast(
        result.rowCount > 0
          ? `Exported ${result.rowCount} rows for ${formatMonthYear(exportMonthKey)}.`
          : `No entries to export for ${formatMonthYear(exportMonthKey)}.`,
        result.rowCount > 0 ? 'success' : 'caution',
      );
      if (result.rowCount > 0) setExportOpen(false);
    } catch {
      showToast('Could not create the CSV file.', 'caution');
    } finally {
      setExporting(false);
    }
  };

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
            onClick={openExport}
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
                <button
                  type="button"
                  onClick={() => setWeightOpen(true)}
                  aria-label="Edit weight for this day"
                  className="flex h-8 w-8 items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface-sunken hover:text-ink"
                >
                  <Pencil size={14} strokeWidth={2} aria-hidden="true" />
                </button>
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
            Weight is one entry per day, so editing replaces the value. Meals you have already logged
            keep the values recorded at the time, even if the food itself is edited later.
          </p>
        </div>
      )}

      <Dialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        title="Export CSV"
        description="One row per logged food, with the weight for that day."
        footer={
          <>
            <Button variant="secondary" size="md" onClick={() => setExportOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleExportCsv}
              disabled={exporting}
              leadingIcon={<Download size={15} strokeWidth={2} aria-hidden="true" />}
            >
              {exporting ? 'Preparing' : 'Download CSV'}
            </Button>
          </>
        }
      >
        <SelectField
          label="Month"
          hint="Only months you have logged something in are listed."
          value={exportMonthKey}
          onChange={(value) => setExportMonthKey(value)}
          options={
            exportMonthOptions.length > 0
              ? exportMonthOptions
              : [{ value: exportMonthKey, label: formatMonthYear(exportMonthKey) }]
          }
        />
      </Dialog>

      <LogWeightDialog
        open={weightOpen}
        onClose={() => setWeightOpen(false)}
        date={date}
        existingWeightKg={day.weight?.weightKg ?? null}
      />
    </div>
  );
}
