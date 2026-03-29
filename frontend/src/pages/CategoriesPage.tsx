import { useState } from "react";
import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "../types";
import {
  CategoryEditForm,
  type CategoryEditFormState,
} from "../components/categories/CategoryEditForm";
import { CategoryListItem } from "../components/categories/CategoryListItem";
import { AddCategoryForm } from "../components/categories/AddCategoryForm";
import { DEFAULT_GRADIENT_END, DEFAULT_GRADIENT_START } from "../constants";
import "../components/CategoryManagementModal.css";
import "./CategoriesPage.css";

interface CategoriesPageProps {
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

  const inResult = new Set(result.map((c) => c.id));
  const orphans = categories
    .filter((c) => !inResult.has(c.id))
    .sort((a, b) => a.name.localeCompare(b.name));
  result.push(...orphans);

  return result;
}

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

export function CategoriesPage({
  categories,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
}: CategoriesPageProps) {
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CategoryEditFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [addForm, setAddForm] =
    useState<CreateCategoryRequest>(DEFAULT_ADD_FORM);
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

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
        parent_id: editForm.parentId || null,
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

  const incomeCategories = buildTreeOrder(
    categories.filter((c) => c.type === "income"),
  );
  const expenseCategories = buildTreeOrder(
    categories.filter((c) => c.type === "expense"),
  );

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
    <div className="categories-page">
      <div className="categories-page-header">
        <h1 className="categories-page-title">Categories</h1>
      </div>

      <div className="categories-page-body">
        <section className="am-section">
          <h2 className="am-section-title">Your Categories</h2>
          {categories.length === 0 ? (
            <p className="am-empty-state">No categories yet. Add one below.</p>
          ) : (
            <>
              <div className="am-type-subsection">
                <h3 className="am-type-heading">💰 Income Categories</h3>
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
                <h3 className="am-type-heading">💸 Expense Categories</h3>
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

        <section className="am-section">
          <h2 className="am-section-title">Add Category</h2>
          <AddCategoryForm
            form={addForm}
            error={addError}
            saving={addSaving}
            parentOptions={addParentOptions}
            onChange={handleAddFormChange}
            onSubmit={handleAddCategory}
          />
        </section>
      </div>
    </div>
  );
}
