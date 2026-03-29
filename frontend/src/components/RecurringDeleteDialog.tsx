import { useRef } from "react";
import type { Transaction } from "../types";
import { useModalAccessibility } from "../hooks/useModalAccessibility";
import "./RecurringDeleteDialog.css";

export type DeleteScope = "single" | "future" | "all";

interface RecurringDeleteDialogProps {
  /** The transaction being deleted — used to show description and determine if recurring */
  transaction: Transaction;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Whether an async delete operation is in progress */
  loading: boolean;
  /** Error message to display, if any */
  error: string | null;
  /** Called when the user confirms a delete scope */
  onConfirm: (scope: DeleteScope) => void;
  /** Called when the user cancels */
  onCancel: () => void;
}

/**
 * Modal dialog shown when the user clicks "Delete" on a transaction.
 *
 * - For recurring transactions (has recurrence_group_id): shows three scope
 *   options — "Only this one", "This and all future", "All in series".
 * - For non-recurring transactions: shows a simple confirmation with a single
 *   "Delete" button.
 */
export function RecurringDeleteDialog({
  transaction,
  isOpen,
  loading,
  error,
  onConfirm,
  onCancel,
}: RecurringDeleteDialogProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  useModalAccessibility(isOpen, onCancel, modalRef);

  if (!isOpen) return null;

  const isRecurring = Boolean(transaction.recurrence_group_id);
  const description = transaction.description || "this transaction";

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && !loading) {
      onCancel();
    }
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-container delete-dialog-container"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="delete-dialog-title" className="modal-title">
            Delete Transaction
          </h2>
          <button
            className="modal-close-button"
            onClick={onCancel}
            aria-label="Close dialog"
            type="button"
            disabled={loading}
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="delete-dialog">
            <div className="delete-dialog__icon" aria-hidden="true">
              🗑️
            </div>

            <p className="delete-dialog__description">
              <strong>"{description}"</strong>
            </p>

            {isRecurring ? (
              <>
                <p className="delete-dialog__question">
                  This is a recurring transaction. Which occurrences would you
                  like to delete?
                </p>

                {error && (
                  <div className="error-message delete-dialog__error">
                    {error}
                  </div>
                )}

                <div className="delete-dialog__actions">
                  <button
                    type="button"
                    className="delete-dialog__btn delete-dialog__btn--single"
                    onClick={() => onConfirm("single")}
                    disabled={loading}
                  >
                    <span className="delete-dialog__btn-label">
                      {loading ? "Deleting…" : "Only this transaction"}
                    </span>
                    <span className="delete-dialog__btn-hint">
                      Keep all other occurrences
                    </span>
                  </button>

                  <button
                    type="button"
                    className="delete-dialog__btn delete-dialog__btn--future"
                    onClick={() => onConfirm("future")}
                    disabled={loading}
                  >
                    <span className="delete-dialog__btn-label">
                      {loading ? "Deleting…" : "This and all future"}
                    </span>
                    <span className="delete-dialog__btn-hint">
                      Delete this and all upcoming occurrences
                    </span>
                  </button>

                  <button
                    type="button"
                    className="delete-dialog__btn delete-dialog__btn--all"
                    onClick={() => onConfirm("all")}
                    disabled={loading}
                  >
                    <span className="delete-dialog__btn-label">
                      {loading ? "Deleting…" : "All transactions in series"}
                    </span>
                    <span className="delete-dialog__btn-hint">
                      Delete every occurrence in this series
                    </span>
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="delete-dialog__question">
                  Are you sure you want to delete this transaction? This will
                  reverse its effects on account balances.
                </p>

                {error && (
                  <div className="error-message delete-dialog__error">
                    {error}
                  </div>
                )}

                <div className="delete-dialog__actions">
                  <button
                    type="button"
                    className="delete-dialog__btn delete-dialog__btn--single"
                    onClick={() => onConfirm("single")}
                    disabled={loading}
                  >
                    <span className="delete-dialog__btn-label">
                      {loading ? "Deleting…" : "Delete"}
                    </span>
                  </button>
                </div>
              </>
            )}

            <button
              type="button"
              className="delete-dialog__cancel"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
