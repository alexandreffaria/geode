import { useEffect, useRef, useState } from "react";
import { useModalAccessibility } from "../hooks/useModalAccessibility";
import { DEFAULT_GRADIENT_END, DEFAULT_GRADIENT_START } from "../constants";
import type {
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
} from "../types";
import {
  AccountEditForm,
  type AccountEditFormState,
} from "./accounts/AccountEditForm";
import { AccountListItem } from "./accounts/AccountListItem";
import { AddAccountForm } from "./accounts/AddAccountForm";
import "./AccountManagementModal.css";

interface AccountManagementModalProps {
  isOpen: boolean;
  accounts: Account[];
  onClose: () => void;
  onCreateAccount: (data: CreateAccountRequest) => Promise<void>;
  onUpdateAccount: (name: string, data: UpdateAccountRequest) => Promise<void>;
  onDeleteAccount: (name: string) => Promise<void>;
}

const DEFAULT_ADD_FORM: CreateAccountRequest = {
  name: "",
  initialBalance: 0,
  currency: "BRL",
  imageURL: "",
  gradientStart: DEFAULT_GRADIENT_START,
  gradientEnd: DEFAULT_GRADIENT_END,
};

function buildEditFormState(account: Account): AccountEditFormState {
  return {
    name: account.name,
    currency: account.currency,
    initialBalance: account.initial_balance.toString(),
    imageURL: account.image_url,
    gradientStart: account.gradient_start || DEFAULT_GRADIENT_START,
    gradientEnd: account.gradient_end || DEFAULT_GRADIENT_END,
    archived: account.archived,
  };
}

export function AccountManagementModal({
  isOpen,
  accounts,
  onClose,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
}: AccountManagementModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AccountEditFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [addForm, setAddForm] =
    useState<CreateAccountRequest>(DEFAULT_ADD_FORM);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);

  useModalAccessibility(isOpen, onClose, modalRef);

  useEffect(() => {
    if (isOpen) {
      setAddForm(DEFAULT_ADD_FORM);
      setAddError(null);
      setEditingAccount(null);
      setEditForm(null);
      setEditError(null);
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  // --- Edit handlers ---
  const handleStartEdit = (account: Account) => {
    setEditingAccount(account.name);
    setEditForm(buildEditFormState(account));
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingAccount(null);
    setEditForm(null);
    setEditError(null);
  };

  const handleEditFormChange = (
    field: keyof AccountEditFormState,
    value: string | boolean,
  ) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveEdit = async () => {
    if (!editForm || !editingAccount) return;

    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      setEditError("Account name is required.");
      return;
    }

    const parsedBalance = parseFloat(editForm.initialBalance);
    if (isNaN(parsedBalance)) {
      setEditError("Initial balance must be a valid number.");
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      await onUpdateAccount(editingAccount, {
        name: trimmedName,
        currency: editForm.currency,
        initialBalance: parsedBalance,
        archived: editForm.archived,
        imageURL: editForm.imageURL,
        gradientStart: editForm.gradientStart,
        gradientEnd: editForm.gradientEnd,
      });
      setEditingAccount(null);
      setEditForm(null);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to save changes.",
      );
    } finally {
      setEditSaving(false);
    }
  };

  // --- Delete handler ---
  const handleDelete = async (name: string) => {
    if (!window.confirm(`Delete account "${name}"? This cannot be undone.`))
      return;
    setDeletingAccount(name);
    try {
      await onDeleteAccount(name);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete account.");
    } finally {
      setDeletingAccount(null);
    }
  };

  // --- Add handlers ---
  const handleAddFormChange = (
    field: keyof CreateAccountRequest,
    value: string | number,
  ) => {
    setAddForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = (addForm.name as string).trim();
    if (!trimmedName) {
      setAddError("Account name is required.");
      return;
    }

    setAddSaving(true);
    setAddError(null);
    try {
      await onCreateAccount({ ...addForm, name: trimmedName });
      setAddForm(DEFAULT_ADD_FORM);
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Failed to create account.",
      );
    } finally {
      setAddSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-modal-title"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-container account-management-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="account-modal-title" className="modal-title">
            Manage Accounts
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
          <section className="am-section">
            <h3 className="am-section-title">Your Accounts</h3>
            {accounts.length === 0 ? (
              <p className="am-empty-state">No accounts yet. Add one below.</p>
            ) : (
              <ul className="am-account-list" aria-label="Account list">
                {accounts.map((account) => (
                  <li
                    key={account.name}
                    className={`account-item${account.archived ? " archived" : ""}`}
                  >
                    {editingAccount === account.name && editForm ? (
                      <AccountEditForm
                        account={account}
                        form={editForm}
                        error={editError}
                        saving={editSaving}
                        onChange={handleEditFormChange}
                        onSave={handleSaveEdit}
                        onCancel={handleCancelEdit}
                      />
                    ) : (
                      <AccountListItem
                        account={account}
                        isDeleting={deletingAccount === account.name}
                        onEdit={handleStartEdit}
                        onDelete={handleDelete}
                      />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <hr className="am-divider" />

          <AddAccountForm
            form={addForm}
            error={addError}
            saving={addSaving}
            onChange={handleAddFormChange}
            onSubmit={handleAddAccount}
          />
        </div>
      </div>
    </div>
  );
}
