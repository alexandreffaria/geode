import { useRef } from "react";
import type { Transaction, Account, Category } from "../types";
import { TransactionForm } from "./TransactionForm";
import { useModalAccessibility } from "../hooks/useModalAccessibility";

interface TransactionModalProps {
  isOpen: boolean;
  mode: "add" | "edit";
  transaction?: Transaction;
  accounts: Account[];
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

export function TransactionModal({
  isOpen,
  mode,
  transaction,
  accounts,
  categories,
  onClose,
  onSuccess,
}: TransactionModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useModalAccessibility(isOpen, onClose, modalRef);

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
          <TransactionForm
            accounts={accounts}
            categories={categories}
            mode={mode}
            initialTransaction={transaction}
            onSuccess={onSuccess}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}
