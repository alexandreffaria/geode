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
    let payload: any = {
      type: data.type,
      amount: parseFloat(data.amount),
      description: data.description,
    };

    // Add type-specific fields
    if (data.type === "transfer") {
      payload.from_account = data.from_account;
      payload.to_account = data.to_account;
    } else {
      // purchase or earning
      payload.account = data.account;
      payload.category = data.category;
    }

    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return this.handleResponse<Transaction>(response);
  }

  async getAccounts(): Promise<Account[]> {
    const response = await fetch(`${API_BASE_URL}/accounts`);
    return this.handleResponse<Account[]>(response);
  }
}

export const apiService = new ApiService();
