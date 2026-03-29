import { RECURRING_PRESETS } from "../../constants";
import type { RecurrenceUnit } from "../../types";

interface RecurringFieldProps {
  every: number;
  unit: RecurrenceUnit;
  onChange: (every: number, unit: RecurrenceUnit) => void;
}

export function RecurringField({ every, unit, onChange }: RecurringFieldProps) {
  // Determine which preset is active (if any)
  const activePreset = RECURRING_PRESETS.find(
    (p) => p.label !== "Custom" && p.every === every && p.unit === unit,
  );
  const isCustom = !activePreset;

  const handlePresetClick = (preset: (typeof RECURRING_PRESETS)[number]) => {
    onChange(preset.every, preset.unit);
  };

  return (
    <div className="recurring-field">
      <div className="recurring-presets">
        {RECURRING_PRESETS.map((preset) => {
          const isActive =
            preset.label === "Custom"
              ? isCustom
              : preset.every === every && preset.unit === unit;
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
      {isCustom && (
        <div className="recurring-custom">
          <label className="recurring-custom-label">
            Every
            <input
              type="number"
              min={1}
              max={120}
              value={every}
              onChange={(e) =>
                onChange(Math.max(1, parseInt(e.target.value) || 1), "month")
              }
              className="recurring-custom-input"
            />
            month(s)
          </label>
        </div>
      )}
    </div>
  );
}
