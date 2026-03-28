import { useState, useEffect, useCallback } from "react";
import type {
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
} from "../types";
import { apiService } from "../services/api";

interface UseAccountsResult {
  accounts: Account[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createAccount: (data: CreateAccountRequest) => Promise<void>;
  updateAccount: (name: string, data: UpdateAccountRequest) => Promise<void>;
  deleteAccount: (name: string) => Promise<void>;
}

/**
 * Custom hook for fetching and managing accounts
 * Handles loading states, errors, and provides CRUD operations
 */
export function useAccounts(): UseAccountsResult {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await apiService.getAccounts();
      setAccounts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createAccount = useCallback(
    async (data: CreateAccountRequest): Promise<void> => {
      await apiService.createAccount(data);
      await refetch();
    },
    [refetch],
  );

  const updateAccount = useCallback(
    async (name: string, data: UpdateAccountRequest): Promise<void> => {
      await apiService.updateAccount(name, data);
      await refetch();
    },
    [refetch],
  );

  const deleteAccount = useCallback(
    async (name: string): Promise<void> => {
      await apiService.deleteAccount(name);
      await refetch();
    },
    [refetch],
  );

  return {
    accounts,
    loading,
    error,
    refetch,
    createAccount,
    updateAccount,
    deleteAccount,
  };
}
