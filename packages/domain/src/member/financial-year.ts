/**
 * Indian financial year: 1 April to 31 March. Pure string math — no Date
 * parsing ambiguity, since contribution months are already "YYYY-MM".
 */

/** "2026-07" -> "2026-27". "2026-01" -> "2025-26" (Jan belongs to the FY that started the previous April). */
export function financialYearForMonth(month: string): string {
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr);
  const fyStartYear = monthNum >= 4 ? year : year - 1;
  return `${fyStartYear}-${String((fyStartYear + 1) % 100).padStart(2, "0")}`;
}

/** Financial years present in a set of months, most recent first. */
export function distinctFinancialYears(months: string[]): string[] {
  const set = new Set(months.map(financialYearForMonth));
  return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
}
