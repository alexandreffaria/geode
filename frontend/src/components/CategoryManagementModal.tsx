import { useEffect, useRef, useState } from "react";
import { useModalAccessibility } from "../hooks/useModalAccessibility";
import { DEFAULT_GRADIENT_END, DEFAULT_GRADIENT_START } from "../constants";
import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "../types";
import {
  CategoryEditForm,
  type CategoryEditFormState,
} from "./categories/CategoryEditForm";
import { CategoryListItem } from "./categories/CategoryListItem";
import { AddCategoryForm } from "./categories/AddCategoryForm";
import "./CategoryManagementModal.css";

interface CategoryManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onCreateCategory: (data: CreateCategoryRequest) => Promise<void>;
  onUpdateCategory: (id: string, data: UpdateCategoryRequest) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
}

const DEFAULT_ADD_FORM: CreateCategoryRequest = {
  name: "",
  type: "expense",
  parent_id: null,
  imageURL: "",
  gradientStart: DEFAULT_GRADIENT_START,
  gradientEnd: DEFAULT_GRADIENT_END,
};

function buildEditFormState(category: Category): CategoryEditFormState {
  return {
    name: category.name,
    parentId: category.parent_id ?? "",
    imageURL: category.image_url,
    gradientStart: category.gradient_start || DEFAULT_GRADIENT_START,
    gradientEnd: category.gradient_end || DEFAULT_GRADIENT_END,
  };
}

/**
 * Build a sorted tree display order:
 * top-level categories alphabetically, then each parent's children alphabetically below it.
 */
function buildTreeOrder(categories: Category[]): Category[] {
  const topLevel = categories
    .filter((c) => !c.parent_id)
    .sort((a, b) => a.name.localeCompare(b.name));

  const result: Category[] = [];
  for (const parent of topLevel) {
    result.push(parent);
    const children = categories
      .filter((c) => c.parent_id === parent.id)
      .sort((a, b) => a.name.localeCompare(b.name));
    result.push(...children);
  }

  // Also include orphaned children (parent doesn't exist) at the end
  const inResult = new Set(result.map((c) => c.id));
  const orphans = categories
    .filter((c) => !inResult.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  result.push(...orphans);

  return result;
}

/**
 * Get all descendant IDs of a category (to prevent circular parent selection)
 */
function getDescendantIds(
  categoryId: string,
  allCategories: Category[],
): Set<string> {
  const descendants = new Set<string>();
  const queue = [categoryId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = allCategories.filter((c) => c.parent_id === current);
    for (const child of children) {
      if (!descendants.has(child.id)) {
        descendants.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return descendants;
}

export function CategoryManagementModal({
  isOpen,
  onClose,
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoryManagementModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // editingCategory stores the category ID being edited (not name)
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CategoryEditFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [addForm, setAddForm] =
    useState<CreateCategoryRequest>(DEFAULT_ADD_FORM);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  // deletingCategory stores the category ID being deleted
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  useModalAccessibility(isOpen, onClose, modalRef);

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
    if (e.target === e.currentTarget) onClose();
  };

  // --- Edit handlers ---
  const handleStartEdit = (category: Category) => {
    setEditingCategory(category.id);
    setEditForm(buildEditFormState(category));
    setEditError(null);
  };

  const handleCancelEdit = () => {
    setEditingCategory(null);
    setEditForm(null);
    setEditError(null);
  };

  const handleEditFormChange = (
    field: keyof CategoryEditFormState,
    value: string,
  ) => {
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
      await onUpdateCategory(editingCategory, {
        name: trimmedName,
        parent_id: editForm.parentId || null, // "" means clear parent → send null
        imageURL: editForm.imageURL,
        gradientStart: editForm.gradientStart,
        gradientEnd: editForm.gradientEnd,
      });
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
  const handleDelete = async (id: string) => {
    const category = categories.find((c) => c.id === id);
    const displayName = category?.name ?? id;
    if (
      !window.confirm(
        `Delete category "${displayName}"? This cannot be undone.`,
      )
    )
      return;
    setDeletingCategory(id);
    try {
      await onDeleteCategory(id);
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
      // When type changes, reset parent_id since parent options change
      setAddForm((prev) => ({
        ...prev,
        type: value as "income" | "expense",
        parent_id: null,
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
        parent_id: addForm.parent_id || null,
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

  // Parent options for the add form — same type as addForm.type
  const addParentOptions = categories
    .filter((c) => c.type === addForm.type)
    .sort((a, b) => a.name.localeCompare(b.name));

  const renderCategoryItem = (category: Category) => {
    const isChild = !!category.parent_id;
    const descendants = getDescendantIds(category.id, categories);
    const editParentOptions = categories
      .filter((c) => {
        if (c.type !== category.type) return false;
        if (c.id === category.id) return false;
        return !descendants.has(c.id);
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return (
      <li
        key={category.id}
        className={`category-item${isChild ? " category-item--child" : ""}`}
      >
        {editingCategory === category.id && editForm ? (
          <CategoryEditForm
            category={category}
            form={editForm}
            error={editError}
            saving={editSaving}
            parentOptions={editParentOptions}
            onChange={handleEditFormChange}
            onSave={handleSaveEdit}
            onCancel={handleCancelEdit}
          />
        ) : (
          <CategoryListItem
            category={category}
            isDeleting={deletingCategory === category.id}
            onEdit={handleStartEdit}
            onDelete={handleDelete}
          />
        )}
      </li>
    );
  };

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

        <div className="modal-body">
          <section className="am-section">
            <h3 className="am-section-title">Your Categories</h3>
            {categories.length === 0 ? (
              <p className="am-empty-state">
                No categories yet. Add one below.
              </p>
            ) : (
              <>
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

          <hr className="am-divider" />

          <AddCategoryForm
            form={addForm}
            error={addError}
            saving={addSaving}
            parentOptions={addParentOptions}
            onChange={handleAddFormChange}
            onSubmit={handleAddCategory}
          />
        </div>
      </div>
    </div>
  );
}
