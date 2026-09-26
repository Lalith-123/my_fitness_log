import { useCallback, useMemo, useRef, useState } from 'react';
import { useElementWidth } from './useElementWidth';
import { formatDayMonth, fromDateKey, toDateKey } from '@/utils/dates/dates';

export interface LineChartPoint {
  date: string;
  value: number;
  /** Extra lines shown in the tooltip, for example calories logged that day. */
  meta?: { label: string; value: string }[];
}

export interface LineChartProps {
  data: LineChartPoint[];
  height?: number;
  /** Optional reference line, for example a goal weight. */
  reference?: { value: number; label: string } | null;
  formatValue: (value: number) => string;
  formatAxisLabel?: (value: number) => string;
  yPadding?: number;
  ariaLabel: string;
  emptyMessage: string;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const PADDING = { top: 12, right: 10, bottom: 22, left: 38 };
const HIT_RADIUS = 22;

function niceBounds(values: number[], padding: number): { min: number; max: number } {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;
  if (span === 0) {
    const base = max || 0;
    return { min: base - 1, max: base + 1 };
  }
  const buffer = span * padding;
  return { min: min - buffer, max: max + buffer };
}

export function LineChart({
  data,
  height = 200,
  reference = null,
  formatValue,
  formatAxisLabel,
  yPadding = 0.12,
  ariaLabel,
  emptyMessage,
  selectedDate,
  onSelectDate,
}: LineChartProps) {
  const [wrapperRef, width] = useElementWidth<HTMLDivElement>();
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const chartWidth = Math.max(width, 240);
  const innerWidth = Math.max(chartWidth - PADDING.left - PADDING.right, 10);
  const innerHeight = Math.max(height - PADDING.top - PADDING.bottom, 10);

  const geometry = useMemo(() => {
    if (data.length === 0) return null;

    const times = data.map((point) => fromDateKey(point.date).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeSpan = maxTime - minTime || 1;

    const candidateValues = data.map((point) => point.value);
    if (reference) candidateValues.push(reference.value);
    const { min, max } = niceBounds(candidateValues, yPadding);

    const x = (date: string) => {
      const time = fromDateKey(date).getTime();
      return PADDING.left + ((time - minTime) / timeSpan) * innerWidth;
    };
    const y = (value: number) =>
      PADDING.top + innerHeight - ((value - min) / (max - min || 1)) * innerHeight;

    const points = data.map((point) => ({ ...point, cx: x(point.date), cy: y(point.value) }));
    const line = points
      .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.cx.toFixed(2)},${point.cy.toFixed(2)}`)
      .join(' ');
    const area =
      points.length > 1
        ? `${line} L${points[points.length - 1].cx.toFixed(2)},${(PADDING.top + innerHeight).toFixed(2)} L${points[0].cx.toFixed(2)},${(PADDING.top + innerHeight).toFixed(2)} Z`
        : '';

    const ticks = [min, min + (max - min) / 2, max];

    return { points, line, area, x, y, min, max, ticks, minTime, maxTime };
  }, [data, innerWidth, innerHeight, reference, yPadding]);

  const handlePointer = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!geometry) return;
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const clientX = event.clientX - rect.left;
      let nearest = 0;
      let nearestDistance = Infinity;
      geometry.points.forEach((point, index) => {
        const distance = Math.abs(point.cx - clientX);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearest = index;
        }
      });
      setActiveIndex(nearest);
    },
    [geometry],
  );

  const clearPointer = useCallback(() => setActiveIndex(null), []);

  const activePoint = activeIndex !== null ? geometry?.points[activeIndex] : null;
  const selectedPoint = geometry?.points.find((point) => point.date === selectedDate) ?? null;
  const focusPoint = activePoint ?? selectedPoint;

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
      {focusPoint ? (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-md border border-line bg-surface px-2.5 py-1.5 shadow-md"
          style={{
            left: `${Math.min(Math.max(focusPoint.cx, 62), chartWidth - 62)}px`,
            top: `${Math.max(focusPoint.cy - 66, 0)}px`,
          }}
        >
          <p className="text-[11px] font-medium text-ink">{formatDayMonth(focusPoint.date)}</p>
          <p className="text-[11px] text-ink-muted tnum">
            {formatValue(focusPoint.value)} {focusPoint.meta?.map((m) => `${m.label} ${m.value}`).join(' · ')}
          </p>
        </div>
      ) : null}

      <svg
        ref={svgRef}
        width={chartWidth}
        height={height}
        viewBox={`0 0 ${chartWidth} ${height}`}
        role="img"
        aria-label={ariaLabel}
        className="touch-pan-y"
        onPointerDown={handlePointer}
        onPointerMove={(event) => {
          if (event.buttons > 0 || event.pointerType === 'mouse') handlePointer(event);
        }}
        onPointerLeave={clearPointer}
        onPointerUp={clearPointer}
      >
        {geometry ? (
          <>
            {geometry.ticks.map((tick) => (
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
                  x={PADDING.left - 6}
                  y={geometry.y(tick) + 3.5}
                  textAnchor="end"
                  fontSize={10}
                  className="tnum"
                  fill="var(--color-ink-subtle)"
                >
                  {(formatAxisLabel ?? formatValue)(tick)}
                </text>
              </g>
            ))}

            {reference ? (
              <g>
                <line
                  x1={PADDING.left}
                  x2={PADDING.left + innerWidth}
                  y1={geometry.y(reference.value)}
                  y2={geometry.y(reference.value)}
                  stroke="var(--color-brand-400)"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />
                <text
                  x={PADDING.left + innerWidth}
                  y={geometry.y(reference.value) - 5}
                  textAnchor="end"
                  fontSize={10}
                  fill="var(--color-brand-600)"
                >
                  {reference.label}
                </text>
              </g>
            ) : null}

            {geometry.area ? <path d={geometry.area} fill="var(--color-brand-50)" opacity={0.9} /> : null}
            <path
              d={geometry.line}
              fill="none"
              stroke="var(--color-brand-600)"
              strokeWidth={1.75}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {geometry.points.map((point) => {
              const isFocus = focusPoint?.date === point.date;
              return (
                <circle
                  key={point.date}
                  cx={point.cx}
                  cy={point.cy}
                  r={isFocus ? 4.5 : 2.4}
                  fill={isFocus ? 'var(--color-brand-700)' : 'var(--color-brand-600)'}
                  stroke="var(--color-surface)"
                  strokeWidth={1.5}
                />
              );
            })}

            {geometry.points.map((point, index) => (
              <circle
                key={`hit-${point.date}`}
                cx={point.cx}
                cy={point.cy}
                r={HIT_RADIUS}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => onSelectDate(point.date)}
                onPointerEnter={() => setActiveIndex(index)}
                aria-label={`${formatDayMonth(point.date)}: ${formatValue(point.value)}`}
              />
            ))}

            <text
              x={PADDING.left}
              y={height - 6}
              fontSize={10}
              fill="var(--color-ink-subtle)"
            >
              {formatDayMonth(toDateKey(new Date(geometry.minTime)))}
            </text>
            <text
              x={PADDING.left + innerWidth}
              y={height - 6}
              textAnchor="end"
              fontSize={10}
              fill="var(--color-ink-subtle)"
            >
              {formatDayMonth(toDateKey(new Date(geometry.maxTime)))}
            </text>
          </>
        ) : null}
      </svg>
    </div>
  );
}
