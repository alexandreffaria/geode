import type { Account } from "../../types";
import { CURRENCIES, ACCOUNT_TYPES } from "../../constants";
import { Avatar } from "../ui/Avatar";

export interface AccountEditFormState {
  name: string;
  currency: string;
  initialBalance: string;
  imageURL: string;
  gradientStart: string;
  gradientEnd: string;
  archived: boolean;
  type: "checking" | "credit_card";
  creditLimit: string; // stored as string for input, parsed on save
}

interface AccountEditFormProps {
  account: Account;
  form: AccountEditFormState;
  error: string | null;
  saving: boolean;
  onChange: (
    field: keyof AccountEditFormState,
    value: string | boolean,
  ) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function AccountEditForm({
  account,
  form,
  error,
  saving,
  onChange,
  onSave,
  onCancel,
}: AccountEditFormProps) {
  const isCreditCard = form.type === ACCOUNT_TYPES.CREDIT_CARD;

  return (
    <div className="edit-form" role="group" aria-label={`Edit ${account.name}`}>
      <div className="edit-form-header">
        <Avatar
          name={account.name}
          gradientStart={account.gradient_start}
          gradientEnd={account.gradient_end}
          imageUrl={account.image_url || undefined}
          size={40}
          className="account-avatar"
        />
        <span className="edit-form-label">Editing account</span>
      </div>

      {error && (
        <div className="am-error" role="alert">
          {error}
        </div>
      )}

      {/* Account type toggle */}
      <div className="form-group form-group--full">
        <label>Account Type</label>
        <div className="account-type-toggle">
          <button
            type="button"
            className={`account-type-btn${!isCreditCard ? " account-type-btn--active" : ""}`}
            onClick={() => onChange("type", ACCOUNT_TYPES.CHECKING)}
            disabled={saving}
          >
            🏦 Checking Account
          </button>
          <button
            type="button"
            className={`account-type-btn${isCreditCard ? " account-type-btn--active" : ""}`}
            onClick={() => onChange("type", ACCOUNT_TYPES.CREDIT_CARD)}
            disabled={saving}
          >
            💳 Credit Card
          </button>
        </div>
      </div>

      <div className="edit-form-grid">
        <div className="form-group">
          <label htmlFor={`edit-name-${account.name}`}>Name</label>
          <input
            id={`edit-name-${account.name}`}
            type="text"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            disabled={saving}
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label htmlFor={`edit-currency-${account.name}`}>Currency</label>
          <select
            id={`edit-currency-${account.name}`}
            value={form.currency}
            onChange={(e) => onChange("currency", e.target.value)}
            disabled={saving}
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
            {isCreditCard ? "Current Balance (debt)" : "Initial Balance"}
          </label>
          <input
            id={`edit-balance-${account.name}`}
            type="number"
            step="0.01"
            value={form.initialBalance}
            onChange={(e) => onChange("initialBalance", e.target.value)}
            disabled={saving}
          />
        </div>

        {isCreditCard && (
          <div className="form-group">
            <label htmlFor={`edit-credit-limit-${account.name}`}>
              Credit Limit <span className="optional">(optional)</span>
            </label>
            <input
              id={`edit-credit-limit-${account.name}`}
              type="number"
              step="0.01"
              min="0"
              value={form.creditLimit}
              onChange={(e) => onChange("creditLimit", e.target.value)}
              disabled={saving}
              placeholder="e.g. 5000"
            />
          </div>
        )}

        <div className="form-group">
          <label htmlFor={`edit-image-${account.name}`}>Image URL</label>
          <input
            id={`edit-image-${account.name}`}
            type="text"
            value={form.imageURL}
            onChange={(e) => onChange("imageURL", e.target.value)}
            disabled={saving}
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
              value={form.gradientStart}
              onChange={(e) => onChange("gradientStart", e.target.value)}
              disabled={saving}
            />
            <span className="color-hex">{form.gradientStart}</span>
          </div>
        </div>

        <div className="form-group form-group--color">
          <label htmlFor={`edit-grad-end-${account.name}`}>Gradient End</label>
          <div className="color-input-wrapper">
            <input
              id={`edit-grad-end-${account.name}`}
              type="color"
              value={form.gradientEnd}
              onChange={(e) => onChange("gradientEnd", e.target.value)}
              disabled={saving}
            />
            <span className="color-hex">{form.gradientEnd}</span>
          </div>
        </div>

        <div className="form-group form-group--checkbox">
          <label htmlFor={`edit-archived-${account.name}`}>
            <input
              id={`edit-archived-${account.name}`}
              type="checkbox"
              checked={form.archived}
              onChange={(e) => onChange("archived", e.target.checked)}
              disabled={saving}
            />
            Archived
          </label>
        </div>
      </div>

      {/* Gradient preview */}
      <div
        className="gradient-preview"
        style={{
          background: `linear-gradient(135deg, ${form.gradientStart}, ${form.gradientEnd})`,
        }}
        aria-hidden="true"
      />

      <div className="edit-form-actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
