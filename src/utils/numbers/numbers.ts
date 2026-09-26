export function round(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Round a calorie value to a whole number. */
export function roundCalories(value: number): number {
  return Math.max(0, Math.round(value));
}

/** Round a gram value to one decimal place. */
export function roundGrams(value: number): number {
  return round(value, 1);
}

export function formatNumber(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return '0';
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatCalories(value: number): string {
  return formatNumber(roundCalories(value));
}

export function formatGrams(value: number): string {
  return formatNumber(round(value, value >= 100 ? 0 : 1));
}

export function formatWeight(value: number): string {
  return formatNumber(value, 1);
}

export function formatSignedWeight(value: number): string {
  const rounded = round(value, 1);
  if (rounded === 0) return '0.0';
  return `${rounded > 0 ? '+' : '−'}${formatNumber(Math.abs(rounded), 1)}`;
}

export function formatPercent(ratio: number, decimals = 0): string {
  return `${formatNumber(clamp(ratio, 0, 999) * 100, decimals)}%`;
}

/** Parse user input into a finite number, or `null` when unusable. */
export function parseNumericInput(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.');
  if (trimmed === '') return null;
  const value = Number(trimmed);
  if (!Number.isFinite(value)) return null;
  return value;
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return sum(values) / values.length;
}
