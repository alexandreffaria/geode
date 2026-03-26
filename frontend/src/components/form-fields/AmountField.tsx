interface AmountFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Reusable amount input field component
 */
export function AmountField({ value, onChange, disabled }: AmountFieldProps) {
  return (
    <div className="form-group">
      <label htmlFor="amount">Amount</label>
      <input
        id="amount"
        type="number"
        step="0.01"
        min="0.01"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0.00"
        disabled={disabled}
        required
      />
    </div>
  );
}
