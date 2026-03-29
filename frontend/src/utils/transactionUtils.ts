import { CURRENCY_SYMBOLS } from "../constants";
import type { Transaction, TransactionFormData } from "../types";

/**
 * Checks if a transaction is pending (unpaid credit card transaction).
 * Returns true only when paid === false (not null, not undefined).
 */
export function isTransactionPending(transaction: Transaction): boolean {
  return transaction.paid === false;
}

/**
 * Formats a bill month string "YYYY-MM" to a readable format like "March 2026".
 */
export function formatBillMonth(month: string): string {
  // month is "YYYY-MM"
  const [year, mon] = month.split("-");
  const date = new Date(parseInt(year), parseInt(mon) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/**
 * Returns the bill month for a transaction.
 * Uses credit_card_bill_month if set, otherwise null.
 */
export function getTransactionBillMonth(
  transaction: Transaction,
): string | null {
  return transaction.credit_card_bill_month ?? null;
}

/**
 * Formats a date string (YYYY-MM-DD) for display.
 * Uses T12:00:00 to avoid UTC midnight off-by-one in local timezones.
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats an amount with sign and dollar sign (legacy default).
 * For currency-aware formatting, use formatCurrency().
 */
export function formatAmount(amount: number, isPositive: boolean): string {
  const sign = isPositive ? "+" : "-";
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}

/**
 * Formats an amount with the correct currency symbol.
 */
export function formatCurrency(
  amount: number,
  currency: string,
  showSign = false,
): string {
  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;
  const abs = Math.abs(amount).toFixed(2);
  const sign = showSign ? (amount >= 0 ? "+" : "-") : "";
  return `${sign}${symbol}${abs}`;
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Returns a display label for a transaction type.
 * @deprecated Use capitalize() directly.
 */
export function getTransactionTypeLabel(type: string): string {
  return capitalize(type);
}

/**
 * Returns the default empty form data for a new transaction.
 */
export function getDefaultFormData(): TransactionFormData {
  return {
    type: "purchase",
    amount: "",
    account: "",
    category: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    paymentSchedule: { mode: "none" },
  } as unknown as TransactionFormData;
}

/**
 * Converts a Transaction (from API) into TransactionFormData for editing.
 */
export function transactionToFormData(
  transaction: Transaction,
): TransactionFormData {
  const base = {
    type: transaction.type,
    amount: String(transaction.amount),
    description: transaction.description,
    date: transaction.date,
    paymentSchedule: transaction.recurrence_months
      ? {
          mode: "recurring" as const,
          every: transaction.recurrence_months,
          unit: transaction.recurrence_unit ?? ("month" as const),
        }
      : { mode: "none" as const },
  };

  if (transaction.type === "transfer") {
    return {
      ...base,
      from_account: transaction.from_account,
      to_account: transaction.to_account,
    } as unknown as TransactionFormData;
  }

  return {
    ...base,
    account: transaction.account,
    category: transaction.category ?? "",
  } as unknown as TransactionFormData;
}
