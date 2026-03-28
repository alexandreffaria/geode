import type { Account } from "../types";
import { Avatar } from "./ui/Avatar";
import "./AccountList.css";

interface AccountListProps {
  accounts: Account[];
}

export function AccountList({ accounts }: AccountListProps) {
  // Filter out archived accounts for the main dashboard view
  const activeAccounts = accounts.filter((a) => !a.archived);

  const totalBalance = activeAccounts.reduce(
    (sum, account) => sum + account.balance,
    0,
  );

  return (
    <div className="account-list-container">
      <h2>Accounts</h2>
      <div className="total-balance">
        <span className="total-label">Total Balance:</span>
        <span
          className={`total-amount ${totalBalance >= 0 ? "amount-positive" : "amount-negative"}`}
        >
          R${totalBalance.toFixed(2)}
        </span>
      </div>
      <div className="accounts-grid">
        {activeAccounts.map((account) => (
          <div key={account.name} className="account-card">
            <div className="account-card-header">
              <Avatar
                name={account.name}
                gradientStart={account.gradient_start}
                gradientEnd={account.gradient_end}
                imageUrl={account.image_url || undefined}
                size={40}
                className="account-card-avatar"
              />
              <div className="account-card-info">
                <div className="account-name">{account.name}</div>
                <span className="account-currency-badge">
                  {account.currency}
                </span>
              </div>
            </div>
            <div
              className={`account-balance ${account.balance >= 0 ? "amount-positive" : "amount-negative"}`}
            >
              {account.balance.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
