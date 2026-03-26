/**
 * Utility functions for transaction display and formatting
 */

/**
 * Format a date string (YYYY-MM-DD) to a human-readable format
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format an amount as currency with proper sign
 * @param amount - The transaction amount
 * @param type - The transaction type (earning shows +, others show -)
 */
export function formatAmount(amount: number, type: string): string {
  const sign = type === "earning" ? "+" : "-";
  return `${sign}$${amount.toFixed(2)}`;
}

/**
 * Get a display label for a transaction type
 */
export function getTransactionTypeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
