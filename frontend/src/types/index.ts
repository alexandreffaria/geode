export type TransactionType = "purchase" | "earning" | "transfer";

// Payment schedule types
export type PaymentScheduleMode = "none" | "installment" | "recurring";

export interface InstallmentSchedule {
  mode: "installment";
  months: number; // number of installments (>= 2)
}

export interface RecurringSchedule {
  mode: "recurring";
  every_months: number; // repeat every N months (>= 1)
}

export type PaymentSchedule =
  | { mode: "none" }
  | InstallmentSchedule
  | RecurringSchedule;

// Base transaction fields shared by all types
interface BaseTransaction {
  id: string;
  amount: number;
  description?: string;
  date: string;
  // Installment fields
  installment_total?: number;
  installment_current?: number;
  installment_group_id?: string;
  // Recurrence fields
  recurrence_months?: number;
  recurrence_group_id?: string;
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
  name: string; // primary key (no separate id)
  balance: number;
  currency: string; // e.g. "BRL", "USD", "EUR"
  initial_balance: number;
  archived: boolean;
  image_url: string;
  gradient_start: string; // hex color
  gradient_end: string; // hex color
  created_at: string;
  last_updated: string;
}

export interface CreateAccountRequest {
  name: string;
  initialBalance?: number;
  currency?: string;
  imageURL?: string;
  gradientStart?: string;
  gradientEnd?: string;
}

export interface UpdateAccountRequest {
  name?: string;
  currency?: string;
  initialBalance?: number;
  archived?: boolean;
  imageURL?: string;
  gradientStart?: string;
  gradientEnd?: string;
}

// Form data for creating transactions
// Note: date field is in YYYY-MM-DD format (matches backend)
export type TransactionFormData =
  | {
      type: "purchase";
      amount: string;
      account: string;
      category: string;
      description?: string;
      date: string;
      paymentSchedule: PaymentSchedule;
    }
  | {
      type: "earning";
      amount: string;
      account: string;
      category: string;
      description?: string;
      date: string;
      paymentSchedule: PaymentSchedule;
    }
  | {
      type: "transfer";
      amount: string;
      from_account: string;
      to_account: string;
      description?: string;
      date: string;
      paymentSchedule: PaymentSchedule;
    };

export interface ApiError {
  error: string;
}

export interface Category {
  name: string;
  type: "income" | "expense";
  parent_name: string | null;
  gradient_start: string;
  gradient_end: string;
  image_url: string;
  created_at: string;
  last_updated: string;
}

export interface CreateCategoryRequest {
  name: string;
  type: "income" | "expense";
  parentName?: string | null;
  gradientStart?: string;
  gradientEnd?: string;
  imageURL?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  type?: "income" | "expense";
  parent_name?: string; // send "" to clear parent
  gradientStart?: string;
  gradientEnd?: string;
  imageURL?: string;
}
