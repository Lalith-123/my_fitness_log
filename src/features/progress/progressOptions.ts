export interface RangeOption {
  value: string;
  label: string;
}

/** Selectable trend windows. All are trailing windows ending today. */
export const RANGE_OPTIONS: RangeOption[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: '180', label: '6 months' },
  { value: '365', label: 'Year' },
];
