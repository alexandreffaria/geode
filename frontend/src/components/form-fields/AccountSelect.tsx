import type { Account } from "../../types";

interface AccountSelectProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  accounts: Account[];
  disabled?: boolean;
}

/**
 * Reusable account selection dropdown component.
 * Filters out archived accounts and uses account.name as the key/value.
 */
export function AccountSelect({
  id,
  label,
  value,
  onChange,
  accounts,
  disabled,
}: AccountSelectProps) {
  // Only show non-archived accounts in the dropdown
  const activeAccounts = accounts.filter((a) => !a.archived);

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required
      >
        <option value="">Select account...</option>
        {activeAccounts.map((account) => (
          <option key={account.name} value={account.name}>
            {account.name} ({account.currency} {account.balance.toFixed(2)})
          </option>
        ))}
      </select>
    </div>
  );
}
