import type { ReactNode } from 'react';
import { clamp, round } from '@/utils/numbers/numbers';

export type ProgressTone = 'brand' | 'caution' | 'critical' | 'neutral';

const BAR_TONES: Record<ProgressTone, string> = {
  brand: 'bg-brand-600',
  caution: 'bg-caution-500',
  critical: 'bg-critical-500',
  neutral: 'bg-ink-subtle',
};

export interface ProgressBarProps {
  /** 0 or greater. Values above 1 are rendered full and flagged as over. */
  value: number;
  max?: number;
  tone?: ProgressTone;
  label: string;
  showValue?: boolean;
  trailing?: ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export function toneForRatio(ratio: number, isOver: boolean): ProgressTone {
  if (isOver) return 'caution';
  return ratio >= 0.5 ? 'brand' : 'neutral';
}

export function ProgressBar({
  value,
  max = 1,
  tone = 'brand',
  label,
  showValue = false,
  trailing,
  size = 'sm',
  className = '',
}: ProgressBarProps) {
  const ratio = max > 0 ? value / max : 0;
  const isOver = ratio > 1;
  const width = `${clamp(isOver ? 1 : ratio, 0, 1) * 100}%`;
  const resolvedTone = tone === 'brand' ? toneForRatio(ratio, isOver) : tone;

  return (
    <div className={['flex flex-col gap-1.5', className].filter(Boolean).join(' ')}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs text-ink-muted">{label}</span>
        <span className="text-xs font-medium text-ink-muted tnum">
          {trailing}
          {showValue ? `${round(value, 1)} / ${round(max, 1)}` : null}
        </span>
      </div>
      <div
        className={['w-full overflow-hidden rounded-full bg-surface-sunken', size === 'md' ? 'h-2' : 'h-1.5'].join(' ')}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={round(max, 2)}
        aria-valuenow={round(value, 2)}
        aria-label={label}
      >
        <div
          className={['h-full rounded-full transition-[width] duration-500 ease-out', BAR_TONES[resolvedTone]].join(' ')}
          style={{ width }}
        />
      </div>
    </div>
  );
}
