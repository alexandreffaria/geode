import { useEffect, useCallback } from "react";
import { useCombobox } from "../../hooks/useCombobox";
import { Avatar } from "../ui/Avatar";
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

  // CategorySelect-specific select handler: propagates name to parent
  const handleCategorySelect = useCallback(
    (category: Category) => {
      onChange(category.name);
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
    getItemLabel: (c) => c.name,
  });

  // Sync inputValue when value prop changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value, setInputValue]);

  // Filtered categories based on current inputValue
  const displayedCategories = typeFilteredCategories.filter((cat) => {
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
          setInputValue(value);
          setActiveIndex(-1);
          break;
        case "Tab":
          setIsOpen(false);
          setInputValue(value);
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
      value,
    ],
  );

  // Override outside-click to revert inputValue if it doesn't match selected value
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        if (inputValue !== value) {
          setInputValue(value);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [inputValue, value, containerRef, setIsOpen, setInputValue]);

  const selectedCategory = typeFilteredCategories.find((c) => c.name === value);

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
              ? `category-option-${displayedCategories[activeIndex]?.name}`
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
                key={cat.name}
                id={`category-option-${cat.name}`}
                className={`combobox-option${idx === activeIndex ? " combobox-option--active" : ""}${cat.name === value ? " combobox-option--selected" : ""}`}
                role="option"
                aria-selected={cat.name === value}
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
                  {getCategoryDisplayName(cat, typeFilteredCategories)}
                </span>
                {cat.name === value && (
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
