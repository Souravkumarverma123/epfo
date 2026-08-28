/**
 * Service duration math (used for the pension/EPS eligibility summary on the
 * dashboard). Pure — the caller supplies "now" so this stays testable and
 * deterministic (PRD §10 amendment: no Date.now() inside domain code).
 */

export interface EmploymentPeriod {
  joinedOn: string; // ISO date
  exitedOn: string | null; // null = ongoing
}

/** Total months across every employment period, ongoing ones counted to `now`. */
export function totalServiceMonths(periods: EmploymentPeriod[], now: Date): number {
  return periods.reduce((total, p) => {
    const start = new Date(p.joinedOn);
    const end = p.exitedOn ? new Date(p.exitedOn) : now;
    const months =
      (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    return total + Math.max(0, months);
  }, 0);
}

export interface ServiceDuration {
  years: number;
  months: number;
}

export function toYearsAndMonths(totalMonths: number): ServiceDuration {
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 };
}
