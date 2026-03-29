import {
  useState,
  useCallback,
  type RefObject,
  type KeyboardEvent,
} from "react";

interface AmountFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  inputRef?: RefObject<HTMLInputElement | null>;
  label?: string;
  id?: string;
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
  label = "Amount",
  id = "amount",
}: AmountFieldProps) {
  // State holds [currentCents, lastSeenExternalValue] as a tuple.
  // Storing the last-seen prop value in state (not a ref) lets us detect
  // external prop changes during render without effects or refs — the
  // React-approved "getDerivedStateFromProps" pattern for hooks.
  const [state, setState] = useState<[number, string]>(() => [
    parseToCents(value),
    value,
  ]);

  let cents = state[0];

  // If the external value prop changed, reset internal cents to match it.
  // This runs during render (no effect needed) and triggers one extra render.
  if (value !== state[1]) {
    const incoming = parseToCents(value);
    cents = incoming;
    setState([incoming, value]);
  }

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      const key = e.key;

      if (key === "Backspace") {
        e.preventDefault();
        // Read current cents from state[0] via closure over `state`
        const next = Math.floor(state[0] / 10);
        setState([next, value]);
        onChange(formatCents(next));
        return;
      }

      if (key >= "0" && key <= "9") {
        e.preventDefault();
        const digit = parseInt(key, 10);
        const next = Math.min(state[0] * 10 + digit, MAX_CENTS);
        setState([next, value]);
        onChange(formatCents(next));
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
    [onChange, state, value],
  );

  const displayValue = formatCents(cents);

  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <input
        ref={inputRef}
        id={id}
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
