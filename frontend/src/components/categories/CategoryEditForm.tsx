import type { Category } from "../../types";
import { Avatar } from "../ui/Avatar";

export interface CategoryEditFormState {
  name: string;
  parentId: string; // category ID of parent, or "" for top-level
  imageURL: string;
  gradientStart: string;
  gradientEnd: string;
}

interface CategoryEditFormProps {
  category: Category;
  form: CategoryEditFormState;
  error: string | null;
  saving: boolean;
  parentOptions: Category[];
  onChange: (field: keyof CategoryEditFormState, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function CategoryEditForm({
  category,
  form,
  error,
  saving,
  parentOptions,
  onChange,
  onSave,
  onCancel,
}: CategoryEditFormProps) {
  return (
    <div
      className="edit-form"
      role="group"
      aria-label={`Edit ${category.name}`}
    >
      <div className="edit-form-header">
        <Avatar
          name={category.name}
          gradientStart={category.gradient_start}
          gradientEnd={category.gradient_end}
          imageUrl={category.image_url || undefined}
          size={40}
          className="category-avatar"
        />
        <span className="edit-form-label">Editing category</span>
      </div>

      {error && (
        <div className="am-error" role="alert">
          {error}
        </div>
      )}

      <div className="edit-form-grid">
        {/* Type — read-only, cannot change after creation */}
        <div className="form-group">
          <label>Type</label>
          <div className="category-type-readonly">
            {category.type === "income" ? "💰 Income" : "💸 Expense"}
          </div>
        </div>

        <div className="form-group">
          <label htmlFor={`edit-name-${category.id}`}>Name</label>
          <input
            id={`edit-name-${category.id}`}
            type="text"
            value={form.name}
            onChange={(e) => onChange("name", e.target.value)}
            disabled={saving}
            autoComplete="off"
          />
        </div>

        <div className="form-group">
          <label htmlFor={`edit-parent-${category.id}`}>Parent Category</label>
          <select
            id={`edit-parent-${category.id}`}
            value={form.parentId}
            onChange={(e) => onChange("parentId", e.target.value)}
            disabled={saving}
          >
            <option value="">None (top-level)</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor={`edit-image-${category.id}`}>Image URL</label>
          <input
            id={`edit-image-${category.id}`}
            type="text"
            value={form.imageURL}
            onChange={(e) => onChange("imageURL", e.target.value)}
            disabled={saving}
            placeholder="https://..."
          />
        </div>

        <div className="form-group form-group--color">
          <label htmlFor={`edit-grad-start-${category.id}`}>
            Gradient Start
          </label>
          <div className="color-input-wrapper">
            <input
              id={`edit-grad-start-${category.id}`}
              type="color"
              value={form.gradientStart}
              onChange={(e) => onChange("gradientStart", e.target.value)}
              disabled={saving}
            />
            <span className="color-hex">{form.gradientStart}</span>
          </div>
        </div>

        <div className="form-group form-group--color">
          <label htmlFor={`edit-grad-end-${category.id}`}>Gradient End</label>
          <div className="color-input-wrapper">
            <input
              id={`edit-grad-end-${category.id}`}
              type="color"
              value={form.gradientEnd}
              onChange={(e) => onChange("gradientEnd", e.target.value)}
              disabled={saving}
            />
            <span className="color-hex">{form.gradientEnd}</span>
          </div>
        </div>
      </div>

      {/* Gradient preview */}
      <div
        className="gradient-preview"
        style={{
          background: `linear-gradient(135deg, ${form.gradientStart}, ${form.gradientEnd})`,
        }}
        aria-hidden="true"
      />

      <div className="edit-form-actions">
        <button
          type="button"
          className="btn btn--primary"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
