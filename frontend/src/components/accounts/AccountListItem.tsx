import type { Account } from "../../types";
import { CURRENCY_SYMBOLS } from "../../constants";
import { Avatar } from "../ui/Avatar";

interface AccountListItemProps {
  account: Account;
  isDeleting: boolean;
  onEdit: (account: Account) => void;
  onDelete: (name: string) => void;
  onSetMain?: (name: string) => void;
  onViewBills?: (account: Account) => void;
}

export function AccountListItem({
  account,
  isDeleting,
  onEdit,
  onDelete,
  onSetMain,
  onViewBills,
}: AccountListItemProps) {
  const isCreditCard = account.type === "credit_card";
  const symbol = CURRENCY_SYMBOLS[account.currency] ?? "";

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
        <div className="account-item-name-row">
          <span className="account-item-name">{account.name}</span>
          {account.is_main && (
            <span className="main-account-badge" title="Main account">
              ★
            </span>
          )}
          {isCreditCard && (
            <span className="credit-card-badge" title="Credit Card">
              💳
            </span>
          )}
        </div>
        <div className="account-item-meta">
          <span className="currency-badge">{account.currency}</span>
          <span
            className={`account-item-balance ${account.balance >= 0 ? "amount-positive" : "amount-negative"}`}
          >
            {symbol}
            {account.balance.toFixed(2)}
          </span>
          {isCreditCard && account.credit_limit != null && (
            <span className="credit-limit-badge">
              Limit: {symbol}
              {account.credit_limit.toFixed(2)}
            </span>
          )}
          {account.archived && <span className="archived-badge">Archived</span>}
        </div>
      </div>

      <div className="account-item-actions">
        {onSetMain && (
          <button
            type="button"
            className={`icon-btn icon-btn--main${account.is_main ? " icon-btn--main-active" : ""}`}
            onClick={() => onSetMain(account.name)}
            aria-label={
              account.is_main
                ? `${account.name} is the main account`
                : `Set ${account.name} as main account`
            }
            title={account.is_main ? "Main account" : "Set as main account"}
            aria-pressed={account.is_main}
          >
            {account.is_main ? "★" : "☆"}
          </button>
        )}
        {isCreditCard && onViewBills && (
          <button
            type="button"
            className="icon-btn icon-btn--bills"
            onClick={() => onViewBills(account)}
            aria-label={`View bills for ${account.name}`}
            title="View credit card bills"
          >
            📋
          </button>
        )}
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
