/** RFC 4180 escaping, plus a guard against spreadsheet formula injection. */
export function escapeCsvValue(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const raw = String(value);

  const guarded =
    /^[=+\-@\t\r]/.test(raw) && /^[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?$/.test(raw) === false
      ? `'${raw}`
      : raw;

  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | null | undefined;
}

export function generateCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const header = columns.map((column) => escapeCsvValue(column.header)).join(',');
  const body = rows.map((row) => columns.map((column) => escapeCsvValue(column.value(row))).join(','));
  return [header, ...body].join('\r\n');
}

/** UTF-8 with a BOM so Excel opens the file with the correct characters. */
export function withBom(csv: string): string {
  return `\uFEFF${csv}`;
}
