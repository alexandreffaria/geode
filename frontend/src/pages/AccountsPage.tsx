import { useState } from "react";
import type {
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
} from "../types";
import {
  AccountEditForm,
  type AccountEditFormState,
} from "../components/accounts/AccountEditForm";
import { AccountListItem } from "../components/accounts/AccountListItem";
import { AddAccountForm } from "../components/accounts/AddAccountForm";
import {
  DEFAULT_GRADIENT_END,
  DEFAULT_GRADIENT_START,
  ACCOUNT_TYPES,
} from "../constants";
import "../components/AccountManagementModal.css";
import "./AccountsPage.css";

interface AccountsPageProps {
  accounts: Account[];
  onCreateAccount: (data: CreateAccountRequest) => Promise<void>;
  onUpdateAccount: (name: string, data: UpdateAccountRequest) => Promise<void>;
  onDeleteAccount: (name: string) => Promise<void>;
  onSetMainAccount: (name: string) => Promise<void>;
  onViewBills?: (account: Account) => void;
}

const DEFAULT_ADD_FORM: CreateAccountRequest = {
  name: "",
  initialBalance: 0,
  currency: "BRL",
  imageURL: "",
  gradientStart: DEFAULT_GRADIENT_START,
  gradientEnd: DEFAULT_GRADIENT_END,
  type: ACCOUNT_TYPES.CHECKING,
  creditLimit: null,
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
    type: account.type ?? ACCOUNT_TYPES.CHECKING,
    creditLimit:
      account.credit_limit != null ? account.credit_limit.toString() : "",
  };
}

export function AccountsPage({
  accounts,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onSetMainAccount,
  onViewBills,
}: AccountsPageProps) {
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<AccountEditFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [addForm, setAddForm] =
    useState<CreateAccountRequest>(DEFAULT_ADD_FORM);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);

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

    let parsedCreditLimit: number | null = null;
    if (
      editForm.type === ACCOUNT_TYPES.CREDIT_CARD &&
      editForm.creditLimit !== ""
    ) {
      const cl = parseFloat(editForm.creditLimit);
      if (!isNaN(cl)) parsedCreditLimit = cl;
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
        type: editForm.type,
        creditLimit:
          editForm.type === ACCOUNT_TYPES.CREDIT_CARD
            ? parsedCreditLimit
            : null,
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

  // --- Set Main handler ---
  const handleSetMain = async (name: string) => {
    try {
      await onSetMainAccount(name);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to set main account.");
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
    value: string | number | null,
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

  return (
    <div className="accounts-page">
      <div className="accounts-page-header">
        <h1 className="accounts-page-title">Accounts</h1>
      </div>

      <div className="accounts-page-body">
        <section className="accounts-page-section">
          <h2 className="am-section-title">Your Accounts</h2>
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
                      onSetMain={handleSetMain}
                      onViewBills={onViewBills}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <hr className="am-divider" />

        <section className="accounts-page-section">
          <h2 className="am-section-title">Add Account</h2>
          <AddAccountForm
            form={addForm}
            error={addError}
            saving={addSaving}
            onChange={handleAddFormChange}
            onSubmit={handleAddAccount}
          />
        </section>
      </div>
    </div>
  );
}
