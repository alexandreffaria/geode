import { useCallback } from "react";
import { useResource } from "./useResource";
import { apiService } from "../services/api";
import type { ExchangeRate } from "../types";

export function useExchangeRates() {
  const fetchRates = useCallback(() => apiService.getLatestExchangeRates(), []);
  return useResource<ExchangeRate | null>(fetchRates, null);
}
