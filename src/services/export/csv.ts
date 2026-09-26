import { generateCsv, withBom, type CsvColumn } from '@/utils/csv';
import { downloadTextFile } from '@/utils/download';
import { sanitizeFilenamePart } from '@/utils/validation/validation';
import { formatMonthYear, getMonthKey } from '@/utils/dates/dates';
import { buildMonthlyRows, type MonthlyCsvRow } from '@/services/analytics/monthly';

const COLUMNS: CsvColumn<MonthlyCsvRow>[] = [
  { header: 'Date', value: (row) => row.date },
  { header: 'Meal', value: (row) => row.meal },
  { header: 'Food', value: (row) => row.food },
  { header: 'Quantity (g)', value: (row) => row.quantityGrams },
  { header: 'Calories', value: (row) => row.calories },
  { header: 'Protein (g)', value: (row) => row.protein },
  { header: 'Carbs (g)', value: (row) => row.carbs },
  { header: 'Fat (g)', value: (row) => row.fat },
  { header: 'Fiber (g)', value: (row) => row.fiber },
  { header: 'Weight (kg)', value: (row) => row.weightKg },
];

export function buildMonthlyCsvFilename(name: string, monthKey: string): string {
  const year = monthKey.slice(0, 4);
  const monthName = formatMonthYear(`${monthKey}-01`).split(' ')[0];
  return `${sanitizeFilenamePart(name)}-fitness-data-${monthName}-${year}.csv`;
}

export interface CsvExportResult {
  filename: string;
  rowCount: number;
}

export async function exportMonthlyCsv(
  name: string,
  monthKeyInput: string,
): Promise<CsvExportResult> {
  const monthKey = monthKeyInput.length === 7 ? monthKeyInput : getMonthKey(monthKeyInput);
  const rows = await buildMonthlyRows(monthKey);
  const filename = buildMonthlyCsvFilename(name, monthKey);
  const csv = withBom(generateCsv(COLUMNS, rows));
  downloadTextFile(filename, csv, 'text/csv');
  return { filename, rowCount: rows.length };
}
