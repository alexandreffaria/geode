interface DateFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

/**
 * Reusable date input field component
 */
export function DateField({
  value,
  onChange,
  disabled,
  id = "date",
}: DateFieldProps) {
  return (
    <div className="form-group">
      <label htmlFor={id}>Date</label>
      <input
        id={id}
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
