import type {
  Transaction,
  Account,
  TransactionFormData,
  ApiError,
} from "../types";

const API_BASE_URL = "/api";

class ApiService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: `HTTP error! status: ${response.status}`,
      }));
      throw new Error(error.error);
    }
    return response.json();
  }

  async getTransactions(): Promise<Transaction[]> {
    const response = await fetch(`${API_BASE_URL}/transactions`);
    return this.handleResponse<Transaction[]>(response);
  }

  async addTransaction(data: TransactionFormData): Promise<Transaction> {
    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: data.type,
        amount: parseFloat(data.amount),
        from_account: data.from_account,
        to_account: data.to_account,
        description: data.description,
      }),
    });
    return this.handleResponse<Transaction>(response);
  }

  async getAccounts(): Promise<Account[]> {
    const response = await fetch(`${API_BASE_URL}/accounts`);
    return this.handleResponse<Account[]>(response);
  }
}

export const apiService = new ApiService();
