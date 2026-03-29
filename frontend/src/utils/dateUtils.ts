/**
 * Shared date helper utilities used across pages.
 *
 * Conventions:
 *  - Internal / API dates are always "YYYY-MM-DD" (ISO 8601).
 *  - User-facing dates are always "DD/MM/YYYY".
 */

/** Formats a Date to "YYYY-MM-DD" (ISO, for API / internal use). */
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

/**
 * Converts an ISO date string "YYYY-MM-DD" to the user-facing "DD/MM/YYYY" format.
 * Returns the original string unchanged if it doesn't match the expected pattern.
 */
export function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return iso;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/**
 * Converts a user-facing "DD/MM/YYYY" string to the ISO "YYYY-MM-DD" format.
 * Returns the original string unchanged if it doesn't match the expected pattern.
 */
export function displayToIso(display: string): string {
  if (!display) return "";
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return display;
  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

/**
 * Returns true if the given string is a valid "DD/MM/YYYY" date.
 */
export function isValidDisplayDate(display: string): boolean {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(display)) return false;
  const iso = displayToIso(display);
  const d = new Date(iso + "T12:00:00");
  return !isNaN(d.getTime());
}

/**
 * Formats an ISO date string "YYYY-MM-DD" as "DD/MM/YYYY" for display.
 * Uses T12:00:00 to avoid UTC midnight off-by-one in local timezones.
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr) return "";
  return isoToDisplay(dateStr);
}
