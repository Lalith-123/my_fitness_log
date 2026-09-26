import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from '@/components/common/IconButton';
import { addDays, formatLongDate, formatRelativeDay, isToday } from '@/utils/dates/dates';

export interface DateNavigatorProps {
  date: string;
  firstDate: string;
  onChange: (date: string) => void;
}

/**
 * Compact day navigator. The next-day control is disabled on today and the
 * previous control is disabled on the first recorded date, so navigation never
 * runs past the available range. There is no way to reach a future date.
 */
export function DateNavigator({ date, firstDate, onChange }: DateNavigatorProps) {
  const canGoBack = date > firstDate;
  const canGoForward = !isToday(date);

  return (
    <div className="flex items-center justify-between gap-1">
      <IconButton
        label="Previous day"
        size="sm"
        disabled={!canGoBack}
        onClick={() => onChange(addDays(date, -1))}
      >
        <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
      </IconButton>

      <div className="flex min-w-0 flex-1 flex-col items-center gap-0.5">
        <div className="flex items-center gap-2">
          <p className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">
            {formatLongDate(date)}
          </p>
          {isToday(date) ? (
            <span className="shrink-0 rounded-xs bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
              Today
            </span>
          ) : (
            <span className="shrink-0 text-[11px] text-ink-subtle">{formatRelativeDay(date)}</span>
          )}
        </div>
        {!isToday(date) ? (
          <p className="text-[11px] text-ink-subtle">Swipe to change day</p>
        ) : null}
      </div>

      <IconButton
        label="Next day"
        size="sm"
        disabled={!canGoForward}
        onClick={() => onChange(addDays(date, 1))}
      >
        <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
      </IconButton>
    </div>
  );
}
