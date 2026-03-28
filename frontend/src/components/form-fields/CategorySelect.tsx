import { useState, useEffect, useRef, useCallback } from "react";
import type { Category } from "../../types";
import "./CategorySelect.css";

interface CategorySelectProps {
  value: string;
  onChange: (value: string) => void;
  categories: Category[];
  transactionType: "purchase" | "earning";
  disabled?: boolean;
}

function getCategoryDisplayName(
  category: Category,
  allCategories: Category[],
): string {
  if (category.parent_name) {
    const parent = allCategories.find((c) => c.name === category.parent_name);
    if (parent) {
      return `${parent.name} > ${category.name}`;
    }
  }
  return category.name;
}

const DEFAULT_GRADIENT_START = "#4a9eff";
const DEFAULT_GRADIENT_END = "#6bff6b";

interface CategoryAvatarProps {
  category: Category;
  size?: number;
}

function CategoryAvatar({ category, size = 24 }: CategoryAvatarProps) {
  if (category.image_url) {
    return (
      <img
        className="category-select-avatar"
        src={category.image_url}
        alt={category.name}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="category-select-avatar category-select-avatar--gradient"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${category.gradient_start || DEFAULT_GRADIENT_START}, ${category.gradient_end || DEFAULT_GRADIENT_END})`,
      }}
      aria-hidden="true"
    />
  );
}

export function CategorySelect({
  value,
  onChange,
  categories,
  transactionType,
  disabled = false,
}: CategorySelectProps) {
  const [inputValue, setInputValue] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Sync inputValue when value prop changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Filter categories by the matching type for this transaction
  const categoryType = transactionType === "purchase" ? "expense" : "income";
  const typeFilteredCategories = categories.filter(
    (cat) => cat.type === categoryType,
  );

  const filteredCategories = typeFilteredCategories.filter((cat) => {
    if (!inputValue) return true;
    const displayName = getCategoryDisplayName(
      cat,
      typeFilteredCategories,
    ).toLowerCase();
    return (
      displayName.includes(inputValue.toLowerCase()) ||
      cat.name.toLowerCase().includes(inputValue.toLowerCase())
    );
  });

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        // If user typed something that doesn't match the selected value, revert
        if (inputValue !== value) {
          setInputValue(value);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputValue, value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    setIsOpen(true);
    setActiveIndex(-1);
    // If user clears the input, clear the selection
    if (!e.target.value) {
      onChange("");
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setActiveIndex(-1);
  };

  const handleSelect = useCallback(
    (category: Category) => {
      onChange(category.name);
      setInputValue(category.name);
      setIsOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [onChange],
  );

  const handleClear = () => {
    onChange("");
    setInputValue("");
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setIsOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < filteredCategories.length - 1 ? prev + 1 : prev,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case "Enter":
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < filteredCategories.length) {
          handleSelect(filteredCategories[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setInputValue(value);
        setActiveIndex(-1);
        break;
      case "Tab":
        setIsOpen(false);
        setInputValue(value);
        break;
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll<HTMLLIElement>(
        ".category-select-option",
      );
      items[activeIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const selectedCategory = typeFilteredCategories.find((c) => c.name === value);

  return (
    <div
      className={`category-select${disabled ? " category-select--disabled" : ""}`}
      ref={containerRef}
    >
      <div className="category-select-input-wrapper">
        {selectedCategory && !isOpen && (
          <CategoryAvatar category={selectedCategory} size={20} />
        )}
        <input
          ref={inputRef}
          type="text"
          className="category-select-input"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder="Search categories…"
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="category-select-listbox"
          aria-activedescendant={
            activeIndex >= 0
              ? `category-option-${filteredCategories[activeIndex]?.name}`
              : undefined
          }
        />
        {value && !disabled && (
          <button
            type="button"
            className="category-select-clear"
            onClick={handleClear}
            aria-label="Clear category selection"
            tabIndex={-1}
          >
            ×
          </button>
        )}
        <span className="category-select-chevron" aria-hidden="true">
          ▾
        </span>
      </div>

      {isOpen && !disabled && (
        <ul
          id="category-select-listbox"
          ref={listRef}
          className="category-select-dropdown"
          role="listbox"
          aria-label="Categories"
        >
          {filteredCategories.length === 0 ? (
            <li className="category-select-empty">No categories found</li>
          ) : (
            filteredCategories.map((cat, idx) => (
              <li
                key={cat.name}
                id={`category-option-${cat.name}`}
                className={`category-select-option${idx === activeIndex ? " category-select-option--active" : ""}${cat.name === value ? " category-select-option--selected" : ""}`}
                role="option"
                aria-selected={cat.name === value}
                onMouseDown={(e) => {
                  // Use mousedown to prevent blur before click
                  e.preventDefault();
                  handleSelect(cat);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <CategoryAvatar category={cat} size={20} />
                <span className="category-select-option-name">
                  {getCategoryDisplayName(cat, typeFilteredCategories)}
                </span>
                {cat.name === value && (
                  <span className="category-select-check" aria-hidden="true">
                    ✓
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
