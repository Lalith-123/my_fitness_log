export type DateInput = Date | string | number;

/** Local calendar day as `YYYY-MM-DD`. Never derived via `toISOString()`. */
export function toDateKey(date: DateInput): string {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayLocalDate(): string {
  return toDateKey(new Date());
}

/** Parse `YYYY-MM-DD` into a local Date at midnight. */
export function fromDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function addDays(key: string, amount: number): string {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + amount);
  return toDateKey(date);
}

export function addMonths(key: string, amount: number): string {
  const date = fromDateKey(key);
  const targetDay = date.getDate();
  date.setDate(1);
  date.setMonth(date.getMonth() + amount);
  const lastDay = getDaysInMonth(date.getFullYear(), date.getMonth());
  date.setDate(Math.min(targetDay, lastDay));
  return toDateKey(date);
}

export function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function diffInDays(fromKey: string, toKey: string): number {
  const from = fromDateKey(fromKey).getTime();
  const to = fromDateKey(toKey).getTime();
  return Math.round((to - from) / 86_400_000);
}

export function isToday(key: string): boolean {
  return key === getTodayLocalDate();
}

export function isFutureDate(key: string): boolean {
  return fromDateKey(key).getTime() > fromDateKey(getTodayLocalDate()).getTime();
}

export function minDateKey(a: string, b: string): string {
  return a <= b ? a : b;
}

export function maxDateKey(a: string, b: string): string {
  return a >= b ? a : b;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
] as const;

export const MONTH_LABELS = MONTH_NAMES;
export const DAY_LABELS = DAY_NAMES;

export function getMonthName(monthIndex: number): string {
  return MONTH_NAMES[monthIndex];
}

export function getMonthIndexFromKey(key: string): number {
  return fromDateKey(key).getMonth();
}

export function getYearFromKey(key: string): number {
  return fromDateKey(key).getFullYear();
}

/** `2026-09` identifier for a month. */
export function getMonthKey(key: string): string {
  return key.slice(0, 7);
}

export function formatMonthYear(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export function formatLongDate(key: string): string {
  const date = fromDateKey(key);
  return `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
}

export function formatFullDate(key: string): string {
  const date = fromDateKey(key);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatDayMonth(key: string): string {
  const date = fromDateKey(key);
  return `${date.getDate()} ${MONTH_NAMES[date.getMonth()].slice(0, 3)}`;
}

export function formatWeekdayShort(key: string): string {
  return DAY_NAMES[fromDateKey(key).getDay()].slice(0, 3);
}

export function formatRelativeDay(key: string): string {
  const today = getTodayLocalDate();
  if (key === today) return 'Today';
  if (key === addDays(today, -1)) return 'Yesterday';
  if (key === addDays(today, 1)) return 'Tomorrow';
  return formatDayMonth(key);
}

/** Inclusive list of date keys spanning a month. */
export function getMonthRange(monthKey: string): string[] {
  const [year, month] = monthKey.split('-').map(Number);
  const total = getDaysInMonth(year, month - 1);
  const days: string[] = [];
  for (let day = 1; day <= total; day += 1) {
    days.push(`${monthKey}-${`${day}`.padStart(2, '0')}`);
  }
  return days;
}

export function getMonthBounds(monthKey: string): { start: string; end: string } {
  const days = getMonthRange(monthKey);
  return { start: days[0], end: days[days.length - 1] };
}

/** Inclusive list of the last `count` days ending at `endKey`. */
export function getRecentRange(endKey: string, count: number): string[] {
  const days: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    days.push(addDays(endKey, -offset));
  }
  return days;
}

export function getGreeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function isValidDateKey(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > getDaysInMonth(year, month - 1)) return false;
  return year >= 1900 && year <= 2200;
}

export function isValidTimestamp(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const time = Date.parse(value);
  return Number.isFinite(time);
}
