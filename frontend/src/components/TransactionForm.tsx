import { useState, useEffect, type FormEvent } from "react";
import type {
  TransactionFormData,
  TransactionType,
  Account,
  Transaction,
  PaymentSchedule,
} from "../types";
import { apiService } from "../services/api";
import { DateField } from "./form-fields/DateField";
import { AmountField } from "./form-fields/AmountField";
import { DescriptionField } from "./form-fields/DescriptionField";
import { AccountSelect } from "./form-fields/AccountSelect";
import { PaymentScheduleSelector } from "./form-fields/PaymentScheduleSelector";
import "./TransactionForm.css";

interface TransactionFormProps {
  accounts: Account[];
  mode?: "add" | "edit";
  initialTransaction?: Transaction;
  onSuccess?: () => void;
  onCancel?: () => void;
  // Legacy props for backward compatibility
  onTransactionAdded?: () => void;
}

// Helper function to get default date for date input
const getDefaultDate = (): string => {
  const now = new Date();
  // Format for date: YYYY-MM-DD
  return now.toISOString().slice(0, 10);
};

// Helper function to get date from transaction (already in YYYY-MM-DD format)
const getEditDate = (transaction: Transaction): string => {
  return transaction.date;
};

// Helper function to convert Transaction to TransactionFormData
const transactionToFormData = (
  transaction: Transaction,
): TransactionFormData => {
  const base = {
    amount: transaction.amount.toString(),
    description: transaction.description || "",
    date: getEditDate(transaction),
    paymentSchedule: { mode: "none" } as PaymentSchedule,
  };

  if (transaction.type === "transfer") {
    return {
      type: "transfer",
      ...base,
      from_account: transaction.from_account,
      to_account: transaction.to_account,
    };
  } else {
    return {
      type: transaction.type,
      ...base,
      account: transaction.account,
      category: transaction.category,
    };
  }
};

// Helper function to initialize form data
const initializeFormData = (
  mode: "add" | "edit" | undefined,
  initialTransaction?: Transaction,
): TransactionFormData => {
  if (mode === "edit" && initialTransaction) {
    return transactionToFormData(initialTransaction);
  }

  // Default for add mode (or legacy mode)
  return {
    type: "purchase",
    amount: "",
    account: "",
    category: "",
    description: "",
    date: getDefaultDate(),
    paymentSchedule: { mode: "none" },
  };
};

export function TransactionForm({
  accounts,
  mode = "add",
  initialTransaction,
  onSuccess,
  onCancel,
  onTransactionAdded,
}: TransactionFormProps) {
  const [formData, setFormData] = useState<TransactionFormData>(() =>
    initializeFormData(mode, initialTransaction),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Update form data when initialTransaction changes (for edit mode)
  useEffect(() => {
    if (mode === "edit" && initialTransaction) {
      setFormData(transactionToFormData(initialTransaction));
    }
  }, [mode, initialTransaction]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      if (mode === "add") {
        await apiService.addTransaction(formData);
      } else if (mode === "edit" && initialTransaction) {
        await apiService.updateTransaction(initialTransaction.id, formData);
      }

      // Call the appropriate success callback
      if (onSuccess) {
        onSuccess();
      } else if (onTransactionAdded) {
        // Legacy support: show success message and reset form
        setSuccess(true);
        setFormData(initializeFormData("add", undefined));
        onTransactionAdded();
        setTimeout(() => setSuccess(false), 3000);
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
          <AccountSelect
            id="from_account"
            label="From Account"
            value={formData.from_account}
            onChange={(from_account) =>
              setFormData({ ...formData, from_account })
            }
            accounts={accounts}
            disabled={loading}
          />

          <AccountSelect
            id="to_account"
            label="To Account"
            value={formData.to_account}
            onChange={(to_account) => setFormData({ ...formData, to_account })}
            accounts={accounts}
            disabled={loading}
          />
        </>
      ) : (
        <>
          <AccountSelect
            id="account"
            label={formData.type === "purchase" ? "From Account" : "To Account"}
            value={formData.account}
            onChange={(account) => setFormData({ ...formData, account })}
            accounts={accounts}
            disabled={loading}
          />

          <div className="form-group">
            <label htmlFor="category">Category</label>
            <input
              id="category"
              type="text"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value })
              }
              placeholder={
                formData.type === "purchase"
                  ? "e.g., Groceries, Coffee, Rent"
                  : "e.g., Salary, Freelance, Gift"
              }
              disabled={loading}
              required
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
      {success && (
        <div className="success-message">Transaction added successfully!</div>
      )}

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
