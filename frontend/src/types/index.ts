export type TransactionType = "purchase" | "earning" | "transfer";

// Base transaction fields shared by all types
interface BaseTransaction {
  id: string;
  amount: number;
  description: string;
  timestamp: string;
}

// Purchase: money leaves account, goes to category
export interface PurchaseTransaction extends BaseTransaction {
  type: "purchase";
  account: string; // The account money leaves from
  category: string; // Expense category (no balance tracking)
}

// Earning: money enters account, comes from category
export interface EarningTransaction extends BaseTransaction {
  type: "earning";
  account: string; // The account money enters
  category: string; // Income category (no balance tracking)
}

// Transfer: money moves between accounts
export interface TransferTransaction extends BaseTransaction {
  type: "transfer";
  from_account: string;
  to_account: string;
  // No category field
}

// Discriminated union based on type field
export type Transaction =
  | PurchaseTransaction
  | EarningTransaction
  | TransferTransaction;

export interface Account {
  id: string;
  name: string;
  balance: number;
}

// Form data for creating transactions
export type TransactionFormData =
  | {
      type: "purchase";
      amount: string;
      account: string;
      category: string;
      description: string;
    }
  | {
      type: "earning";
      amount: string;
      account: string;
      category: string;
      description: string;
    }
  | {
      type: "transfer";
      amount: string;
      from_account: string;
      to_account: string;
      description: string;
    };

export interface ApiError {
  error: string;
}
