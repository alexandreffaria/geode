import { useState, useCallback, useEffect, useRef } from "react";

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
 * @param fetchFn - Must be a stable reference (wrap in useCallback).
 *   An unstable fetchFn will cause an infinite refetch loop.
 * @param initialData - Initial value before first fetch (e.g. [] for arrays)
 */
export function useResource<T>(
  fetchFn: () => Promise<T>,
  initialData: T,
): UseResourceResult<T> {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Track whether the initial fetch has completed so subsequent refetches
  // don't set loading=true (which would unmount the whole page via App's
  // early-return guard and lose UI state).
  const initializedRef = useRef(false);

  const refetch = useCallback(async () => {
    setError(null);
    // Only show the full-page loading spinner on the very first fetch.
    // Subsequent refetches update data silently so the UI stays mounted.
    if (!initializedRef.current) {
      setLoading(true);
    }
    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      initializedRef.current = true;
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}
