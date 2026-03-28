import { useState, useCallback, useEffect } from "react";

export interface UseResourceResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Generic hook for fetching a resource from an async function.
 * Handles loading, error, and refetch state.
 *
 * @param fetchFn - Async function that returns the data
 * @param initialData - Initial value before first fetch (e.g. [] for arrays)
 */
export function useResource<T>(
  fetchFn: () => Promise<T>,
  initialData: T,
): UseResourceResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
