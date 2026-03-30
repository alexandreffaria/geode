import { useState, useEffect } from "react";
import {
  isoToDisplay,
  displayToIso,
  isValidDisplayDate,
  expandTwoDigitYear,
} from "../../utils/dateUtils";

interface DateFieldProps {
  /** ISO date string "YYYY-MM-DD" — the internal/API value */
  value: string;
  /** Called with an ISO date string "YYYY-MM-DD" whenever the user enters a valid date */
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

/**
 * Reusable date input field component.
 *
 * Displays and accepts dates in DD/MM/YYYY format.
 * Internally converts to/from ISO (YYYY-MM-DD) for the parent component and API.
 *
 * The input uses a plain text field with:
 *  - placeholder "DD/MM/YYYY"
 *  - pattern validation for the correct format
 *  - auto-insertion of "/" separators as the user types
 */
export function DateField({
  value,
  onChange,
  disabled,
  id = "date",
}: DateFieldProps) {
  // Local display state in DD/MM/YYYY format
  const [displayValue, setDisplayValue] = useState<string>(() =>
    isoToDisplay(value),
  );

  // Sync display value when the ISO prop changes externally (e.g. edit mode load)
  useEffect(() => {
    setDisplayValue(isoToDisplay(value));
  }, [value]);

  /**
   * Auto-formats the raw input into DD/MM/YYYY as the user types.
   * Inserts "/" after the 2nd and 4th digit automatically.
   */
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value;

    // Allow the user to delete characters freely — only auto-format on forward input
    // Strip everything except digits and slashes, then rebuild
    const digitsOnly = raw.replace(/\D/g, "");

    let formatted = digitsOnly;
    if (digitsOnly.length > 2) {
      formatted = digitsOnly.slice(0, 2) + "/" + digitsOnly.slice(2);
    }
    if (digitsOnly.length > 4) {
      formatted =
        digitsOnly.slice(0, 2) +
        "/" +
        digitsOnly.slice(2, 4) +
        "/" +
        digitsOnly.slice(4, 8);
    }

    // Expand 2-digit year immediately when the user finishes typing "DD/MM/YY"
    const expanded = expandTwoDigitYear(formatted);
    setDisplayValue(expanded);

    // Only propagate to parent when we have a complete, valid date
    if (isValidDisplayDate(expanded)) {
      onChange(displayToIso(expanded));
    }
  }

  /**
   * On blur, expand a 2-digit year if present, then revert to the last valid
   * ISO value if the result is still incomplete or invalid.
   */
  function handleBlur() {
    const expanded = expandTwoDigitYear(displayValue);
    if (expanded !== displayValue) {
      setDisplayValue(expanded);
      if (isValidDisplayDate(expanded)) {
        onChange(displayToIso(expanded));
        return;
      }
    }
    if (!isValidDisplayDate(displayValue)) {
      // Revert to the current valid ISO value (or clear if none)
      setDisplayValue(isoToDisplay(value));
    }
  }

  return (
    <div className="form-group">
      <label htmlFor={id}>Date</label>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="DD/MM/YYYY"
        pattern="\d{2}/\d{2}/\d{4}"
        maxLength={10}
        disabled={disabled}
        required
        aria-label="Date (DD/MM/YYYY)"
      />
    </div>
  );
}
