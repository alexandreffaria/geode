import { useEffect, useRef, useState } from "react";
import type {
  Account,
  CreateAccountRequest,
  UpdateAccountRequest,
} from "../types";
import "./AccountManagementModal.css";

interface AccountManagementModalProps {
  isOpen: boolean;
  accounts: Account[];
  onClose: () => void;
  onCreateAccount: (data: CreateAccountRequest) => Promise<void>;
  onUpdateAccount: (name: string, data: UpdateAccountRequest) => Promise<void>;
  onDeleteAccount: (name: string) => Promise<void>;
}

interface EditFormState {
  name: string;
  currency: string;
  initialBalance: string;
  imageURL: string;
  gradientStart: string;
  gradientEnd: string;
  archived: boolean;
}

const CURRENCIES = ["BRL", "USD", "EUR", "GBP", "JPY"];

const DEFAULT_GRADIENT_START = "#4a9eff";
const DEFAULT_GRADIENT_END = "#6bff6b";

function buildEditFormState(account: Account): EditFormState {
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

interface AccountAvatarProps {
  account: Account;
  size?: number;
}

function AccountAvatar({ account, size = 48 }: AccountAvatarProps) {
  if (account.image_url) {
    return (
      <img
        className="account-avatar"
        src={account.image_url}
        alt={account.name}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="account-avatar account-avatar--gradient"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${account.gradient_start || DEFAULT_GRADIENT_START}, ${account.gradient_end || DEFAULT_GRADIENT_END})`,
      }}
      aria-hidden="true"
    />
  );
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

  // Which account is currently being edited (by name)
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Add account form state
  const [addForm, setAddForm] = useState<CreateAccountRequest>({
    name: "",
    initialBalance: 0,
    currency: "BRL",
    imageURL: "",
    gradientStart: DEFAULT_GRADIENT_START,
    gradientEnd: DEFAULT_GRADIENT_END,
  });
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  // Deleting state
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);

  // Handle ESC key press + tab trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }

      if (e.key === "Tab") {
        const focusableElements =
          modalRef.current?.querySelectorAll<HTMLElement>(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );

        if (focusableElements && focusableElements.length > 0) {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      const previouslyFocused = document.activeElement as HTMLElement;

      setTimeout(() => {
        const firstInput = modalRef.current?.querySelector<HTMLElement>(
          "input, select, textarea",
        );
        firstInput?.focus();
      }, 100);

      return () => {
        previouslyFocused?.focus();
      };
    }
  }, [isOpen]);

  // Reset add form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAddForm({
        name: "",
        initialBalance: 0,
        currency: "BRL",
        imageURL: "",
        gradientStart: DEFAULT_GRADIENT_START,
        gradientEnd: DEFAULT_GRADIENT_END,
      });
      setAddError(null);
      setEditingAccount(null);
      setEditForm(null);
      setEditError(null);
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
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
    field: keyof EditFormState,
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
      const payload: UpdateAccountRequest = {
        name: trimmedName,
        currency: editForm.currency,
        initialBalance: parsedBalance,
        archived: editForm.archived,
        imageURL: editForm.imageURL,
        gradientStart: editForm.gradientStart,
        gradientEnd: editForm.gradientEnd,
      };
      await onUpdateAccount(editingAccount, payload);
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
      await onCreateAccount({
        ...addForm,
        name: trimmedName,
      });
      setAddForm({
        name: "",
        initialBalance: 0,
        currency: "BRL",
        imageURL: "",
        gradientStart: DEFAULT_GRADIENT_START,
        gradientEnd: DEFAULT_GRADIENT_END,
      });
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
        {/* Header */}
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

        {/* Body */}
        <div className="modal-body">
          {/* Account list section */}
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
                      /* ---- Inline edit form ---- */
                      <div
                        className="edit-form"
                        role="group"
                        aria-label={`Edit ${account.name}`}
                      >
                        <div className="edit-form-header">
                          <AccountAvatar account={account} size={40} />
                          <span className="edit-form-label">
                            Editing account
                          </span>
                        </div>

                        {editError && (
                          <div className="am-error" role="alert">
                            {editError}
                          </div>
                        )}

                        <div className="edit-form-grid">
                          <div className="form-group">
                            <label htmlFor={`edit-name-${account.name}`}>
                              Name
                            </label>
                            <input
                              id={`edit-name-${account.name}`}
                              type="text"
                              value={editForm.name}
                              onChange={(e) =>
                                handleEditFormChange("name", e.target.value)
                              }
                              disabled={editSaving}
                              autoComplete="off"
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor={`edit-currency-${account.name}`}>
                              Currency
                            </label>
                            <select
                              id={`edit-currency-${account.name}`}
                              value={editForm.currency}
                              onChange={(e) =>
                                handleEditFormChange("currency", e.target.value)
                              }
                              disabled={editSaving}
                            >
                              {CURRENCIES.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="form-group">
                            <label htmlFor={`edit-balance-${account.name}`}>
                              Initial Balance
                            </label>
                            <input
                              id={`edit-balance-${account.name}`}
                              type="number"
                              step="0.01"
                              value={editForm.initialBalance}
                              onChange={(e) =>
                                handleEditFormChange(
                                  "initialBalance",
                                  e.target.value,
                                )
                              }
                              disabled={editSaving}
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor={`edit-image-${account.name}`}>
                              Image URL
                            </label>
                            <input
                              id={`edit-image-${account.name}`}
                              type="text"
                              value={editForm.imageURL}
                              onChange={(e) =>
                                handleEditFormChange("imageURL", e.target.value)
                              }
                              disabled={editSaving}
                              placeholder="https://..."
                            />
                          </div>

                          <div className="form-group form-group--color">
                            <label htmlFor={`edit-grad-start-${account.name}`}>
                              Gradient Start
                            </label>
                            <div className="color-input-wrapper">
                              <input
                                id={`edit-grad-start-${account.name}`}
                                type="color"
                                value={editForm.gradientStart}
                                onChange={(e) =>
                                  handleEditFormChange(
                                    "gradientStart",
                                    e.target.value,
                                  )
                                }
                                disabled={editSaving}
                              />
                              <span className="color-hex">
                                {editForm.gradientStart}
                              </span>
                            </div>
                          </div>

                          <div className="form-group form-group--color">
                            <label htmlFor={`edit-grad-end-${account.name}`}>
                              Gradient End
                            </label>
                            <div className="color-input-wrapper">
                              <input
                                id={`edit-grad-end-${account.name}`}
                                type="color"
                                value={editForm.gradientEnd}
                                onChange={(e) =>
                                  handleEditFormChange(
                                    "gradientEnd",
                                    e.target.value,
                                  )
                                }
                                disabled={editSaving}
                              />
                              <span className="color-hex">
                                {editForm.gradientEnd}
                              </span>
                            </div>
                          </div>

                          <div className="form-group form-group--checkbox">
                            <label htmlFor={`edit-archived-${account.name}`}>
                              <input
                                id={`edit-archived-${account.name}`}
                                type="checkbox"
                                checked={editForm.archived}
                                onChange={(e) =>
                                  handleEditFormChange(
                                    "archived",
                                    e.target.checked,
                                  )
                                }
                                disabled={editSaving}
                              />
                              Archived
                            </label>
                          </div>
                        </div>

                        {/* Gradient preview */}
                        <div
                          className="gradient-preview"
                          style={{
                            background: `linear-gradient(135deg, ${editForm.gradientStart}, ${editForm.gradientEnd})`,
                          }}
                          aria-hidden="true"
                        />

                        <div className="edit-form-actions">
                          <button
                            type="button"
                            className="btn btn--primary"
                            onClick={handleSaveEdit}
                            disabled={editSaving}
                          >
                            {editSaving ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            className="btn btn--secondary"
                            onClick={handleCancelEdit}
                            disabled={editSaving}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ---- Normal account row ---- */
                      <div className="account-item-row">
                        <AccountAvatar account={account} />

                        <div className="account-item-info">
                          <span className="account-item-name">
                            {account.name}
                          </span>
                          <div className="account-item-meta">
                            <span className="currency-badge">
                              {account.currency}
                            </span>
                            <span
                              className={`account-item-balance ${account.balance >= 0 ? "positive" : "negative"}`}
                            >
                              {account.currency === "BRL"
                                ? "R$"
                                : account.currency === "USD"
                                  ? "$"
                                  : account.currency === "EUR"
                                    ? "€"
                                    : account.currency === "GBP"
                                      ? "£"
                                      : ""}
                              {account.balance.toFixed(2)}
                            </span>
                            {account.archived && (
                              <span className="archived-badge">Archived</span>
                            )}
                          </div>
                        </div>

                        <div className="account-item-actions">
                          <button
                            type="button"
                            className="icon-btn icon-btn--edit"
                            onClick={() => handleStartEdit(account)}
                            aria-label={`Edit ${account.name}`}
                            title="Edit account"
                          >
                            ✏️
                          </button>
                          <button
                            type="button"
                            className="icon-btn icon-btn--delete"
                            onClick={() => handleDelete(account.name)}
                            disabled={deletingAccount === account.name}
                            aria-label={`Delete ${account.name}`}
                            title="Delete account"
                          >
                            {deletingAccount === account.name ? "…" : "🗑️"}
                          </button>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Divider */}
          <hr className="am-divider" />

          {/* Add account form */}
          <section className="am-section">
            <h3 className="am-section-title">Add New Account</h3>

            {addError && (
              <div className="am-error" role="alert">
                {addError}
              </div>
            )}

            <form
              className="add-account-form"
              onSubmit={handleAddAccount}
              noValidate
            >
              <div className="add-form-grid">
                <div className="form-group">
                  <label htmlFor="add-name">
                    Name <span className="required">*</span>
                  </label>
                  <input
                    id="add-name"
                    type="text"
                    value={addForm.name as string}
                    onChange={(e) =>
                      handleAddFormChange("name", e.target.value)
                    }
                    disabled={addSaving}
                    placeholder="e.g. Nubank"
                    autoComplete="off"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="add-currency">Currency</label>
                  <select
                    id="add-currency"
                    value={addForm.currency as string}
                    onChange={(e) =>
                      handleAddFormChange("currency", e.target.value)
                    }
                    disabled={addSaving}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="add-balance">Initial Balance</label>
                  <input
                    id="add-balance"
                    type="number"
                    step="0.01"
                    value={addForm.initialBalance as number}
                    onChange={(e) =>
                      handleAddFormChange(
                        "initialBalance",
                        parseFloat(e.target.value) || 0,
                      )
                    }
                    disabled={addSaving}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="add-image">
                    Image URL <span className="optional">(optional)</span>
                  </label>
                  <input
                    id="add-image"
                    type="text"
                    value={addForm.imageURL as string}
                    onChange={(e) =>
                      handleAddFormChange("imageURL", e.target.value)
                    }
                    disabled={addSaving}
                    placeholder="https://..."
                  />
                </div>

                <div className="form-group form-group--color">
                  <label htmlFor="add-grad-start">Gradient Start</label>
                  <div className="color-input-wrapper">
                    <input
                      id="add-grad-start"
                      type="color"
                      value={addForm.gradientStart as string}
                      onChange={(e) =>
                        handleAddFormChange("gradientStart", e.target.value)
                      }
                      disabled={addSaving}
                    />
                    <span className="color-hex">
                      {addForm.gradientStart as string}
                    </span>
                  </div>
                </div>

                <div className="form-group form-group--color">
                  <label htmlFor="add-grad-end">Gradient End</label>
                  <div className="color-input-wrapper">
                    <input
                      id="add-grad-end"
                      type="color"
                      value={addForm.gradientEnd as string}
                      onChange={(e) =>
                        handleAddFormChange("gradientEnd", e.target.value)
                      }
                      disabled={addSaving}
                    />
                    <span className="color-hex">
                      {addForm.gradientEnd as string}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gradient preview */}
              <div
                className="gradient-preview"
                style={{
                  background: `linear-gradient(135deg, ${addForm.gradientStart as string}, ${addForm.gradientEnd as string})`,
                }}
                aria-hidden="true"
              />

              <div className="add-form-actions">
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={addSaving}
                >
                  {addSaving ? "Adding…" : "Add Account"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
