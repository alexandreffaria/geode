import { useEffect, useCallback } from "react";
import { useCombobox } from "../../hooks/useCombobox";
import { Avatar } from "../ui/Avatar";
import type { Category } from "../../types";
import "./CategorySelect.css";

interface CategorySelectProps {
  value: string; // category ID (or "" if none selected)
  onChange: (value: string) => void; // called with category ID
  categories: Category[];
  transactionType: "purchase" | "earning";
  disabled?: boolean;
}

/**
 * Returns the display name for a category.
 * For subcategories, shows "Parent > Child" using parent_name (computed by backend).
 */
function getCategoryDisplayName(category: Category): string {
  if (category.parent_name) {
    // parent_name is already the resolved name from the backend
    return `${category.parent_name} > ${category.name}`;
  }
  return category.name;
}

export function CategorySelect({
  value,
  onChange,
  categories,
  transactionType,
  disabled = false,
}: CategorySelectProps) {
  // Filter categories by the matching type for this transaction
  const categoryType = transactionType === "purchase" ? "expense" : "income";
  const typeFilteredCategories = categories.filter(
    (cat) => cat.type === categoryType,
  );

  // Find the currently selected category by ID
  const selectedCategory = typeFilteredCategories.find((c) => c.id === value);

  // The display text shown in the input when a category is selected
  const selectedDisplayName = selectedCategory
    ? getCategoryDisplayName(selectedCategory)
    : "";

  // CategorySelect-specific select handler: propagates category ID to parent
  const handleCategorySelect = useCallback(
    (category: Category) => {
      onChange(category.id);
    },
    [onChange],
  );

  // CategorySelect-specific clear handler
  const handleClearCategory = useCallback(() => {
    onChange("");
  }, [onChange]);

  const {
    inputValue,
    setInputValue,
    isOpen,
    setIsOpen,
    activeIndex,
    setActiveIndex,
    containerRef,
    inputRef,
    listRef,
    handleInputFocus,
    handleSelect,
    handleClear,
  } = useCombobox<Category>({
    items: typeFilteredCategories,
    onSelect: handleCategorySelect,
    onClear: handleClearCategory,
    getItemLabel: (c) => getCategoryDisplayName(c),
  });

  // Sync inputValue when value prop changes externally (show display name, not ID)
  useEffect(() => {
    setInputValue(selectedDisplayName);
  }, [value, selectedDisplayName, setInputValue]);

  // Filtered categories based on current inputValue
  const displayedCategories = typeFilteredCategories.filter((cat) => {
    if (!inputValue) return true;
    const displayName = getCategoryDisplayName(cat).toLowerCase();
    return (
      displayName.includes(inputValue.toLowerCase()) ||
      cat.name.toLowerCase().includes(inputValue.toLowerCase())
    );
  });

  // Custom handleInputChange: also clears selection when input is cleared
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(e.target.value);
      setIsOpen(true);
      setActiveIndex(-1);
      if (!e.target.value) {
        onChange("");
      }
    },
    [setInputValue, setIsOpen, setActiveIndex, onChange],
  );

  // Custom handleKeyDown: uses displayedCategories and reverts on Escape/Tab
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
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
          setActiveIndex(
            activeIndex < displayedCategories.length - 1
              ? activeIndex + 1
              : activeIndex,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex(activeIndex > 0 ? activeIndex - 1 : 0);
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < displayedCategories.length) {
            handleSelect(displayedCategories[activeIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setInputValue(selectedDisplayName);
          setActiveIndex(-1);
          break;
        case "Tab":
          setIsOpen(false);
          setInputValue(selectedDisplayName);
          break;
      }
    },
    [
      isOpen,
      displayedCategories,
      activeIndex,
      handleSelect,
      setIsOpen,
      setInputValue,
      setActiveIndex,
      selectedDisplayName,
    ],
  );

  // Override outside-click to revert inputValue if it doesn't match selected display name
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        if (inputValue !== selectedDisplayName) {
          setInputValue(selectedDisplayName);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputValue, selectedDisplayName, containerRef, setIsOpen, setInputValue]);

  return (
    <div
      className={`category-select${disabled ? " category-select--disabled" : ""}`}
      ref={containerRef}
    >
      <div className="combobox-input-wrapper">
        {selectedCategory && !isOpen && (
          <Avatar
            name={selectedCategory.name}
            gradientStart={selectedCategory.gradient_start}
            gradientEnd={selectedCategory.gradient_end}
            imageUrl={selectedCategory.image_url || undefined}
            size={20}
          />
        )}
        <input
          ref={inputRef}
          type="text"
          className="combobox-input"
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
              ? `category-option-${displayedCategories[activeIndex]?.id}`
              : undefined
          }
        />
        {value && !disabled && (
          <button
            type="button"
            className="combobox-clear-btn"
            onClick={handleClear}
            aria-label="Clear category selection"
            tabIndex={-1}
          >
            ×
          </button>
        )}
        <span className="combobox-chevron" aria-hidden="true">
          ▾
        </span>
      </div>

      {isOpen && !disabled && (
        <ul
          id="category-select-listbox"
          ref={listRef}
          className="combobox-dropdown"
          role="listbox"
          aria-label="Categories"
        >
          {displayedCategories.length === 0 ? (
            <li className="combobox-empty">No categories found</li>
          ) : (
            displayedCategories.map((cat, idx) => (
              <li
                key={cat.id}
                id={`category-option-${cat.id}`}
                className={`combobox-option${idx === activeIndex ? " combobox-option--active" : ""}${cat.id === value ? " combobox-option--selected" : ""}`}
                role="option"
                aria-selected={cat.id === value}
                onMouseDown={(e) => {
                  // Use mousedown to prevent blur before click
                  e.preventDefault();
                  handleSelect(cat);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <Avatar
                  name={cat.name}
                  gradientStart={cat.gradient_start}
                  gradientEnd={cat.gradient_end}
                  imageUrl={cat.image_url || undefined}
                  size={20}
                />
                <span className="combobox-option-label">
                  {getCategoryDisplayName(cat)}
                </span>
                {cat.id === value && (
                  <span className="combobox-check" aria-hidden="true">
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
