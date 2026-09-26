import { useMemo, useState } from 'react';
import { useElementWidth } from './useElementWidth';
import { formatDayMonth } from '@/utils/dates/dates';

export interface BarChartPoint {
  date: string;
  value: number;
  label?: string;
}

export interface BarChartProps {
  data: BarChartPoint[];
  height?: number;
  target?: number | null;
  formatValue: (value: number) => string;
  ariaLabel: string;
  emptyMessage: string;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const PADDING = { top: 10, right: 6, bottom: 20, left: 34 };
const MAX_BAR_GAP = 3;

/**
 * Daily calorie bars with a target reference line. Days without logged food are
 * not rendered at all, so a gap is visible as a gap rather than a zero bar.
 */
export function BarChart({
  data,
  height = 168,
  target = null,
  formatValue,
  ariaLabel,
  emptyMessage,
  selectedDate,
  onSelectDate,
}: BarChartProps) {
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>();
  const [activeDate, setActiveDate] = useState<string | null>(null);

  const chartWidth = Math.max(width, 240);
  const innerWidth = Math.max(chartWidth - PADDING.left - PADDING.right, 10);
  const innerHeight = Math.max(height - PADDING.top - PADDING.bottom, 10);

  const geometry = useMemo(() => {
    if (data.length === 0) return null;
    const values = data.map((point) => point.value);
    if (target !== null) values.push(target);
    const maxValue = Math.max(...values, 1);
    const scaleMax = maxValue * 1.08;

    const slot = innerWidth / data.length;
    const barWidth = Math.max(2, slot - MAX_BAR_GAP);
    const y = (value: number) => PADDING.top + innerHeight - (value / scaleMax) * innerHeight;

    const bars = data.map((point, index) => ({
      ...point,
      x: PADDING.left + index * slot + (slot - barWidth) / 2,
      width: barWidth,
      y: y(point.value),
      height: Math.max(PADDING.top + innerHeight - y(point.value), 1),
    }));

    return { bars, y, scaleMax, targetY: target !== null ? y(target) : null, slot };
  }, [data, innerWidth, innerHeight, target]);

  const activeBar = geometry?.bars.find((bar) => bar.date === activeDate) ?? null;
  const selectedBar = geometry?.bars.find((bar) => bar.date === selectedDate) ?? null;
  const focusBar = activeBar ?? selectedBar;

  if (data.length === 0) {
    return (
      <div
        ref={wrapperRef}
        className="flex items-center justify-center rounded-lg border border-dashed border-line-strong px-4 text-center"
        style={{ height }}
      >
        <p className="text-xs leading-relaxed text-ink-subtle">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div ref={wrapperRef} className="relative select-none">
      {focusBar ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-line bg-surface px-2.5 py-1.5 shadow-md"
          style={{
            left: `${Math.min(Math.max(focusBar.x + focusBar.width / 2, 58), chartWidth - 58)}px`,
            top: `${Math.max(focusBar.y - 54, 0)}px`,
          }}
        >
          <p className="text-[11px] font-medium text-ink">{formatDayMonth(focusBar.date)}</p>
          <p className="text-[11px] text-ink-muted tnum">{formatValue(focusBar.value)} kcal</p>
        </div>
      ) : null}

      <svg
        width={chartWidth}
        height={height}
        viewBox={`0 0 ${chartWidth} ${height}`}
        role="img"
        aria-label={ariaLabel}
        className="touch-pan-y"
      >
        {geometry ? (
          <>
            {[0, geometry.scaleMax / 2, geometry.scaleMax].map((tick) => (
              <g key={tick}>
                <line
                  x1={PADDING.left}
                  x2={PADDING.left + innerWidth}
                  y1={geometry.y(tick)}
                  y2={geometry.y(tick)}
                  stroke="var(--color-line)"
                  strokeWidth={1}
                />
                <text
                  x={PADDING.left - 5}
                  y={geometry.y(tick) + 3.5}
                  textAnchor="end"
                  fontSize={9.5}
                  className="tnum"
                  fill="var(--color-ink-subtle)"
                >
                  {Math.round(tick)}
                </text>
              </g>
            ))}

            {geometry.bars.map((bar) => {
              const isFocus = focusBar?.date === bar.date;
              const overTarget = target !== null && bar.value > target;
              return (
                <g key={bar.date}>
                  <rect
                    x={bar.x}
                    y={bar.y}
                    width={bar.width}
                    height={bar.height}
                    rx={Math.min(2, bar.width / 2)}
                    fill={
                      isFocus
                        ? 'var(--color-brand-800)'
                        : overTarget
                          ? 'var(--color-caution-500)'
                          : 'var(--color-brand-300)'
                    }
                  />
                  <rect
                    x={bar.x - MAX_BAR_GAP}
                    y={PADDING.top}
                    width={bar.width + MAX_BAR_GAP * 2}
                    height={innerHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onPointerEnter={() => setActiveDate(bar.date)}
                    onPointerLeave={() => setActiveDate(null)}
                    onClick={() => onSelectDate(bar.date)}
                  >
                    <title>{`${formatDayMonth(bar.date)}: ${formatValue(bar.value)} kcal`}</title>
                  </rect>
                </g>
              );
            })}

            {geometry.targetY !== null ? (
              <g>
                <line
                  x1={PADDING.left}
                  x2={PADDING.left + innerWidth}
                  y1={geometry.targetY}
                  y2={geometry.targetY}
                  stroke="var(--color-brand-600)"
                  strokeWidth={1}
                  strokeDasharray="4 3"
                />
                <text
                  x={PADDING.left + innerWidth}
                  y={geometry.targetY - 4}
                  textAnchor="end"
                  fontSize={9.5}
                  className="tnum"
                  fill="var(--color-brand-700)"
                >
                  {Math.round(target as number)}
                </text>
              </g>
            ) : null}

            <text x={PADDING.left} y={height - 5} fontSize={9.5} fill="var(--color-ink-subtle)">
              {formatDayMonth(geometry.bars[0].date)}
            </text>
            <text
              x={PADDING.left + innerWidth}
              y={height - 5}
              textAnchor="end"
              fontSize={9.5}
              fill="var(--color-ink-subtle)"
            >
              {formatDayMonth(geometry.bars[geometry.bars.length - 1].date)}
            </text>
          </>
        ) : null}
      </svg>
    </div>
  );
}
