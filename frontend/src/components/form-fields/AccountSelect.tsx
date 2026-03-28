import { useEffect, useCallback } from "react";
import { useCombobox } from "../../hooks/useCombobox";
import { Avatar } from "../ui/Avatar";
import type { Account } from "../../types";
import "./AccountSelect.css";

interface AccountSelectProps {
  value: string;
  onChange: (value: string) => void;
  accounts: Account[];
  placeholder?: string;
  excludeAccount?: string;
  disabled?: boolean;
}

function formatBalance(balance: number, currency: string): string {
  return `${currency} ${balance.toFixed(2)}`;
}

export function AccountSelect({
  value,
  onChange,
  accounts,
  placeholder = "Search accounts…",
  excludeAccount,
  disabled = false,
}: AccountSelectProps) {
  // Filter out archived accounts and the excluded account
  const activeAccounts = accounts.filter((a) => {
    if (a.archived) return false;
    if (excludeAccount && a.name === excludeAccount) return false;
    return true;
  });

  // AccountSelect-specific select handler: propagates name to parent
  const handleAccountSelect = useCallback(
    (account: Account) => {
      onChange(account.name);
    },
    [onChange],
  );

  // AccountSelect-specific clear handler
  const handleClearAccount = useCallback(() => {
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
  } = useCombobox<Account>({
    items: activeAccounts,
    onSelect: handleAccountSelect,
    onClear: handleClearAccount,
    getItemLabel: (a) => a.name,
  });

  // Sync inputValue when value prop changes externally
  useEffect(() => {
    setInputValue(value);
  }, [value, setInputValue]);

  // Filtered accounts based on current inputValue
  const displayedAccounts = activeAccounts.filter((a) => {
    if (!inputValue) return true;
    return a.name.toLowerCase().includes(inputValue.toLowerCase());
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

  // Custom handleKeyDown: uses displayedAccounts and reverts on Escape/Tab
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
            activeIndex < displayedAccounts.length - 1
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
          if (activeIndex >= 0 && activeIndex < displayedAccounts.length) {
            handleSelect(displayedAccounts[activeIndex]);
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
      displayedAccounts,
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

  const selectedAccount = activeAccounts.find((a) => a.name === value);

  return (
    <div
      className={`account-select${disabled ? " account-select--disabled" : ""}`}
      ref={containerRef}
    >
      <div className="combobox-input-wrapper">
        {selectedAccount && !isOpen && (
          <Avatar
            name={selectedAccount.name}
            gradientStart={selectedAccount.gradient_start}
            gradientEnd={selectedAccount.gradient_end}
            imageUrl={selectedAccount.image_url || undefined}
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
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="account-select-listbox"
          aria-activedescendant={
            activeIndex >= 0
              ? `account-option-${displayedAccounts[activeIndex]?.name}`
              : undefined
          }
        />
        {value && !disabled && (
          <button
            type="button"
            className="combobox-clear-btn"
            onClick={handleClear}
            aria-label="Clear account selection"
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
          id="account-select-listbox"
          ref={listRef}
          className="combobox-dropdown"
          role="listbox"
          aria-label="Accounts"
        >
          {displayedAccounts.length === 0 ? (
            <li className="combobox-empty">No accounts found</li>
          ) : (
            displayedAccounts.map((account, idx) => (
              <li
                key={account.name}
                id={`account-option-${account.name}`}
                className={`combobox-option${idx === activeIndex ? " combobox-option--active" : ""}${account.name === value ? " combobox-option--selected" : ""}`}
                role="option"
                aria-selected={account.name === value}
                onMouseDown={(e) => {
                  // Use mousedown to prevent blur before click
                  e.preventDefault();
                  handleSelect(account);
                }}
                onMouseEnter={() => setActiveIndex(idx)}
              >
                <Avatar
                  name={account.name}
                  gradientStart={account.gradient_start}
                  gradientEnd={account.gradient_end}
                  imageUrl={account.image_url || undefined}
                  size={20}
                />
                <span className="combobox-option-label">{account.name}</span>
                <span className="account-option-currency">
                  {account.currency}
                </span>
                <span className="combobox-option-meta">
                  {formatBalance(account.balance, account.currency)}
                </span>
                {account.name === value && (
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
