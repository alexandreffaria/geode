interface DescriptionFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * Reusable description input field component
 */
export function DescriptionField({
  value,
  onChange,
  disabled,
}: DescriptionFieldProps) {
  return (
    <div className="form-group">
      <label htmlFor="description">Description (optional)</label>
      <input
        id="description"
        type="text"
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Transaction description"
        disabled={disabled}
      />
    </div>
  );
}
