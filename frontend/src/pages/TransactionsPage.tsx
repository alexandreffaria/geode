import { useState, useMemo, useCallback } from "react";
import type { Account, Category, Transaction } from "../types";
import { TransactionList } from "../components/TransactionList";
import "./TransactionsPage.css";

interface TransactionsPageProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onAddTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
}

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getFirstDayOfMonth(date: Date): string {
  return toDateString(new Date(date.getFullYear(), date.getMonth(), 1));
}

function getLastDayOfMonth(date: Date): string {
  return toDateString(new Date(date.getFullYear(), date.getMonth() + 1, 0));
}

function getFirstDayOfYear(date: Date): string {
  return toDateString(new Date(date.getFullYear(), 0, 1));
}

function getLastDayOfYear(date: Date): string {
  return toDateString(new Date(date.getFullYear(), 11, 31));
}

// ── Filter state ──────────────────────────────────────────────────────────────

interface FilterState {
  startDate: string;
  endDate: string;
  selectedAccount: string; // "" = all
  selectedCategory: string; // "" = all
  searchQuery: string;
}

function getDefaultFilters(): FilterState {
  const now = new Date();
  return {
    startDate: getFirstDayOfMonth(now),
    endDate: getLastDayOfMonth(now),
    selectedAccount: "",
    selectedCategory: "",
    searchQuery: "",
  };
}

// ── Filter logic ──────────────────────────────────────────────────────────────

function getTransactionAccounts(t: Transaction): string[] {
  if (t.type === "transfer") return [t.from_account, t.to_account];
  return [t.account];
}

function getTransactionCategory(t: Transaction): string {
  if (t.type === "purchase" || t.type === "earning") return t.category;
  return "";
}

