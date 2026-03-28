import type { Category } from "../../types";
import { Avatar } from "../ui/Avatar";

interface CategoryListItemProps {
  category: Category;
  isDeleting: boolean;
  onEdit: (category: Category) => void;
  onDelete: (name: string) => void;
}

export function CategoryListItem({
  category,
  isDeleting,
  onEdit,
  onDelete,
}: CategoryListItemProps) {
  return (
    <div className="category-item-row">
      <Avatar
        name={category.name}
        gradientStart={category.gradient_start}
        gradientEnd={category.gradient_end}
        imageUrl={category.image_url || undefined}
        size={48}
        className="category-avatar"
      />

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
          onClick={() => onEdit(category)}
          aria-label={`Edit ${category.name}`}
          title="Edit category"
        >
          ✏️
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--delete"
          onClick={() => onDelete(category.name)}
          disabled={isDeleting}
          aria-label={`Delete ${category.name}`}
          title="Delete category"
        >
          {isDeleting ? "…" : "🗑️"}
        </button>
      </div>
    </div>
  );
}
