import type { Account } from "../../types";
import { CURRENCY_SYMBOLS } from "../../constants";
import { Avatar } from "../ui/Avatar";

interface AccountListItemProps {
  account: Account;
  isDeleting: boolean;
  onEdit: (account: Account) => void;
  onDelete: (name: string) => void;
}

export function AccountListItem({
  account,
  isDeleting,
  onEdit,
  onDelete,
}: AccountListItemProps) {
  return (
    <div className="account-item-row">
      <Avatar
        name={account.name}
        gradientStart={account.gradient_start}
        gradientEnd={account.gradient_end}
        imageUrl={account.image_url || undefined}
        size={48}
        className="account-avatar"
      />

      <div className="account-item-info">
        <span className="account-item-name">{account.name}</span>
        <div className="account-item-meta">
          <span className="currency-badge">{account.currency}</span>
          <span
            className={`account-item-balance ${account.balance >= 0 ? "amount-positive" : "amount-negative"}`}
          >
            {CURRENCY_SYMBOLS[account.currency] ?? ""}
            {account.balance.toFixed(2)}
          </span>
          {account.archived && <span className="archived-badge">Archived</span>}
        </div>
      </div>

      <div className="account-item-actions">
        <button
          type="button"
          className="icon-btn icon-btn--edit"
          onClick={() => onEdit(account)}
          aria-label={`Edit ${account.name}`}
          title="Edit account"
        >
          ✏️
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--delete"
          onClick={() => onDelete(account.name)}
          disabled={isDeleting}
          aria-label={`Delete ${account.name}`}
          title="Delete account"
        >
          {isDeleting ? "…" : "🗑️"}
        </button>
      </div>
    </div>
  );
}
