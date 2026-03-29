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
  CreditCardBillSummary,
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
    payload.recurrence_months = data.paymentSchedule.every;
    payload.recurrence_unit = data.paymentSchedule.unit;
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

  async updateRecurringGroup(
    groupId: string,
    data: TransactionFormData,
  ): Promise<Transaction[]> {
    const payload = buildTransactionPayload(data);

    const response = await fetch(
      `${API_BASE_URL}/transactions/group/${groupId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    return this.handleResponse<Transaction[]>(response);
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

  async setMainAccount(name: string): Promise<Account[]> {
    const response = await fetch(
      `${API_BASE_URL}/accounts/${encodeURIComponent(name)}/main`,
      {
        method: "PUT",
      },
    );
    return this.handleResponse<Account[]>(response);
  }

  async getCategories(): Promise<Category[]> {
    const response = await fetch(`${API_BASE_URL}/categories`);
    return this.handleResponse<Category[]>(response);
  }

  async createCategory(data: CreateCategoryRequest): Promise<Category> {
    // Map frontend field names to backend JSON field names
    const payload: Record<string, unknown> = {
      name: data.name,
      type: data.type,
      parent_id: data.parent_id ?? null,
      gradient_start: data.gradientStart ?? "",
      gradient_end: data.gradientEnd ?? "",
      image_url: data.imageURL ?? "",
    };
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    return this.handleResponse<Category>(response);
  }

  async updateCategory(
    id: string,
    data: UpdateCategoryRequest,
  ): Promise<Category> {
    // Map frontend field names to backend JSON field names
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.type !== undefined) payload.type = data.type;
    if ("parent_id" in data) payload.parent_id = data.parent_id ?? null;
    if (data.gradientStart !== undefined)
      payload.gradient_start = data.gradientStart;
    if (data.gradientEnd !== undefined) payload.gradient_end = data.gradientEnd;
    if (data.imageURL !== undefined) payload.image_url = data.imageURL;

    const response = await fetch(
      `${API_BASE_URL}/categories/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    return this.handleResponse<Category>(response);
  }

  async deleteCategory(id: string): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/categories/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
    );
    return this.handleVoidResponse(response);
  }

  async getCreditCardBills(
    accountName: string,
  ): Promise<CreditCardBillSummary[]> {
    const response = await fetch(
      `${API_BASE_URL}/accounts/${encodeURIComponent(accountName)}/credit-card-bills`,
    );
    return this.handleResponse<CreditCardBillSummary[]>(response);
  }

  async payCreditCardBill(
    accountName: string,
    payload: {
      from_account: string;
      amount: number;
      bill_month: string;
      description?: string;
    },
  ): Promise<Transaction> {
    const response = await fetch(
      `${API_BASE_URL}/accounts/${encodeURIComponent(accountName)}/pay-bill`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    return this.handleResponse<Transaction>(response);
  }
}

export const apiService = new ApiService();
