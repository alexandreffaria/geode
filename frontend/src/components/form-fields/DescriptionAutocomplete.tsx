import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type RefObject,
} from "react";
import type { DescriptionSuggestion } from "../../utils/transactionUtils";
import "../../styles/combobox.css";
import "./DescriptionAutocomplete.css";

const MAX_SUGGESTIONS = 8;

interface DescriptionAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSuggestionSelect: (suggestion: DescriptionSuggestion) => void;
  suggestions: DescriptionSuggestion[];
  disabled?: boolean;
  amountInputRef?: RefObject<HTMLInputElement | null>;
}

/**
 * Free-text description field with autocomplete suggestions derived from past transactions.
 * Unlike AccountSelect/CategorySelect, this is NOT a selection combobox — the user can
 * type anything. Suggestions are shown only when the input is non-empty and matches exist.
 * On selection, focus moves to the amount field.
 */
export function DescriptionAutocomplete({
  value,
  onChange,
  onSuggestionSelect,
  suggestions,
  disabled = false,
  amountInputRef,
}: DescriptionAutocompleteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Filter suggestions based on current input value (substring, case-insensitive)
  const filteredSuggestions =
    value.trim().length > 0
      ? suggestions
          .filter((s) =>
            s.description.toLowerCase().includes(value.toLowerCase()),
          )
          .slice(0, MAX_SUGGESTIONS)
      : [];

  const shouldShowDropdown =
    isOpen && filteredSuggestions.length > 0 && !disabled;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const activeItem = listRef.current.children[activeIndex] as HTMLElement;
      activeItem?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
      setIsOpen(true);
      setActiveIndex(-1);
    },
    [onChange],
  );

  const handleSelect = useCallback(
    (suggestion: DescriptionSuggestion) => {
      onSuggestionSelect(suggestion);
      setIsOpen(false);
      setActiveIndex(-1);
      // Move focus to the amount field after selection
      amountInputRef?.current?.focus();
    },
    [onSuggestionSelect, amountInputRef],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!shouldShowDropdown) {
        // No open dropdown — let all keys pass through normally
        // (including Enter for form submit)
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
          );
          break;
        case "Enter":
          if (activeIndex >= 0 && activeIndex < filteredSuggestions.length) {
            e.preventDefault(); // prevent form submit only when selecting a suggestion
            handleSelect(filteredSuggestions[activeIndex]);
          }
          // If no active suggestion, let Enter bubble up to form submit
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setActiveIndex(-1);
          // Do NOT clear the typed text — user keeps what they typed
          break;
        case "Tab":
          setIsOpen(false);
          setActiveIndex(-1);
          break;
      }
    },
    [shouldShowDropdown, filteredSuggestions, activeIndex, handleSelect],
  );

  return (
    <div className="description-autocomplete" ref={containerRef}>
      <div className="form-group">
        <label htmlFor="description">Description (optional)</label>
        <input
          ref={inputRef}
          id="description"
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Transaction description"
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={shouldShowDropdown}
          aria-autocomplete="list"
          aria-controls="description-autocomplete-listbox"
          aria-activedescendant={
            activeIndex >= 0 ? `desc-option-${activeIndex}` : undefined
          }
        />
      </div>

      {shouldShowDropdown && (
        <ul
          id="description-autocomplete-listbox"
          ref={listRef}
          className="combobox-dropdown"
          role="listbox"
          aria-label="Description suggestions"
        >
          {filteredSuggestions.map((suggestion, idx) => (
            <li
              key={suggestion.description}
              id={`desc-option-${idx}`}
              className={`combobox-option${idx === activeIndex ? " combobox-option--active" : ""}`}
              role="option"
              aria-selected={false}
              onMouseDown={(e) => {
                // Use mousedown to prevent blur race condition before click
                e.preventDefault();
                handleSelect(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              <span className="combobox-option-label">
                {suggestion.description}
              </span>
              {suggestion.account && (
                <span className="combobox-option-meta">
                  {suggestion.account}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
