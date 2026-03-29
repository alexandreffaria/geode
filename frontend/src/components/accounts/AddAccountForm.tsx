import type { CreateAccountRequest } from "../../types";
import { CURRENCIES, ACCOUNT_TYPES } from "../../constants";

interface AddAccountFormProps {
  form: CreateAccountRequest;
  error: string | null;
  saving: boolean;
  onChange: (
    field: keyof CreateAccountRequest,
    value: string | number | null,
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddAccountForm({
  form,
  error,
  saving,
  onChange,
  onSubmit,
}: AddAccountFormProps) {
  const isCreditCard = form.type === ACCOUNT_TYPES.CREDIT_CARD;

  return (
    <section className="am-section">
      <h3 className="am-section-title">Add New Account</h3>

      {error && (
        <div className="am-error" role="alert">
          {error}
        </div>
      )}

      <form className="add-account-form" onSubmit={onSubmit} noValidate>
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

        <div className="add-form-grid">
          <div className="form-group">
            <label htmlFor="add-name">
              Name <span className="required">*</span>
            </label>
            <input
              id="add-name"
              type="text"
              value={form.name as string}
              onChange={(e) => onChange("name", e.target.value)}
              disabled={saving}
              placeholder="e.g. Nubank"
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="add-currency">Currency</label>
            <select
              id="add-currency"
              value={form.currency as string}
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
            <label htmlFor="add-balance">
              {isCreditCard ? "Current Balance (debt)" : "Initial Balance"}
            </label>
            <input
              id="add-balance"
              type="number"
              step="0.01"
              value={form.initialBalance as number}
              onChange={(e) =>
                onChange("initialBalance", parseFloat(e.target.value) || 0)
              }
              disabled={saving}
            />
          </div>

          {isCreditCard && (
            <div className="form-group">
              <label htmlFor="add-credit-limit">
                Credit Limit <span className="optional">(optional)</span>
              </label>
              <input
                id="add-credit-limit"
                type="number"
                step="0.01"
                min="0"
                value={
                  form.creditLimit != null ? (form.creditLimit as number) : ""
                }
                onChange={(e) =>
                  onChange(
                    "creditLimit",
                    e.target.value === ""
                      ? null
                      : parseFloat(e.target.value) || 0,
                  )
                }
                disabled={saving}
                placeholder="e.g. 5000"
              />
            </div>
          )}

          <div className="form-group">
            <label htmlFor="add-image">
              Image URL <span className="optional">(optional)</span>
            </label>
            <input
              id="add-image"
              type="text"
              value={form.imageURL as string}
              onChange={(e) => onChange("imageURL", e.target.value)}
              disabled={saving}
              placeholder="https://..."
            />
          </div>

          <div className="form-group form-group--color">
            <label htmlFor="add-grad-start">Gradient Start</label>
            <div className="color-input-wrapper">
              <input
                id="add-grad-start"
                type="color"
                value={form.gradientStart as string}
                onChange={(e) => onChange("gradientStart", e.target.value)}
                disabled={saving}
              />
              <span className="color-hex">{form.gradientStart as string}</span>
            </div>
          </div>

          <div className="form-group form-group--color">
            <label htmlFor="add-grad-end">Gradient End</label>
            <div className="color-input-wrapper">
              <input
                id="add-grad-end"
                type="color"
                value={form.gradientEnd as string}
                onChange={(e) => onChange("gradientEnd", e.target.value)}
                disabled={saving}
              />
              <span className="color-hex">{form.gradientEnd as string}</span>
            </div>
          </div>
        </div>

        {/* Gradient preview */}
        <div
          className="gradient-preview"
          style={{
            background: `linear-gradient(135deg, ${form.gradientStart as string}, ${form.gradientEnd as string})`,
          }}
          aria-hidden="true"
        />

        <div className="add-form-actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Adding…" : "Add Account"}
          </button>
        </div>
      </form>
    </section>
  );
}
