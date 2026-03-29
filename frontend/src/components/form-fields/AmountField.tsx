import {
  useState,
  useEffect,
  useCallback,
  type RefObject,
  type KeyboardEvent,
} from "react";

interface AmountFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
}

/** Maximum allowed value in cents: 9,999,999.99 */
const MAX_CENTS = 999_999_999;

/**
 * Parses a decimal string (e.g. "150.5", "150.50", "0", "") into an integer
 * number of cents. Returns 0 for empty / invalid input.
 */
function parseToCents(value: string): number {
  if (!value || value === "") return 0;
  const num = parseFloat(value);
  if (isNaN(num) || num < 0) return 0;
  // Round to avoid floating-point drift (e.g. 1.005 * 100 = 100.50000...01)
  return Math.min(Math.round(num * 100), MAX_CENTS);
}

/**
 * Formats an integer cents value to a decimal string with exactly 2 decimal
 * places (e.g. 1523 → "15.23", 5 → "0.05").
 */
function formatCents(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * Amount input field with calculator-style (POS terminal) behaviour.
 *
 * Digits are entered from the right (cents position) and shift existing digits
 * left. Backspace removes the rightmost digit and shifts remaining digits right.
 *
 * Examples (sequential key presses):
 *   "1" → "0.01"   "2" → "0.12"   "3" → "1.23"   "4" → "12.34"
 *   Backspace → "1.23"
 */
export function AmountField({
  value,
  onChange,
  disabled,
  inputRef,
}: AmountFieldProps) {
  // Internal state: integer number of cents
  const [cents, setCents] = useState<number>(() => parseToCents(value));

  // Sync internal state when the parent resets or changes the value from
  // outside (e.g. switching to edit mode with an existing transaction).
  useEffect(() => {
    const incoming = parseToCents(value);
    // Only update if the parent value differs from what we'd produce ourselves.
    // This prevents overwriting the user's in-progress input on every render.
    setCents((prev) => {
      const currentFormatted = formatCents(prev);
      const incomingFormatted = formatCents(incoming);
      return currentFormatted === incomingFormatted ? prev : incoming;
    });
  }, [value]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const key = e.key;

      if (key === "Backspace") {
        e.preventDefault();
        setCents((prev) => {
          const next = Math.floor(prev / 10);
          const formatted = formatCents(next);
          onChange(formatted);
          return next;
        });
        return;
      }

      if (key >= "0" && key <= "9") {
        e.preventDefault();
        const digit = parseInt(key, 10);
        setCents((prev) => {
          const next = Math.min(prev * 10 + digit, MAX_CENTS);
          const formatted = formatCents(next);
          onChange(formatted);
          return next;
        });
        return;
      }

      // Block all other keys except navigation / accessibility keys
      const allowed = [
        "Tab",
        "Enter",
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "Home",
        "End",
      ];
      if (!allowed.includes(key)) {
        e.preventDefault();
      }
    },
    [onChange],
  );

  const displayValue = formatCents(cents);

  return (
    <div className="form-group">
      <label htmlFor="amount">Amount</label>
      <input
        ref={inputRef}
        id="amount"
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={() => {
          /* Controlled via onKeyDown — suppress React's synthetic onChange */
        }}
        onKeyDown={handleKeyDown}
        placeholder="0.00"
        disabled={disabled}
        required
        // Enforce minimum value of 0.01 via custom validity
        onInvalid={(e) => {
          const input = e.currentTarget;
          if (cents === 0) {
            input.setCustomValidity("Please enter an amount greater than 0.");
          }
        }}
        onInput={(e) => {
          // Clear custom validity so the browser re-evaluates on next submit
          e.currentTarget.setCustomValidity("");
        }}
        // Prevent paste / drag-drop of arbitrary text
        onPaste={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
      />
    </div>
  );
}
