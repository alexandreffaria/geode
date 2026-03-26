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
 * Reusable account selection dropdown component
 */
export function AccountSelect({
  id,
  label,
  value,
  onChange,
  accounts,
  disabled,
}: AccountSelectProps) {
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
        {accounts.map((account) => (
          <option key={account.id} value={account.name}>
            {account.name} (${account.balance.toFixed(2)})
          </option>
        ))}
      </select>
    </div>
  );
}
