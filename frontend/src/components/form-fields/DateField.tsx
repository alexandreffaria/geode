interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Reusable date input field component
 */
export function DateField({ value, onChange, disabled }: DateFieldProps) {
  return (
    <div className="form-group">
      <label htmlFor="date">Date</label>
      <input
        id="date"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={new Date().toISOString().slice(0, 10)}
        disabled={disabled}
        required
      />
    </div>
  );
}
