import { useCallback } from "react";
import type { Transaction } from "../types";
import { apiService } from "../services/api";
import { useResource } from "./useResource";

export interface UseTransactionsResult {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  realizeTransaction: (id: string) => Promise<void>;
  unrealizeTransaction: (id: string) => Promise<void>;
}

export function useTransactions(): UseTransactionsResult {
  const fetchTransactions = useCallback(async (): Promise<Transaction[]> => {
    const data = await apiService.getTransactions();
    return [...data].reverse();
  }, []);

  const {
    data: transactions,
    loading,
    error,
    refetch,
  } = useResource<Transaction[]>(fetchTransactions, []);

  const realizeTransaction = useCallback(
    async (id: string): Promise<void> => {
      await apiService.realizeTransaction(id);
      await refetch();
    },
    [refetch],
  );

  const unrealizeTransaction = useCallback(
    async (id: string): Promise<void> => {
      await apiService.unrealizeTransaction(id);
      await refetch();
    },
    [refetch],
  );

  return {
    transactions,
    loading,
    error,
    refetch,
    realizeTransaction,
    unrealizeTransaction,
  };
}
