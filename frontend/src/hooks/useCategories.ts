import { useState, useEffect, useCallback } from "react";
import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "../types";
import { apiService } from "../services/api";

export interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCategory: (data: CreateCategoryRequest) => Promise<void>;
  updateCategory: (name: string, data: UpdateCategoryRequest) => Promise<void>;
  deleteCategory: (name: string) => Promise<void>;
}

/**
 * Custom hook for fetching and managing categories
 * Handles loading states, errors, and provides CRUD operations
 */
export function useCategories(): UseCategoriesResult {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await apiService.getCategories();
      setCategories(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch categories",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createCategory = useCallback(
    async (data: CreateCategoryRequest): Promise<void> => {
      await apiService.createCategory(data);
      await refetch();
    },
    [refetch],
  );

  const updateCategory = useCallback(
    async (name: string, data: UpdateCategoryRequest): Promise<void> => {
      await apiService.updateCategory(name, data);
      await refetch();
    },
    [refetch],
  );

  const deleteCategory = useCallback(
    async (name: string): Promise<void> => {
      await apiService.deleteCategory(name);
      await refetch();
    },
    [refetch],
  );

  return {
    categories,
    loading,
    error,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory,
  };
}
