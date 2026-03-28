interface RecurringFieldProps {
  everyMonths: number;
  onChange: (everyMonths: number) => void;
  disabled?: boolean;
}

/**
 * Form field for configuring recurring payments.
 * Allows the user to specify how often (in months) the transaction repeats.
 */
export function RecurringField({
  everyMonths,
  onChange,
  disabled,
}: RecurringFieldProps) {
  return (
    <div className="form-group">
      <label htmlFor="recurring-months">Repeat every</label>
      <div className="recurring-input-row">
        <input
          id="recurring-months"
          type="number"
          min={1}
          max={24}
          value={everyMonths}
          onChange={(e) =>
            onChange(Math.max(1, parseInt(e.target.value, 10) || 1))
          }
          disabled={disabled}
          required
        />
        <span className="recurring-unit-label">month(s)</span>
      </div>
      <span className="field-helper-text">
        Transaction will repeat every {everyMonths} month(s)
      </span>
    </div>
  );
}
