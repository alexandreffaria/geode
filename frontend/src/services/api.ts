import type {
  Transaction,
  Account,
  TransactionFormData,
  ApiError,
  CreateAccountRequest,
  UpdateAccountRequest,
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "../types";

const API_BASE_URL = "/api";

/**
 * Helper function to build transaction payload from form data
 * Eliminates duplication between createTransaction and updateTransaction
 */
function buildTransactionPayload(
  data: TransactionFormData,
): Record<string, string | number | undefined> {
  const payload: Record<string, string | number | undefined> = {
    type: data.type,
    amount: parseFloat(data.amount),
    description: data.description || undefined,
    date: data.date, // Send date as YYYY-MM-DD format
  };

  // Add payment schedule fields
  if (data.paymentSchedule.mode === "installment") {
    payload.installment_total = data.paymentSchedule.months;
  } else if (data.paymentSchedule.mode === "recurring") {
    payload.recurrence_months = data.paymentSchedule.every_months;
  }

  // Add type-specific fields
  if (data.type === "transfer") {
    payload.from_account = data.from_account;
    payload.to_account = data.to_account;
  } else {
    // purchase or earning
    payload.account = data.account;
    payload.category = data.category;
  }

  return payload;
}

class ApiService {
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: `HTTP error! status: ${response.status}`,
      }));
      throw new Error(error.error);
    }
    return response.json() as Promise<T>;
  }

  private async handleVoidResponse(response: Response): Promise<void> {
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: `HTTP error! status: ${response.status}`,
      }));
      throw new Error(error.error);
    }
  }

  async getTransactions(): Promise<Transaction[]> {
    const response = await fetch(`${API_BASE_URL}/transactions`);
    return this.handleResponse<Transaction[]>(response);
  }

  async addTransaction(
    data: TransactionFormData,
  ): Promise<Transaction | Transaction[]> {
    const payload = buildTransactionPayload(data);

    const response = await fetch(`${API_BASE_URL}/transactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return this.handleResponse<Transaction | Transaction[]>(response);
  }

  async updateTransaction(
    id: string,
    data: TransactionFormData,
  ): Promise<Transaction> {
    const payload = buildTransactionPayload(data);

    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return this.handleResponse<Transaction>(response);
  }

  async deleteTransaction(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/transactions/${id}`, {
      method: "DELETE",
    });
    return this.handleVoidResponse(response);
  }

  async getAccounts(): Promise<Account[]> {
    const response = await fetch(`${API_BASE_URL}/accounts`);
    return this.handleResponse<Account[]>(response);
  }

  async createAccount(data: CreateAccountRequest): Promise<Account> {
    const response = await fetch(`${API_BASE_URL}/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse<Account>(response);
  }

  async updateAccount(
    name: string,
    data: UpdateAccountRequest,
  ): Promise<Account> {
    const response = await fetch(
      `${API_BASE_URL}/accounts/${encodeURIComponent(name)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );
    return this.handleResponse<Account>(response);
  }

  async deleteAccount(name: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/accounts/${encodeURIComponent(name)}`,
      {
        method: "DELETE",
      },
    );
    return this.handleVoidResponse(response);
  }

  async getCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE_URL}/categories`);
    return this.handleResponse<Category[]>(response);
  }

  async createCategory(data: CreateCategoryRequest): Promise<Category> {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return this.handleResponse<Category>(response);
  }

  async updateCategory(
    name: string,
    data: UpdateCategoryRequest,
  ): Promise<Category> {
    const response = await fetch(
      `${API_BASE_URL}/categories/${encodeURIComponent(name)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );
    return this.handleResponse<Category>(response);
  }

  async deleteCategory(name: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/categories/${encodeURIComponent(name)}`,
      {
        method: "DELETE",
      },
    );
    return this.handleVoidResponse(response);
  }
}

export const apiService = new ApiService();
