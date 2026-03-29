import { PAYMENT_SCHEDULE_MODE_LABELS } from "../../constants";
import type { PaymentSchedule, PaymentScheduleMode } from "../../types";
import { InstallmentField } from "./InstallmentField";
import { RecurringField } from "./RecurringField";
import "./PaymentScheduleSelector.css";

interface PaymentScheduleSelectorProps {
  value: PaymentSchedule;
  onChange: (schedule: PaymentSchedule) => void;
  disabled?: boolean;
}

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
      onChange({ mode: "recurring", every: 1, unit: "month" });
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
                {PAYMENT_SCHEDULE_MODE_LABELS[mode]}
              </button>
            ),
          )}
        </div>
      </div>

      {value.mode === "installment" && (
        <InstallmentField
          months={value.months}
          onChange={(months) => onChange({ mode: "installment", months })}
          disabled={disabled}
        />
      )}

      {value.mode === "recurring" && (
        <RecurringField
          every={value.every}
          unit={value.unit}
          onChange={(every, unit) =>
            onChange({ mode: "recurring", every, unit })
          }
        />
      )}
    </div>
  );
}
