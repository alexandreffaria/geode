export type TransactionType = "purchase" | "earning" | "transfer";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  from_account: string;
  to_account: string;
  description: string;
  timestamp: string;
}

export interface Account {
  id: string;
  name: string;
  balance: number;
}

export interface TransactionFormData {
  type: TransactionType;
  amount: string;
  from_account: string;
  to_account: string;
  description: string;
}

export interface ApiError {
  error: string;
}
