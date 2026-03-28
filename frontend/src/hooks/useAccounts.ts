import { useCallback } from "react";
import type {
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
} from "../types";
import { apiService } from "../services/api";
import { useResource } from "./useResource";

export function useAccounts() {
  const fetchAccounts = useCallback(async (): Promise<Account[]> => {
    return apiService.getAccounts();
  }, []);

  const {
    data: accounts,
    loading,
    error,
    refetch,
  } = useResource<Account[]>(fetchAccounts, []);

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