function applyFilters(
  transactions: Transaction[],
  filters: FilterState,
): Transaction[] {
  return transactions.filter((t) => {
    // Date range
    if (filters.startDate && t.date < filters.startDate) return false;
    if (filters.endDate && t.date > filters.endDate) return false;

    // Account filter
    if (filters.selectedAccount) {
      const accounts = getTransactionAccounts(t);
      if (!accounts.includes(filters.selectedAccount)) return false;
    }

    // Category filter
    if (filters.selectedCategory) {
      if (getTransactionCategory(t) !== filters.selectedCategory) return false;
    }

    // Search
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const searchable = [
        t.description ?? "",
        ...getTransactionAccounts(t),
        getTransactionCategory(t),
        String(t.amount),
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    return true;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TransactionsPage({
  transactions,
  accounts: _accounts,
  categories,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
}: TransactionsPageProps) {
  const [filters, setFilters] = useState<FilterState>(getDefaultFilters);

  const setFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Quick-select date presets
  const applyPreset = useCallback((preset: string) => {
    const now = new Date();
    switch (preset) {
      case "this-month":
        setFilters((prev) => ({
          ...prev,
          startDate: getFirstDayOfMonth(now),
          endDate: getLastDayOfMonth(now),
        }));
        break;
      case "last-month": {
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        setFilters((prev) => ({
          ...prev,
          startDate: getFirstDayOfMonth(lastMonth),
          endDate: getLastDayOfMonth(lastMonth),
        }));
        break;
      }
      case "last-3-months": {
        const threeMonthsAgo = new Date(
          now.getFullYear(),
          now.getMonth() - 2,
          1,
        );
        setFilters((prev) => ({
          ...prev,
          startDate: getFirstDayOfMonth(threeMonthsAgo),
          endDate: getLastDayOfMonth(now),
        }));
        break;
      }
      case "this-year":
        setFilters((prev) => ({
          ...prev,
          startDate: getFirstDayOfYear(now),
          endDate: getLastDayOfYear(now),
        }));
        break;
      case "all-time":
        setFilters((prev) => ({
          ...prev,
          startDate: "",
          endDate: "",
        }));
        break;
    }
  }, []);

  const filteredTransactions = useMemo(
    () => applyFilters(transactions, filters),
    [transactions, filters],
  );

  // Unique account names from all transactions
  const accountOptions = useMemo(() => {
    const names = new Set<string>();
    for (const t of transactions) {
      for (const a of getTransactionAccounts(t)) {
        names.add(a);
      }
    }
    // Sort by active accounts first, then alphabetically
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  // Category options — only those that appear in transactions
  const categoryOptions = useMemo(() => {
    const names = new Set<string>();
    for (const t of transactions) {
      const cat = getTransactionCategory(t);
      if (cat) names.add(cat);
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [transactions]);

  // Determine which preset is currently active (for button highlighting)
  const activePreset = useMemo(() => {
    const now = new Date();
    if (
      filters.startDate === getFirstDayOfMonth(now) &&
      filters.endDate === getLastDayOfMonth(now)
    )
      return "this-month";
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    if (
      filters.startDate === getFirstDayOfMonth(lastMonth) &&
      filters.endDate === getLastDayOfMonth(lastMonth)
    )
      return "last-month";
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    if (
      filters.startDate === getFirstDayOfMonth(threeMonthsAgo) &&
      filters.endDate === getLastDayOfMonth(now)
    )
      return "last-3-months";
    if (
      filters.startDate === getFirstDayOfYear(now) &&
      filters.endDate === getLastDayOfYear(now)
    )
      return "this-year";
    if (filters.startDate === "" && filters.endDate === "") return "all-time";
    return null;
  }, [filters.startDate, filters.endDate]);

  // Category type lookup for display
  const categoryTypeMap = useMemo(() => {
    const map: Record<string, "income" | "expense"> = {};
    for (const c of categories) {
      map[c.name] = c.type;
    }
    return map;
  }, [categories]);

  const hasActiveFilters =
    filters.selectedAccount !== "" ||
    filters.selectedCategory !== "" ||
    filters.searchQuery !== "" ||
    activePreset !== "this-month";

  const resetFilters = () => setFilters(getDefaultFilters());

  return (
    <div className="transactions-page">
      {/* Page header */}
      <div className="transactions-header">
        <div className="transactions-header-text">
          <h1 className="transactions-title">Transactions</h1>
          <p className="transactions-count">
            Showing <strong>{filteredTransactions.length}</strong> of{" "}
            <strong>{transactions.length}</strong> transactions
          </p>
        </div>
        <button
          className="add-transaction-button"
          onClick={onAddTransaction}
          type="button"
        >
          <span className="button-icon">+</span>
          Add Transaction
        </button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        {/* Date range */}
        <div className="filter-group filter-group--date">
          <label className="filter-label">Date Range</label>
          <div className="date-range-inputs">
            <input
              type="date"
              className="filter-input filter-input--date"
              value={filters.startDate}
              onChange={(e) => setFilter("startDate", e.target.value)}
              aria-label="Start date"
            />
            <span className="date-range-separator">→</span>
            <input
              type="date"
              className="filter-input filter-input--date"
              value={filters.endDate}
              onChange={(e) => setFilter("endDate", e.target.value)}
              aria-label="End date"
            />
          </div>
          <div className="date-presets">
            {(
              [
                { key: "this-month", label: "This Month" },
                { key: "last-month", label: "Last Month" },
                { key: "last-3-months", label: "Last 3 Months" },
                { key: "this-year", label: "This Year" },
                { key: "all-time", label: "All Time" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`preset-btn${activePreset === key ? " preset-btn--active" : ""}`}
                onClick={() => applyPreset(key)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Account filter */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-account">
            Account
          </label>
          <select
            id="filter-account"
            className="filter-select"
            value={filters.selectedAccount}
            onChange={(e) => setFilter("selectedAccount", e.target.value)}
          >
            <option value="">All Accounts</option>
            {accountOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        {/* Category filter */}
        <div className="filter-group">
          <label className="filter-label" htmlFor="filter-category">
            Category
          </label>
          <select
            id="filter-category"
            className="filter-select"
            value={filters.selectedCategory}
            onChange={(e) => setFilter("selectedCategory", e.target.value)}
          >
            <option value="">All Categories</option>
            {categoryOptions.map((name) => (
              <option key={name} value={name}>
                {name}
                {categoryTypeMap[name] ? ` (${categoryTypeMap[name]})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Search */}
        <div className="filter-group filter-group--search">
          <label className="filter-label" htmlFor="filter-search">
            Search
          </label>
          <div className="search-input-wrapper">
            <span className="search-icon" aria-hidden="true">
              🔍
            </span>
            <input
              id="filter-search"
              type="text"
              className="filter-input filter-input--search"
              placeholder="Description, account, category, amount…"
              value={filters.searchQuery}
              onChange={(e) => setFilter("searchQuery", e.target.value)}
            />
            {filters.searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setFilter("searchQuery", "")}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Reset filters */}
        {hasActiveFilters && (
          <div className="filter-group filter-group--reset">
            <button
              type="button"
              className="reset-filters-btn"
              onClick={resetFilters}
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="transactions-results">
        <TransactionList
          transactions={filteredTransactions}
          onEditTransaction={onEditTransaction}
          onDeleteTransaction={onDeleteTransaction}
        />
      </div>
    </div>
  );
}
