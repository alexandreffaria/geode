import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  type FormEvent,
} from "react";
import type {
  TransactionFormData,
  TransactionType,
  Account,
  Category,
  Transaction,
  PaymentSchedule,
} from "../types";
import { CURRENCY_SYMBOLS } from "../constants";
import { apiService } from "../services/api";
import {
  getDefaultFormData,
  transactionToFormData,
  getDescriptionSuggestions,
  type DescriptionSuggestion,
} from "../utils/transactionUtils";
import { DateField } from "./form-fields/DateField";
import { AmountField } from "./form-fields/AmountField";
import {
  DescriptionAutocomplete,
  type DescriptionAutocompleteHandle,
} from "./form-fields/DescriptionAutocomplete";
import { AccountSelect } from "./form-fields/AccountSelect";
import { CategorySelect } from "./form-fields/CategorySelect";
import { PaymentScheduleSelector } from "./form-fields/PaymentScheduleSelector";
import "./TransactionForm.css";

interface TransactionFormProps {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  mode?: "add" | "edit";
  initialTransaction?: Transaction;
  mainAccountName?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
  onRecurringEditChoice?: (formData: TransactionFormData) => void;
}

// Type button config
const TYPE_BUTTONS: {
  type: TransactionType;
  label: string;
  icon: string;
  modifier: string;
}[] = [
  { type: "purchase", label: "Expense", icon: "↓", modifier: "expense" },
  { type: "earning", label: "Income", icon: "↑", modifier: "income" },
  { type: "transfer", label: "Transfer", icon: "⇄", modifier: "transfer" },
];

// Helper function to initialize form data
const initializeFormData = (
  mode: "add" | "edit" | undefined,
  initialTransaction?: Transaction,
  mainAccountName?: string,
): TransactionFormData => {
  if (mode === "edit" && initialTransaction) {
    return transactionToFormData(initialTransaction);
  }
  return getDefaultFormData(mainAccountName);
};

