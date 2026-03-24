import { useState, FormEvent } from "react";
import type { TransactionFormData, TransactionType, Account } from "../types";
import { apiService } from "../services/api";
import "./TransactionForm.css";

interface TransactionFormProps {
  accounts: Account[];
  onTransactionAdded: () => void;
}

export function TransactionForm({
  accounts,
  onTransactionAdded,
}: TransactionFormProps) {
  const [formData, setFormData] = useState<TransactionFormData>({
    type: "purchase",
    amount: "",
    from_account: "",
    to_account: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      await apiService.addTransaction(formData);
      setSuccess(true);
      setFormData({
        type: "purchase",
        amount: "",
        from_account: "",
        to_account: "",
        description: "",
      });
      onTransactionAdded();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add transaction",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: TransactionType) => {
    setFormData({ ...formData, type });
  };

  return (
    <div className="transaction-form-container">
      <h2>Add Transaction</h2>
      <form onSubmit={handleSubmit} className="transaction-form">
        <div className="form-group">
          <label htmlFor="type">Type</label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) =>
              handleTypeChange(e.target.value as TransactionType)
            }
            required
          >
            <option value="purchase">Purchase</option>
            <option value="earning">Earning</option>
            <option value="transfer">Transfer</option>
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="amount">Amount</label>
          <input
            id="amount"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            placeholder="0.00"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="from_account">From Account</label>
          <select
            id="from_account"
            value={formData.from_account}
            onChange={(e) =>
              setFormData({ ...formData, from_account: e.target.value })
            }
            required
          >
            <option value="">Select account...</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} (${account.balance.toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="to_account">To Account</label>
          <select
            id="to_account"
            value={formData.to_account}
            onChange={(e) =>
              setFormData({ ...formData, to_account: e.target.value })
            }
            required
          >
            <option value="">Select account...</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name} (${account.balance.toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="description">Description</label>
          <input
            id="description"
            type="text"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Transaction description"
            required
          />
        </div>

        {error && <div className="error-message">{error}</div>}
        {success && (
          <div className="success-message">Transaction added successfully!</div>
        )}

        <button type="submit" disabled={loading} className="submit-button">
          {loading ? "Adding..." : "Add Transaction"}
        </button>
      </form>
    </div>
  );
}
