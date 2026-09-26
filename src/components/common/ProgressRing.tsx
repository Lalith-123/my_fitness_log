import { clamp, round } from '@/utils/numbers/numbers';

export interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  /** Text placed in the middle. */
  centerLabel: string;
  centerValue?: string;
  tone?: 'brand' | 'complete';
}

const TONE_STROKE = {
  brand: 'var(--color-brand-600)',
  complete: 'var(--color-brand-400)',
} as const;

/** Compact circular progress indicator. Used only for goal progress. */
export function ProgressRing({
  value,
  max = 100,
  size = 56,
  strokeWidth = 5,
  label,
  centerLabel,
  centerValue,
  tone = 'brand',
}: ProgressRingProps) {
  const ratio = max > 0 ? clamp(value / max, 0, 1) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * ratio;

  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${Math.round(ratio * 100)}%`}
    >
      <svg width={size} height={size} aria-hidden="true" className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-sunken)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={TONE_STROKE[tone]}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          className="transition-[stroke-dasharray] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[13px] leading-none font-semibold text-ink tnum">
          {centerValue ?? `${round(ratio * 100, 0)}%`}
        </span>
        <span className="mt-0.5 text-[9px] leading-none text-ink-subtle">{centerLabel}</span>
      </div>
    </div>
  );
}
