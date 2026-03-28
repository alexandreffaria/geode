interface InstallmentFieldProps {
  months: number;
  onChange: (months: number) => void;
}

/**
 * Form field for configuring installment payments.
 * Allows the user to specify how many installments to split the amount into.
 */
export function InstallmentField({ months, onChange }: InstallmentFieldProps) {
  return (
    <div className="form-group">
      <label htmlFor="installment-months">Number of installments</label>
      <input
        id="installment-months"
        type="number"
        min={2}
        max={60}
        value={months}
        onChange={(e) =>
          onChange(Math.max(2, parseInt(e.target.value, 10) || 2))
        }
        required
      />
      <span className="field-helper-text">
        Amount will be split into {months} equal payments
      </span>
    </div>
  );
}
