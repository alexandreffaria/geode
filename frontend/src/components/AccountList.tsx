import type { Account } from "../types";
import "./AccountList.css";

interface AccountListProps {
  accounts: Account[];
}

export function AccountList({ accounts }: AccountListProps) {
  const totalBalance = accounts.reduce(
    (sum, account) => sum + account.balance,
    0,
  );

  return (
    <div className="account-list-container">
      <h2>Accounts</h2>
      <div className="total-balance">
        <span className="total-label">Total Balance:</span>
        <span
          className={`total-amount ${totalBalance >= 0 ? "positive" : "negative"}`}
        >
          ${totalBalance.toFixed(2)}
        </span>
      </div>
      <div className="accounts-grid">
        {accounts.map((account) => (
          <div key={account.id} className="account-card">
            <div className="account-name">{account.name}</div>
            <div
              className={`account-balance ${account.balance >= 0 ? "positive" : "negative"}`}
            >
              ${account.balance.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
