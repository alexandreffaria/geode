import type { Category, CreateCategoryRequest } from "../../types";

interface AddCategoryFormProps {
  form: CreateCategoryRequest;
  error: string | null;
  saving: boolean;
  parentOptions: Category[];
  onChange: (field: keyof CreateCategoryRequest, value: string | null) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddCategoryForm({
  form,
  error,
  saving,
  parentOptions,
  onChange,
  onSubmit,
}: AddCategoryFormProps) {
  return (
    <section className="am-section">
      <h3 className="am-section-title">Add New Category</h3>

      {error && (
        <div className="am-error" role="alert">
          {error}
        </div>
      )}

      <form className="add-category-form" onSubmit={onSubmit} noValidate>
        <div className="add-form-grid">
          <div className="form-group">
            <label htmlFor="add-cat-type">
              Type <span className="required">*</span>
            </label>
            <select
              id="add-cat-type"
              value={form.type}
              onChange={(e) => onChange("type", e.target.value)}
              disabled={saving}
            >
              <option value="expense">💸 Expense</option>
              <option value="income">💰 Income</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="add-cat-name">
              Name <span className="required">*</span>
            </label>
            <input
              id="add-cat-name"
              type="text"
              value={form.name as string}
              onChange={(e) => onChange("name", e.target.value)}
              disabled={saving}
              placeholder="e.g. Groceries"
              autoComplete="off"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="add-cat-parent">
              Parent Category <span className="optional">(optional)</span>
            </label>
            <select
              id="add-cat-parent"
              value={form.parentName ?? ""}
              onChange={(e) => onChange("parentName", e.target.value || null)}
              disabled={saving}
            >
              <option value="">None (top-level)</option>
              {parentOptions.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="add-cat-image">
              Image URL <span className="optional">(optional)</span>
            </label>
            <input
              id="add-cat-image"
              type="text"
              value={form.imageURL as string}
              onChange={(e) => onChange("imageURL", e.target.value)}
              disabled={saving}
              placeholder="https://..."
            />
          </div>

          <div className="form-group form-group--color">
            <label htmlFor="add-cat-grad-start">Gradient Start</label>
            <div className="color-input-wrapper">
              <input
                id="add-cat-grad-start"
                type="color"
                value={form.gradientStart as string}
                onChange={(e) => onChange("gradientStart", e.target.value)}
                disabled={saving}
              />
              <span className="color-hex">{form.gradientStart as string}</span>
            </div>
          </div>

          <div className="form-group form-group--color">
            <label htmlFor="add-cat-grad-end">Gradient End</label>
            <div className="color-input-wrapper">
              <input
                id="add-cat-grad-end"
                type="color"
                value={form.gradientEnd as string}
                onChange={(e) => onChange("gradientEnd", e.target.value)}
                disabled={saving}
              />
              <span className="color-hex">{form.gradientEnd as string}</span>
            </div>
          </div>
        </div>

        {/* Gradient preview */}
        <div
          className="gradient-preview"
          style={{
            background: `linear-gradient(135deg, ${form.gradientStart as string}, ${form.gradientEnd as string})`,
          }}
          aria-hidden="true"
        />

        <div className="add-form-actions">
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Adding…" : "Add Category"}
          </button>
        </div>
      </form>
    </section>
  );
}
