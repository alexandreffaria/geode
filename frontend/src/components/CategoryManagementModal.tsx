import { useEffect, useRef, useState } from "react";
import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "../types";
import "./CategoryManagementModal.css";

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCreateCategory: (data: CreateCategoryRequest) => Promise<void>;
  onUpdateCategory: (
    name: string,
    data: UpdateCategoryRequest,
  ) => Promise<void>;
  onDeleteCategory: (name: string) => Promise<void>;
}

interface EditFormState {
  name: string;
  parentName: string;
  imageURL: string;
  gradientStart: string;
  gradientEnd: string;
}

const DEFAULT_GRADIENT_START = "#4a9eff";
const DEFAULT_GRADIENT_END = "#6bff6b";

function buildEditFormState(category: Category): EditFormState {
  return {
    name: category.name,
    parentName: category.parent_name ?? "",
    imageURL: category.image_url,
    gradientStart: category.gradient_start || DEFAULT_GRADIENT_START,
    gradientEnd: category.gradient_end || DEFAULT_GRADIENT_END,
  };
}

interface CategoryAvatarProps {
  category: Category;
  size?: number;
}

function CategoryAvatar({ category, size = 48 }: CategoryAvatarProps) {
  if (category.image_url) {
    return (
      <img
        className="category-avatar"
        src={category.image_url}
        alt={category.name}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="category-avatar category-avatar--gradient"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${category.gradient_start || DEFAULT_GRADIENT_START}, ${category.gradient_end || DEFAULT_GRADIENT_END})`,
      }}
      aria-hidden="true"
    />
  );
}

/**
 * Build a sorted tree display order:
 * top-level categories alphabetically, then each parent's children alphabetically below it.
 */
function buildTreeOrder(categories: Category[]): Category[] {
  const topLevel = categories
    .filter((c) => !c.parent_name)
    .sort((a, b) => a.name.localeCompare(b.name));

  const result: Category[] = [];
  for (const parent of topLevel) {
    result.push(parent);
    const children = categories
      .filter((c) => c.parent_name === parent.name)
      .sort((a, b) => a.name.localeCompare(b.name));
    result.push(...children);
  }

  // Also include orphaned children (parent doesn't exist) at the end
  const inResult = new Set(result.map((c) => c.name));
  const orphans = categories
    .filter((c) => !inResult.has(c.name))
    .sort((a, b) => a.name.localeCompare(b.name));
  result.push(...orphans);

  return result;
}

/**
 * Get all descendant names of a category (to prevent circular parent selection)
 */
function getDescendantNames(
  categoryName: string,
  allCategories: Category[],
): Set<string> {
  const descendants = new Set<string>();
  const queue = [categoryName];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = allCategories.filter((c) => c.parent_name === current);
    for (const child of children) {
      if (!descendants.has(child.name)) {
        descendants.add(child.name);
        queue.push(child.name);
      }
    }
  }
  return descendants;
}

const DEFAULT_ADD_FORM: CreateCategoryRequest = {
  name: "",
  type: "expense",
  parentName: null,
  imageURL: "",
  gradientStart: DEFAULT_GRADIENT_START,
  gradientEnd: DEFAULT_GRADIENT_END,
};

export function CategoryManagementModal({
  isOpen,
  onClose,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoryManagementModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Which category is currently being edited (by name)
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Add category form state
  const [addForm, setAddForm] =
    useState<CreateCategoryRequest>(DEFAULT_ADD_FORM);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  // Deleting state
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  // Handle ESC key press + tab trap
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }

      if (e.key === "Tab") {
        const focusableElements =
          modalRef.current?.querySelectorAll<HTMLElement>(
            'button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
          );

        if (focusableElements && focusableElements.length > 0) {
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      const previouslyFocused = document.activeElement as HTMLElement;

      setTimeout(() => {
        const firstInput = modalRef.current?.querySelector<HTMLElement>(
          "input, select, textarea",
        );
        firstInput?.focus();
      }, 100);

      return () => {
        previouslyFocused?.focus();
      };
    }
  }, [isOpen]);

  // Reset add form when modal opens
  useEffect(() => {
    if (isOpen) {
      setAddForm(DEFAULT_ADD_FORM);
      setAddError(null);
      setEditingCategory(null);
      setEditForm(null);
      setEditError(null);
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // --- Edit handlers ---
  const handleStartEdit = (category: Category) => {
    setEditingCategory(category.name);
    setEditForm(buildEditFormState(category));
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditForm(null);
    setEditError(null);
  };

  const handleEditFormChange = (field: keyof EditFormState, value: string) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleSaveEdit = async () => {
    if (!editForm || !editingCategory) return;

    const trimmedName = editForm.name.trim();
    if (!trimmedName) {
      setEditError("Category name is required.");
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      const payload: UpdateCategoryRequest = {
        name: trimmedName,
        parent_name: editForm.parentName, // "" means clear parent
        imageURL: editForm.imageURL,
        gradientStart: editForm.gradientStart,
        gradientEnd: editForm.gradientEnd,
      };
      await onUpdateCategory(editingCategory, payload);
      setEditingCategory(null);
      setEditForm(null);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to save changes.",
      );
    } finally {
      setEditSaving(false);
    }
  };

  // --- Delete handler ---
  const handleDelete = async (name: string) => {
    if (!window.confirm(`Delete category "${name}"? This cannot be undone.`))
      return;
    setDeletingCategory(name);
    try {
      await onDeleteCategory(name);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete category.");
    } finally {
      setDeletingCategory(null);
    }
  };

  // --- Add handlers ---
  const handleAddFormChange = (
    field: keyof CreateCategoryRequest,
    value: string | null,
  ) => {
    if (field === "type") {
      // When type changes, reset parentName since parent options change
      setAddForm((prev) => ({
        ...prev,
        type: value as "income" | "expense",
        parentName: null,
      }));
    } else {
      setAddForm((prev) => ({ ...prev, [field]: value }));
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = (addForm.name as string).trim();
    if (!trimmedName) {
      setAddError("Category name is required.");
      return;
    }

    setAddSaving(true);
    setAddError(null);
    try {
      await onCreateCategory({
        ...addForm,
        name: trimmedName,
        parentName: addForm.parentName || null,
      });
      setAddForm({ ...DEFAULT_ADD_FORM, type: addForm.type });
    } catch (err) {
      setAddError(
        err instanceof Error ? err.message : "Failed to create category.",
      );
    } finally {
      setAddSaving(false);
    }
  };

  if (!isOpen) return null;

  const incomeCategories = buildTreeOrder(
    categories.filter((c) => c.type === "income"),
  );
  const expenseCategories = buildTreeOrder(
    categories.filter((c) => c.type === "expense"),
  );

  const renderCategoryItem = (category: Category) => {
    const isChild = !!category.parent_name;
    // For parent select in edit form: same type, not itself, not its descendants
    const editParentOptions = categories
      .filter((c) => {
        if (c.type !== category.type) return false;
        if (c.name === category.name) return false;
        const descendants = getDescendantNames(category.name, categories);
        return !descendants.has(c.name);
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return (
      <li
        key={category.name}
        className={`category-item${isChild ? " category-item--child" : ""}`}
      >
        {editingCategory === category.name && editForm ? (
          /* ---- Inline edit form ---- */
          <div
            className="edit-form"
            role="group"
            aria-label={`Edit ${category.name}`}
          >
            <div className="edit-form-header">
              <CategoryAvatar category={category} size={40} />
              <span className="edit-form-label">Editing category</span>
            </div>

            {editError && (
              <div className="am-error" role="alert">
                {editError}
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
                <label htmlFor={`edit-name-${category.name}`}>Name</label>
                <input
                  id={`edit-name-${category.name}`}
                  type="text"
                  value={editForm.name}
                  onChange={(e) => handleEditFormChange("name", e.target.value)}
                  disabled={editSaving}
                  autoComplete="off"
                />
              </div>

              <div className="form-group">
                <label htmlFor={`edit-parent-${category.name}`}>
                  Parent Category
                </label>
                <select
                  id={`edit-parent-${category.name}`}
                  value={editForm.parentName}
                  onChange={(e) =>
                    handleEditFormChange("parentName", e.target.value)
                  }
                  disabled={editSaving}
                >
                  <option value="">None (top-level)</option>
                  {editParentOptions.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor={`edit-image-${category.name}`}>Image URL</label>
                <input
                  id={`edit-image-${category.name}`}
                  type="text"
                  value={editForm.imageURL}
                  onChange={(e) =>
                    handleEditFormChange("imageURL", e.target.value)
                  }
                  disabled={editSaving}
                  placeholder="https://..."
                />
              </div>

              <div className="form-group form-group--color">
                <label htmlFor={`edit-grad-start-${category.name}`}>
                  Gradient Start
                </label>
                <div className="color-input-wrapper">
                  <input
                    id={`edit-grad-start-${category.name}`}
                    type="color"
                    value={editForm.gradientStart}
                    onChange={(e) =>
                      handleEditFormChange("gradientStart", e.target.value)
                    }
                    disabled={editSaving}
                  />
                  <span className="color-hex">{editForm.gradientStart}</span>
                </div>
              </div>

              <div className="form-group form-group--color">
                <label htmlFor={`edit-grad-end-${category.name}`}>
                  Gradient End
                </label>
                <div className="color-input-wrapper">
                  <input
                    id={`edit-grad-end-${category.name}`}
                    type="color"
                    value={editForm.gradientEnd}
                    onChange={(e) =>
                      handleEditFormChange("gradientEnd", e.target.value)
                    }
                    disabled={editSaving}
                  />
                  <span className="color-hex">{editForm.gradientEnd}</span>
                </div>
              </div>
            </div>

            {/* Gradient preview */}
            <div
              className="gradient-preview"
              style={{
                background: `linear-gradient(135deg, ${editForm.gradientStart}, ${editForm.gradientEnd})`,
              }}
              aria-hidden="true"
            />

            <div className="edit-form-actions">
              <button
                type="button"
                className="btn btn--primary"
                onClick={handleSaveEdit}
                disabled={editSaving}
              >
                {editSaving ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                onClick={handleCancelEdit}
                disabled={editSaving}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          /* ---- Normal category row ---- */
          <div className="category-item-row">
            <CategoryAvatar category={category} />

            <div className="category-item-info">
              <span className="category-item-name">{category.name}</span>
              {category.parent_name && (
                <div className="category-item-meta">
                  <span className="parent-badge">↳ {category.parent_name}</span>
                </div>
              )}
            </div>

            <div className="category-item-actions">
              <button
                type="button"
                className="icon-btn icon-btn--edit"
                onClick={() => handleStartEdit(category)}
                aria-label={`Edit ${category.name}`}
                title="Edit category"
              >
                ✏️
              </button>
              <button
                type="button"
                className="icon-btn icon-btn--delete"
                onClick={() => handleDelete(category.name)}
                disabled={deletingCategory === category.name}
                aria-label={`Delete ${category.name}`}
                title="Delete category"
              >
                {deletingCategory === category.name ? "…" : "🗑️"}
              </button>
            </div>
          </div>
        )}
      </li>
    );
  };

  // Parent options for the add form — same type as addForm.type
  const addParentOptions = categories
    .filter((c) => c.type === addForm.type)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-modal-title"
      onClick={handleBackdropClick}
    >
      <div
        className="modal-container category-management-modal"
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <h2 id="category-modal-title" className="modal-title">
            Manage Categories
          </h2>
          <button
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close modal"
            type="button"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Category list section */}
          <section className="am-section">
            <h3 className="am-section-title">Your Categories</h3>
            {categories.length === 0 ? (
              <p className="am-empty-state">
                No categories yet. Add one below.
              </p>
            ) : (
              <>
                {/* Income subsection */}
                <div className="am-type-subsection">
                  <h4 className="am-type-heading">💰 Income Categories</h4>
                  {incomeCategories.length === 0 ? (
                    <p className="am-empty-state am-empty-state--sub">
                      No income categories yet.
                    </p>
                  ) : (
                    <ul
                      className="am-category-list"
                      aria-label="Income category list"
                    >
                      {incomeCategories.map(renderCategoryItem)}
                    </ul>
                  )}
                </div>

                <div className="am-type-separator" aria-hidden="true" />

                {/* Expense subsection */}
                <div className="am-type-subsection">
                  <h4 className="am-type-heading">💸 Expense Categories</h4>
                  {expenseCategories.length === 0 ? (
                    <p className="am-empty-state am-empty-state--sub">
                      No expense categories yet.
                    </p>
                  ) : (
                    <ul
                      className="am-category-list"
                      aria-label="Expense category list"
                    >
                      {expenseCategories.map(renderCategoryItem)}
                    </ul>
                  )}
                </div>
              </>
            )}
          </section>

          {/* Divider */}
          <hr className="am-divider" />

          {/* Add category form */}
          <section className="am-section">
            <h3 className="am-section-title">Add New Category</h3>

            {addError && (
              <div className="am-error" role="alert">
                {addError}
              </div>
            )}

            <form
              className="add-category-form"
              onSubmit={handleAddCategory}
              noValidate
            >
              <div className="add-form-grid">
                <div className="form-group">
                  <label htmlFor="add-cat-type">
                    Type <span className="required">*</span>
                  </label>
                  <select
                    id="add-cat-type"
                    value={addForm.type}
                    onChange={(e) =>
                      handleAddFormChange("type", e.target.value)
                    }
                    disabled={addSaving}
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
                    value={addForm.name as string}
                    onChange={(e) =>
                      handleAddFormChange("name", e.target.value)
                    }
                    disabled={addSaving}
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
                    value={addForm.parentName ?? ""}
                    onChange={(e) =>
                      handleAddFormChange("parentName", e.target.value || null)
                    }
                    disabled={addSaving}
                  >
                    <option value="">None (top-level)</option>
                    {addParentOptions.map((c) => (
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
                    value={addForm.imageURL as string}
                    onChange={(e) =>
                      handleAddFormChange("imageURL", e.target.value)
                    }
                    disabled={addSaving}
                    placeholder="https://..."
                  />
                </div>

                <div className="form-group form-group--color">
                  <label htmlFor="add-cat-grad-start">Gradient Start</label>
                  <div className="color-input-wrapper">
                    <input
                      id="add-cat-grad-start"
                      type="color"
                      value={addForm.gradientStart as string}
                      onChange={(e) =>
                        handleAddFormChange("gradientStart", e.target.value)
                      }
                      disabled={addSaving}
                    />
                    <span className="color-hex">
                      {addForm.gradientStart as string}
                    </span>
                  </div>
                </div>

                <div className="form-group form-group--color">
                  <label htmlFor="add-cat-grad-end">Gradient End</label>
                  <div className="color-input-wrapper">
                    <input
                      id="add-cat-grad-end"
                      type="color"
                      value={addForm.gradientEnd as string}
                      onChange={(e) =>
                        handleAddFormChange("gradientEnd", e.target.value)
                      }
                      disabled={addSaving}
                    />
                    <span className="color-hex">
                      {addForm.gradientEnd as string}
                    </span>
                  </div>
                </div>
              </div>

              {/* Gradient preview */}
              <div
                className="gradient-preview"
                style={{
                  background: `linear-gradient(135deg, ${addForm.gradientStart as string}, ${addForm.gradientEnd as string})`,
                }}
                aria-hidden="true"
              />

              <div className="add-form-actions">
                <button
                  type="submit"
                  className="btn btn--primary"
                  disabled={addSaving}
                >
                  {addSaving ? "Adding…" : "Add Category"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
