import type { Account } from "../types";
import "./AccountList.css";

interface AccountListProps {
  accounts: Account[];
}

const DEFAULT_GRADIENT_START = "#4a9eff";
const DEFAULT_GRADIENT_END = "#6bff6b";

function AccountAvatar({ account }: { account: Account }) {
  if (account.image_url) {
    return (
      <img
        className="account-card-avatar"
        src={account.image_url}
        alt={account.name}
        width={40}
        height={40}
      />
    );
  }
  return (
    <div
      className="account-card-avatar account-card-avatar--gradient"
      style={{
        background: `linear-gradient(135deg, ${account.gradient_start || DEFAULT_GRADIENT_START}, ${account.gradient_end || DEFAULT_GRADIENT_END})`,
      }}
      aria-hidden="true"
    />
  );
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
          className={`total-amount ${totalBalance >= 0 ? "positive" : "negative"}`}
        >
          R${totalBalance.toFixed(2)}
        </span>
      </div>
      <div className="accounts-grid">
        {activeAccounts.map((account) => (
          <div key={account.name} className="account-card">
            <div className="account-card-header">
              <AccountAvatar account={account} />
              <div className="account-card-info">
                <div className="account-name">{account.name}</div>
                <span className="account-currency-badge">
                  {account.currency}
                </span>
              </div>
            </div>
            <div
              className={`account-balance ${account.balance >= 0 ? "positive" : "negative"}`}
            >
              {account.balance.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
