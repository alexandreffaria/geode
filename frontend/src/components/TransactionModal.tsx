import { useRef, useState } from "react";
import type {
  Transaction,
  Account,
  Category,
  TransactionFormData,
} from "../types";
import { TransactionForm } from "./TransactionForm";
import { useModalAccessibility } from "../hooks/useModalAccessibility";
import { apiService } from "../services/api";
import "./TransactionModal.css";

interface TransactionModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  transaction?: Transaction;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  mainAccountName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function TransactionModal({
  isOpen,
  mode,
  transaction,
  transactions,
  accounts,
  categories,
  mainAccountName,
  onClose,
  onSuccess,
}: TransactionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const [pendingFormData, setPendingFormData] =
    useState<TransactionFormData | null>(null);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  useModalAccessibility(isOpen, onClose, modalRef);

  // Handle backdrop click — only close if the dialog is not open
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !showRecurringDialog) {
      onClose();
    }
  };

  // Called by TransactionForm when editing a recurring transaction
  const handleRecurringEditChoice = (formData: TransactionFormData) => {
    setPendingFormData(formData);
    setShowRecurringDialog(true);
    setDialogError(null);
  };

  // Called when the user picks a scope for the recurring edit
  const handleRecurringConfirm = async (scope: "single" | "future" | "all") => {
    if (!pendingFormData || !transaction) return;

    setDialogLoading(true);
    setDialogError(null);

    try {
      if (scope === "single") {
        await apiService.updateTransaction(transaction.id, pendingFormData);
      } else if (scope === "future") {
        await apiService.updateFutureRecurring(transaction.id, pendingFormData);
      } else {
        // scope === "all"
        const groupId = transaction.recurrence_group_id!;
        await apiService.updateRecurringGroup(groupId, pendingFormData);
      }

      // Reset dialog state before calling onSuccess so the modal closes cleanly
      setPendingFormData(null);
      setShowRecurringDialog(false);
      onSuccess();
    } catch (err) {
      setDialogError(
        err instanceof Error ? err.message : "Failed to update transaction",
      );
    } finally {
      setDialogLoading(false);
    }
  };

  // Cancel the dialog — go back to the form
  const handleDialogCancel = () => {
    setPendingFormData(null);
    setShowRecurringDialog(false);
    setDialogError(null);
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-container"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {mode === "add" ? "Add Transaction" : "Edit Transaction"}
          </h2>
          <button
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            ×
          </button>
        </div>
        <div className="modal-body">
          {showRecurringDialog ? (
            <div className="recurring-dialog">
              <div className="recurring-dialog__icon" aria-hidden="true">
                🔁
              </div>
              <h3 className="recurring-dialog__title">
                Edit recurring transaction
              </h3>
              <p className="recurring-dialog__question">
                This is a recurring transaction. How would you like to apply
                this change?
              </p>

              {dialogError && (
                <div className="error-message recurring-dialog__error">
                  {dialogError}
                </div>
              )}

              <div className="recurring-dialog__actions">
                <button
                  type="button"
                  className="recurring-dialog__btn recurring-dialog__btn--primary"
                  onClick={() => handleRecurringConfirm("single")}
                  disabled={dialogLoading}
                >
                  {dialogLoading ? "Saving…" : "Just this one"}
                </button>
                <button
                  type="button"
                  className="recurring-dialog__btn recurring-dialog__btn--secondary"
                  onClick={() => handleRecurringConfirm("future")}
                  disabled={dialogLoading}
                >
                  {dialogLoading ? "Saving…" : "This and all future"}
                </button>
                <button
                  type="button"
                  className="recurring-dialog__btn recurring-dialog__btn--secondary"
                  onClick={() => handleRecurringConfirm("all")}
                  disabled={dialogLoading}
                >
                  {dialogLoading ? "Saving…" : "All in series"}
                </button>
              </div>

              <button
                type="button"
                className="recurring-dialog__cancel"
                onClick={handleDialogCancel}
                disabled={dialogLoading}
              >
                Cancel — go back to form
              </button>
            </div>
          ) : (
            <TransactionForm
              accounts={accounts}
              categories={categories}
              transactions={transactions}
              mode={mode}
              initialTransaction={transaction}
              mainAccountName={mode === "add" ? mainAccountName : undefined}
              onSuccess={onSuccess}
              onCancel={onClose}
              onRecurringEditChoice={handleRecurringEditChoice}
            />
          )}
        </div>
      </div>
    </div>
  );
}
