import { CURRENCY_SYMBOLS } from "../constants";
import { formatDateDisplay } from "./dateUtils";
import type {
  Category,
  Transaction,
  TransactionFormData,
  TransactionType,
} from "../types";

/**
 * Checks if a transaction is pending (unpaid credit card transaction).
 * Returns true only when paid === false (not null, not undefined).
 */
export function isTransactionPending(transaction: Transaction): boolean {
  return transaction.paid === false;
}

/**
 * Returns true if the transaction is virtual (projected/forecast).
 * Virtual transactions do not affect account balances.
 */
export function isTransactionVirtual(transaction: Transaction): boolean {
  return transaction.is_virtual === true;
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
 * Formats a date string (YYYY-MM-DD) for display as DD/MM/YYYY.
 */
export function formatDate(dateStr: string): string {
  return formatDateDisplay(dateStr);
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
 * Resolves a category UUID to a human-readable display name.
 * For subcategories, returns "Parent > Child" using parent_name from the backend.
 * Falls back to the raw ID if the category is not found in the list.
 */
export function resolveCategoryName(
  categoryId: string,
  categories: Category[],
): string {
  if (!categoryId) return "";
  const cat = categories.find((c) => c.id === categoryId);
  if (!cat) return categoryId; // fallback: raw ID if not found
  if (cat.parent_name) {
    return `${cat.parent_name} > ${cat.name}`;
  }
  return cat.name;
}

/**
 * Returns the default empty form data for a new transaction.
 * @param mainAccountName - Optional name of the main account to pre-fill.
 */
export function getDefaultFormData(
  mainAccountName?: string,
): TransactionFormData {
  return {
    type: "purchase",
    amount: "",
    account: mainAccountName ?? "",
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
      ...(transaction.converted_amount != null &&
      transaction.converted_amount > 0
        ? { converted_amount: String(transaction.converted_amount) }
        : {}),
    } as unknown as TransactionFormData;
  }

  return {
    ...base,
    account: transaction.account,
    category: transaction.category ?? "",
  } as unknown as TransactionFormData;
}

/**
 * Represents a unique past-transaction suggestion for the description autocomplete.
 */
export interface DescriptionSuggestion {
  description: string;
  account: string;
  category: string;
  transactionType: TransactionType;
}

/**
 * Derives a deduplicated list of description suggestions from past transactions.
 * Transactions are expected to be in reverse-chronological order (most-recent first),
 * so the first occurrence of each description key is kept.
 */
export function getDescriptionSuggestions(
  transactions: Transaction[],
): DescriptionSuggestion[] {
  const seen = new Map<string, DescriptionSuggestion>();
  for (const tx of transactions) {
    if (tx.is_virtual === true) continue; // skip virtual/projected transactions
    if (!tx.description?.trim()) continue;
    const key = tx.description.trim().toLowerCase();
    if (seen.has(key)) continue; // keep most-recent (first in reversed array)
    const account = tx.type === "transfer" ? tx.from_account : tx.account;
    const category = tx.type === "transfer" ? "" : (tx.category ?? "");
    seen.set(key, {
      description: tx.description.trim(),
      account,
      category,
      transactionType: tx.type,
    });
  }
  return Array.from(seen.values());
}