export function TransactionForm({
  accounts,
  categories,
  transactions,
  mode = "add",
  initialTransaction,
  mainAccountName,
  onSuccess,
  onCancel,
  onRecurringEditChoice,
}: TransactionFormProps) {
  const [formData, setFormData] = useState<TransactionFormData>(() =>
    initializeFormData(mode, initialTransaction, mainAccountName),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createAndStartNew, setCreateAndStartNew] = useState(false);
  // Signals that the description field should be focused after the next render
  const [shouldFocusDescription, setShouldFocusDescription] = useState(false);

  // Track currencies of the selected from/to accounts
  const [fromCurrency, setFromCurrency] = useState<string>("");
  const [toCurrency, setToCurrency] = useState<string>("");

  // Ref for the amount input — used to shift focus after a description suggestion is selected
  const amountInputRef = useRef<HTMLInputElement | null>(null);
  // Ref for the description autocomplete — used to focus it after form reset
  const descriptionRef = useRef<DescriptionAutocompleteHandle | null>(null);

  // Derive deduplicated description suggestions from past transactions (memoized)
  const descriptionSuggestions = useMemo(
    () => getDescriptionSuggestions(transactions),
    [transactions],
  );

  // Cross-currency: true only when both accounts are selected and have different currencies
  const isCrossCurrency =
    fromCurrency !== "" && toCurrency !== "" && fromCurrency !== toCurrency;

  // When isCrossCurrency becomes false, clear converted_amount from form data
  useEffect(() => {
    if (
      !isCrossCurrency &&
      formData.type === "transfer" &&
      formData.converted_amount
    ) {
      setFormData((prev) => {
        if (prev.type !== "transfer") return prev;
        const next = { ...prev };
        delete (next as Partial<typeof next>).converted_amount;
        return next as TransactionFormData;
      });
    }
  }, [isCrossCurrency]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update form data when initialTransaction changes (for edit mode)
  useEffect(() => {
    if (mode === "edit" && initialTransaction) {
      setFormData(transactionToFormData(initialTransaction));
    }
  }, [mode, initialTransaction]);

  // In edit mode, initialize fromCurrency and toCurrency from the accounts list
  useEffect(() => {
    if (
      mode === "edit" &&
      initialTransaction &&
      initialTransaction.type === "transfer" &&
      accounts.length > 0
    ) {
      const fromAcc = accounts.find(
        (a) => a.name === initialTransaction.from_account,
      );
      const toAcc = accounts.find(
        (a) => a.name === initialTransaction.to_account,
      );
      setFromCurrency(fromAcc?.currency ?? "");
      setToCurrency(toAcc?.currency ?? "");
    }
  }, [mode, initialTransaction, accounts]);

  // Focus the description field whenever shouldFocusDescription flips to true
  useEffect(() => {
    if (shouldFocusDescription) {
      descriptionRef.current?.focus();
      setShouldFocusDescription(false);
    }
  }, [shouldFocusDescription]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      mode === "edit" &&
      initialTransaction?.recurrence_group_id &&
      onRecurringEditChoice
    ) {
      // Hand off to parent to show the recurring edit dialog
      onRecurringEditChoice(formData);
      return;
    }

    setLoading(true);

    try {
      if (mode === "add") {
        await apiService.addTransaction(formData);
      } else if (mode === "edit" && initialTransaction) {
        await apiService.updateTransaction(initialTransaction.id, formData);
      }

      if (mode === "add" && createAndStartNew) {
        // Reset form to blank state and focus description — do NOT close modal
        setFormData(getDefaultFormData(mainAccountName));
        setFromCurrency("");
        setToCurrency("");
        setError(null);
        setShouldFocusDescription(true);
      } else if (onSuccess) {
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
    if (mode === "edit") return; // disabled in edit mode
    const { amount, description, date, paymentSchedule } = formData;
    // Reset currency tracking when type changes away from transfer
    setFromCurrency("");
    setToCurrency("");
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
        account: mainAccountName ?? "",
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

  // When a description suggestion is selected, fill description + account + category
  const handleSuggestionSelect = useCallback(
    (suggestion: DescriptionSuggestion) => {
      setFormData((prev) => {
        if (prev.type === "transfer") {
          // Transfer forms have no account/category fields — only fill description
          return { ...prev, description: suggestion.description };
        }
        return {
          ...prev,
          description: suggestion.description,
          account: suggestion.account || prev.account,
          category: suggestion.category || prev.category,
        };
      });
      // Focus shift to amount field is handled inside DescriptionAutocomplete
    },
    [],
  );

  const submitButtonText =
    mode === "add"
      ? loading
        ? "Adding..."
        : "Add Transaction"
      : loading
        ? "Saving..."
        : "Update Transaction";

  const isEditMode = mode === "edit";

  // Compute the conversion rate for display
  const conversionRate =
    isCrossCurrency &&
    formData.type === "transfer" &&
    formData.converted_amount &&
    parseFloat(formData.converted_amount) > 0 &&
    parseFloat(formData.amount) > 0
      ? parseFloat(formData.converted_amount) / parseFloat(formData.amount)
      : null;

  return (
    <form onSubmit={handleSubmit} className="transaction-form">
      {/* Virtual transaction info banner — shown in edit mode only */}
      {isEditMode && initialTransaction?.is_virtual && (
        <div className="virtual-info-banner">
          <span className="virtual-info-icon" aria-hidden="true">
            🔮
          </span>
          <span>
            This is a <strong>projected future transaction</strong>. Editing it
            will update the projection without affecting your account balance.
            Use the "Realize" button to mark it as completed.
          </span>
        </div>
      )}

      {/* 1. Type toggle buttons */}
      <div className="type-toggle-group">
        {TYPE_BUTTONS.map(({ type, label, icon, modifier }) => (
          <button
            key={type}
            type="button"
            className={[
              "type-toggle-btn",
              `type-toggle-btn--${modifier}`,
              formData.type === type
                ? `type-toggle-btn--active type-toggle-btn--active-${modifier}`
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={() => handleTypeChange(type)}
            disabled={isEditMode}
            aria-pressed={formData.type === type}
            title={
              isEditMode
                ? "Transaction type cannot be changed in edit mode"
                : undefined
            }
          >
            <span className="type-toggle-icon" aria-hidden="true">
              {icon}
            </span>
            <span className="type-toggle-label">{label}</span>
          </button>
        ))}
      </div>

      {/* 2. Description (moved to top) */}
      <DescriptionAutocomplete
        ref={descriptionRef}
        value={formData.description || ""}
        onChange={(description) => setFormData({ ...formData, description })}
        onSuggestionSelect={handleSuggestionSelect}
        suggestions={descriptionSuggestions}
        disabled={loading}
        amountInputRef={amountInputRef}
      />

      {/* 3. Date */}
      <DateField
        value={formData.date}
        onChange={(date) => setFormData({ ...formData, date })}
        disabled={loading}
      />

      {/* 4. Amount */}
      <AmountField
        value={formData.amount}
        onChange={(amount) => setFormData({ ...formData, amount })}
        disabled={loading}
        inputRef={amountInputRef}
      />

      {/* 5. Account(s) */}
      {formData.type === "transfer" ? (
        <>
          <div className="form-group">
            <label>From Account</label>
            <AccountSelect
              value={formData.from_account}
              onChange={(from_account) =>
                setFormData({ ...formData, from_account })
              }
              onCurrencyChange={setFromCurrency}
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
              onCurrencyChange={setToCurrency}
              accounts={accounts}
              placeholder="To account…"
              excludeAccount={formData.from_account}
              disabled={loading}
            />
          </div>

          {/* Converted amount field — only shown for cross-currency transfers */}
          {isCrossCurrency && (
            <>
              <AmountField
                label={toCurrency ? `${toCurrency} Amount` : "Converted Amount"}
                value={formData.converted_amount ?? "0"}
                onChange={(converted_amount) =>
                  setFormData({ ...formData, converted_amount })
                }
                disabled={loading}
              />
              {conversionRate !== null && (
                <span className="transfer-rate-tag">
                  {fromCurrency} → {toCurrency}:{" "}
                  {CURRENCY_SYMBOLS[toCurrency] ?? toCurrency + " "}
                  {conversionRate.toFixed(2)}
                </span>
              )}
            </>
          )}
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

          {/* 6. Category */}
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

      {/* 7. Payment Schedule (add mode only) */}
      {mode === "add" && (
        <PaymentScheduleSelector
          value={formData.paymentSchedule}
          onChange={handleScheduleChange}
          disabled={loading}
        />
      )}

      {/* 8. "Create and start a new one" checkbox (add mode only) */}
      {mode === "add" && (
        <label className="create-new-checkbox-label">
          <input
            type="checkbox"
            className="create-new-checkbox"
            checked={createAndStartNew}
            onChange={(e) => setCreateAndStartNew(e.target.checked)}
            disabled={loading}
          />
          Create and start a new one
        </label>
      )}

      {/* 9. Error + Actions */}
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
