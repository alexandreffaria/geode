import { useState, useEffect, type FormEvent } from "react";
import type {
  TransactionFormData,
  TransactionType,
  Account,
  Category,
  Transaction,
  PaymentSchedule,
} from "../types";
import { apiService } from "../services/api";
import {
  getDefaultFormData,
  transactionToFormData,
} from "../utils/transactionUtils";
import { DateField } from "./form-fields/DateField";
import { AmountField } from "./form-fields/AmountField";
import { DescriptionField } from "./form-fields/DescriptionField";
import { AccountSelect } from "./form-fields/AccountSelect";
import { CategorySelect } from "./form-fields/CategorySelect";
import { PaymentScheduleSelector } from "./form-fields/PaymentScheduleSelector";
import "./TransactionForm.css";

interface TransactionFormProps {
  accounts: Account[];
  categories: Category[];
  mode?: "add" | "edit";
  initialTransaction?: Transaction;
  onSuccess?: () => void;
  onCancel?: () => void;
}

// Helper function to initialize form data
const initializeFormData = (
  mode: "add" | "edit" | undefined,
  initialTransaction?: Transaction,
): TransactionFormData => {
  if (mode === "edit" && initialTransaction) {
    return transactionToFormData(initialTransaction);
  }
  return getDefaultFormData();
};

export function TransactionForm({
  accounts,
  categories,
  mode = "add",
  initialTransaction,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const [formData, setFormData] = useState<TransactionFormData>(() =>
    initializeFormData(mode, initialTransaction),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update form data when initialTransaction changes (for edit mode)
  useEffect(() => {
    if (mode === "edit" && initialTransaction) {
      setFormData(transactionToFormData(initialTransaction));
    }
  }, [mode, initialTransaction]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "add") {
        await apiService.addTransaction(formData);
      } else if (mode === "edit" && initialTransaction) {
        await apiService.updateTransaction(initialTransaction.id, formData);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : `Failed to ${mode} transaction`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTypeChange = (type: TransactionType) => {
    const { amount, description, date, paymentSchedule } = formData;
    // Reset form data when type changes (only in add mode)
    if (type === "transfer") {
      setFormData({
        type: "transfer",
        amount,
        from_account: "",
        to_account: "",
        description,
        date,
        paymentSchedule,
      });
    } else {
      setFormData({
        type: type,
        amount,
        account: "",
        category: "",
        description,
        date,
        paymentSchedule,
      });
    }
  };

  const handleScheduleChange = (schedule: PaymentSchedule) => {
    setFormData((prev) => ({ ...prev, paymentSchedule: schedule }));
  };

  const submitButtonText =
    mode === "add"
      ? loading
        ? "Adding..."
        : "Add Transaction"
      : loading
        ? "Saving..."
        : "Update Transaction";

  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      <div className="form-group">
        <label htmlFor="type">Type</label>
        <select
          id="type"
          value={formData.type}
          onChange={(e) => handleTypeChange(e.target.value as TransactionType)}
          disabled={mode === "edit"}
          required
        >
          <option value="purchase">Purchase</option>
          <option value="earning">Earning</option>
          <option value="transfer">Transfer</option>
        </select>
      </div>

      <DateField
        value={formData.date}
        onChange={(date) => setFormData({ ...formData, date })}
        disabled={loading}
      />

      <AmountField
        value={formData.amount}
        onChange={(amount) => setFormData({ ...formData, amount })}
        disabled={loading}
      />

      {formData.type === "transfer" ? (
        <>
          <div className="form-group">
            <label>From Account</label>
            <AccountSelect
              value={formData.from_account}
              onChange={(from_account) =>
                setFormData({ ...formData, from_account })
              }
              accounts={accounts}
              placeholder="From account…"
              excludeAccount={formData.to_account}
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>To Account</label>
            <AccountSelect
              value={formData.to_account}
              onChange={(to_account) =>
                setFormData({ ...formData, to_account })
              }
              accounts={accounts}
              placeholder="To account…"
              excludeAccount={formData.from_account}
              disabled={loading}
            />
          </div>
        </>
      ) : (
        <>
          <div className="form-group">
            <label>
              {formData.type === "purchase" ? "From Account" : "To Account"}
            </label>
            <AccountSelect
              value={formData.account}
              onChange={(account) => setFormData({ ...formData, account })}
              accounts={accounts}
              placeholder="Search accounts…"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <CategorySelect
              value={formData.category}
              onChange={(val) => setFormData({ ...formData, category: val })}
              categories={categories}
              transactionType={formData.type}
              disabled={loading}
            />
          </div>
        </>
      )}

      <DescriptionField
        value={formData.description || ""}
        onChange={(description) => setFormData({ ...formData, description })}
        disabled={loading}
      />

      {mode === "add" && (
        <PaymentScheduleSelector
          value={formData.paymentSchedule}
          onChange={handleScheduleChange}
          disabled={loading}
        />
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="cancel-button"
            disabled={loading}
          >
            Cancel
          </button>
        )}
        <button type="submit" disabled={loading} className="submit-button">
          {submitButtonText}
        </button>
      </div>
    </form>
  );
}
