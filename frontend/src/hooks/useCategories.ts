import { useCallback } from "react";
import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "../types";
import { apiService } from "../services/api";
import { useResource } from "./useResource";

export interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createCategory: (data: CreateCategoryRequest) => Promise<void>;
  updateCategory: (id: string, data: UpdateCategoryRequest) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
}

export function useCategories(): UseCategoriesResult {
  const fetchCategories = useCallback(async (): Promise<Category[]> => {
    return apiService.getCategories();
  }, []);

  const {
    data: categories,
    loading,
    error,
    refetch,
  } = useResource<Category[]>(fetchCategories, []);

  const createCategory = useCallback(
    async (data: CreateCategoryRequest): Promise<void> => {
      await apiService.createCategory(data);
      await refetch();
    },
    [refetch],
  );

  const updateCategory = useCallback(
    async (id: string, data: UpdateCategoryRequest): Promise<void> => {
      await apiService.updateCategory(id, data);
      await refetch();
    },
    [refetch],
  );

  const deleteCategory = useCallback(
    async (id: string): Promise<void> => {
      await apiService.deleteCategory(id);
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
