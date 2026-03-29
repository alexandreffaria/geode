/**
 * Shared date helper utilities used across pages.
 */

/** Formats a Date to "YYYY-MM-DD" */
export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Returns the first day of the given month as "YYYY-MM-DD" */
export function getFirstDayOfMonth(year: number, month: number): string {
  return toDateString(new Date(year, month, 1));
}

/** Returns the last day of the given month as "YYYY-MM-DD" */
export function getLastDayOfMonth(year: number, month: number): string {
  return toDateString(new Date(year, month + 1, 0));
}

/** Returns the first day of the given year as "YYYY-MM-DD" */
export function getFirstDayOfYear(year: number): string {
  return toDateString(new Date(year, 0, 1));
}

/** Returns the last day of the given year as "YYYY-MM-DD" */
export function getLastDayOfYear(year: number): string {
  return toDateString(new Date(year, 11, 31));
}
