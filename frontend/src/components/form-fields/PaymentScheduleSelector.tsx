import type { PaymentSchedule, PaymentScheduleMode } from "../../types";
import { InstallmentField } from "./InstallmentField";
import { RecurringField } from "./RecurringField";
import "./PaymentScheduleSelector.css";

interface PaymentScheduleSelectorProps {
  value: PaymentSchedule;
  onChange: (schedule: PaymentSchedule) => void;
  disabled?: boolean;
}

const MODE_LABELS: Record<PaymentScheduleMode, string> = {
  none: "One-time",
  installment: "Installments",
  recurring: "Recurring",
};

/**
 * Composite component for selecting a payment schedule mode and configuring it.
 * Shows a toggle button group for mode selection, then renders the appropriate sub-field.
 */
export function PaymentScheduleSelector({
  value,
  onChange,
  disabled,
}: PaymentScheduleSelectorProps) {
  const handleModeChange = (mode: PaymentScheduleMode) => {
    if (mode === "none") {
      onChange({ mode: "none" });
    } else if (mode === "installment") {
      onChange({ mode: "installment", months: 2 });
    } else {
      onChange({ mode: "recurring", every_months: 1 });
    }
  };

  return (
    <div className="payment-schedule-section">
      <div className="form-group">
        <label>Payment Schedule</label>
        <div className="schedule-type-selector">
          {(["none", "installment", "recurring"] as PaymentScheduleMode[]).map(
            (mode) => (
              <button
                key={mode}
                type="button"
                className={`schedule-type-btn ${value.mode === mode ? "active" : ""}`}
                onClick={() => handleModeChange(mode)}
                disabled={disabled}
              >
                {MODE_LABELS[mode]}
              </button>
            ),
          )}
        </div>
      </div>

      {value.mode === "installment" && (
        <InstallmentField
          months={value.months}
          onChange={(months) => onChange({ mode: "installment", months })}
        />
      )}

      {value.mode === "recurring" && (
        <RecurringField
          everyMonths={value.every_months}
          onChange={(every_months) =>
            onChange({ mode: "recurring", every_months })
          }
        />
      )}
    </div>
  );
}
