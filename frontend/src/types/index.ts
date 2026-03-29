export type TransactionType = "purchase" | "earning" | "transfer";

// Payment schedule types
export type PaymentScheduleMode = "none" | "installment" | "recurring";

export interface InstallmentSchedule {
  mode: "installment";
  months: number; // number of installments (>= 2)
}

export type RecurrenceUnit = "day" | "week" | "month";

export interface RecurringSchedule {
  mode: "recurring";
  every: number; // interval count (>= 1)
  unit: RecurrenceUnit; // "week" or "month"
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
  recurrence_unit?: RecurrenceUnit;
  recurrence_group_id?: string;
  // Credit card fields
  paid?: boolean | null;
  credit_card_bill_month?: string | null;
  // Virtual transaction flag
  is_virtual?: boolean | null;
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
  converted_amount?: number;
  transfer_rate?: number;
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
  is_main: boolean;
  image_url: string;
  gradient_start: string; // hex color
  gradient_end: string; // hex color
  created_at: string;
  last_updated: string;
  type: "checking" | "credit_card";
  credit_limit?: number | null;
}

export interface CreateAccountRequest {
  name: string;
  initialBalance?: number;
  currency?: string;
  imageURL?: string;
  gradientStart?: string;
  gradientEnd?: string;
  type?: "checking" | "credit_card";
  creditLimit?: number | null;
}

export interface UpdateAccountRequest {
  name?: string;
  currency?: string;
  initialBalance?: number;
  archived?: boolean;
  imageURL?: string;
  gradientStart?: string;
  gradientEnd?: string;
  type?: "checking" | "credit_card";
  creditLimit?: number | null;
}

export interface CreditCardBillSummary {
  month: string; // "YYYY-MM"
  total_amount: number;
  paid_amount: number;
  unpaid_amount: number;
  is_fully_paid: boolean;
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
      converted_amount?: string; // string because AmountField uses string values
      description?: string;
      date: string;
      paymentSchedule: PaymentSchedule;
    };

export interface ApiError {
  error: string;
}

export interface ExchangeRate {
  date: string;
  base: string;
  rates: Record<string, number>;
}

export interface Category {
  id: string; // UUID primary key
  name: string;
  type: "income" | "expense";
  parent_id: string | null; // stored parent reference
  parent_name: string | null; // computed display field from backend
  gradient_start: string;
  gradient_end: string;
  image_url: string;
  created_at: string;
  last_updated: string;
}

export interface CreateCategoryRequest {
  name: string;
  type: "income" | "expense";
  parent_id?: string | null; // UUID of parent category
  gradientStart?: string;
  gradientEnd?: string;
  imageURL?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  type?: "income" | "expense";
  parent_id?: string | null; // send null or "" to clear parent
  gradientStart?: string;
  gradientEnd?: string;
  imageURL?: string;
}
