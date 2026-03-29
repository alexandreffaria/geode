// Default gradient colors for account/category avatars
// Currently duplicated in: AccountList.tsx, AccountManagementModal.tsx, AccountSelect.tsx, CategoryManagementModal.tsx, CategorySelect.tsx
export const DEFAULT_GRADIENT_START = "#4a9eff";
export const DEFAULT_GRADIENT_END = "#6bff6b";

// Account type constants
export const ACCOUNT_TYPES = {
  CHECKING: "checking",
  CREDIT_CARD: "credit_card",
} as const;

// Supported currencies
// Currently duplicated/hardcoded in: AccountManagementModal.tsx, backend validation
export const CURRENCIES = ["BRL", "USD", "EUR", "GBP", "JPY"] as const;
export type Currency = (typeof CURRENCIES)[number];

// Currency symbol lookup
export const CURRENCY_SYMBOLS: Record<string, string> = {
  BRL: "R$",
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
};

// Payment schedule mode labels
// Currently in PaymentScheduleSelector.tsx only, but should be shared
export const PAYMENT_SCHEDULE_MODE_LABELS: Record<string, string> = {
  none: "One-time",
  installment: "Installments",
  recurring: "Recurring",
};

export const RECURRING_PRESETS = [
  { label: "Weekly", every: 1, unit: "week" as const },
  { label: "Monthly", every: 1, unit: "month" as const },
  { label: "Yearly", every: 12, unit: "month" as const },
  { label: "Custom", every: 1, unit: "month" as const },
] as const;
