import { RECURRING_PRESETS } from "../../constants";
import type { RecurrenceUnit } from "../../types";

interface RecurringFieldProps {
  every: number;
  unit: RecurrenceUnit;
  onChange: (every: number, unit: RecurrenceUnit) => void;
}

export function RecurringField({ every, unit, onChange }: RecurringFieldProps) {
  const handlePresetClick = (preset: (typeof RECURRING_PRESETS)[number]) => {
    onChange(preset.every, preset.unit);
  };

  return (
    <div className="recurring-field">
      <div className="recurring-presets">
        {RECURRING_PRESETS.map((preset) => {
          const isActive = preset.every === every && preset.unit === unit;
          return (
            <button
              key={preset.label}
              type="button"
              className={`recurring-preset-btn${isActive ? " active" : ""}`}
              onClick={() => handlePresetClick(preset)}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Shown only when "Custom" preset is selected */}
      {unit === "day" && (
        <div className="recurring-custom">
          <label className="recurring-custom-label">
            Every
            <input
              type="number"
              min={1}
              value={every}
              onChange={(e) => {
                const days = Math.max(1, parseInt(e.target.value) || 1);
                onChange(days, "day");
              }}
              className="recurring-custom-input active"
            />
            day(s)
          </label>
        </div>
      )}
    </div>
  );
}
