/**
 * Formatting utility functions for displaying data in the UI.
 */

/**
 * Formats a number as currency with the specified currency code.
 *
 * @param {number} amount - The amount to format
 * @param {string} currency - The currency code (default: 'BRL')
 * @returns {string} Formatted currency string (e.g., "R$ 1,234.56")
 */
export function formatCurrency(amount, currency = "BRL") {
  if (currency === "BRL") {
    return `R$ ${amount.toFixed(2)}`;
  }
  return `${amount.toFixed(2)} ${currency}`;
}

/**
 * Formats a date string for display.
 * Currently returns the date as-is, but can be extended for localization.
 *
 * @param {string} dateString - ISO date string (e.g., "2024-03-14")
 * @returns {string} Formatted date string
 */
export function formatDate(dateString) {
  // For now, return as-is. Can be extended for locale-specific formatting
  return dateString;
}
