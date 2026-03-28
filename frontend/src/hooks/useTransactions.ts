import { useCallback } from "react";
import type { Transaction } from "../types";
import { apiService } from "../services/api";
import { useResource } from "./useResource";

export function useTransactions() {
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

  return { transactions, loading, error, refetch };
}
