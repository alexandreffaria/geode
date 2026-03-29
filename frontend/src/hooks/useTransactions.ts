import { useState, useCallback, useEffect } from "react";
import type { Transaction } from "../types";
import { apiService } from "../services/api";

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await apiService.getTransactions();
      setTransactions([...data].reverse());
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const realizeTransaction = useCallback(async (id: string): Promise<void> => {
    const realized = await apiService.realizeTransaction(id);
    setTransactions((prev: Transaction[]) =>
      prev.map((t: Transaction) => (t.id === id ? realized : t)),
    );
  }, []);

  const unrealizeTransaction = useCallback(
    async (id: string): Promise<void> => {
      const unrealized = await apiService.unrealizeTransaction(id);
      setTransactions((prev: Transaction[]) =>
        prev.map((t: Transaction) => (t.id === id ? unrealized : t)),
      );
    },
    [],
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
