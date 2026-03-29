import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import type { Account, Category, Transaction } from "../types";
import { resolveCategoryName } from "../utils/transactionUtils";
import {
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getFirstDayOfYear,
  getLastDayOfYear,
  isoToDisplay,
  displayToIso,
  isValidDisplayDate,
} from "../utils/dateUtils";
import { TransactionList } from "../components/TransactionList";
import "./TransactionsPage.css";

interface TransactionsPageProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onAddTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
  onRealizeTransaction: (transaction: Transaction) => void;
  onUnrealizeTransaction: (transaction: Transaction) => void;
}

// ── Filter state ──────────────────────────────────────────────────────────────

interface FilterState {
  startDate: string;
  endDate: string;
  selectedAccount: string; // "" = all
  selectedCategory: string; // "" = all
  searchQuery: string;
  showVirtual: boolean; // default false — virtual transactions hidden by default
}

function getDefaultFilters(): FilterState {
  const now = new Date();
  return {
    startDate: getFirstDayOfMonth(now.getFullYear(), now.getMonth()),
    endDate: getLastDayOfMonth(now.getFullYear(), now.getMonth()),
    selectedAccount: "",
    selectedCategory: "",
    searchQuery: "",
    showVirtual: false,
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
  categories: Category[],
): Transaction[] {
  return transactions.filter((t) => {
    // Virtual filter: hide virtual transactions unless showVirtual is true
    if (!filters.showVirtual && t.is_virtual === true) return false;

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
      // Resolve category UUID → display name so users can search by category name
      const categoryId = getTransactionCategory(t);
      const categoryName = categoryId
        ? resolveCategoryName(categoryId, categories)
        : "";
      const searchable = [
        t.description ?? "",
        ...getTransactionAccounts(t),
        categoryName,
        String(t.amount),
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(q)) return false;
    }

    return true;
  });
}

// ── localStorage helpers ──────────────────────────────────────────────────────

const LS_PREFIX = "txpage_";

function lsGet(key: string, fallback: string): string {
  try {
    const v = localStorage.getItem(LS_PREFIX + key);
    return v !== null ? v : fallback;
  } catch {
    return fallback;
  }
}

function lsGetBool(key: string, fallback: boolean): boolean {
  try {
    const v = localStorage.getItem(LS_PREFIX + key);
    return v !== null ? v === "true" : fallback;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(LS_PREFIX + key, value);
  } catch {
    // ignore quota errors
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TransactionsPage({
  transactions,
  accounts,
  categories,
  onAddTransaction,
  onEditTransaction,
  onDeleteTransaction,
  onRealizeTransaction,
  onUnrealizeTransaction,
}: TransactionsPageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const defaults = getDefaultFilters();

  // Read URL query params (set when navigating from Dashboard account cards)
  // These take priority over localStorage on initial mount.
  const urlAccount = searchParams.get("account") ?? "";
  const urlMonth = searchParams.get("month") ?? ""; // YYYY-MM

  // Derive start/end dates from the ?month=YYYY-MM param if present
  const urlStartDate = useMemo(() => {
    if (!urlMonth) return "";
    const [year, month] = urlMonth.split("-").map(Number);
    if (!year || !month) return "";
    return getFirstDayOfMonth(year, month - 1);
  }, [urlMonth]);

  const urlEndDate = useMemo(() => {
    if (!urlMonth) return "";
    const [year, month] = urlMonth.split("-").map(Number);
    if (!year || !month) return "";
    return getLastDayOfMonth(year, month - 1);
  }, [urlMonth]);

  // Per-field state: URL params take priority over localStorage, which falls back to defaults
  const [startDate, setStartDate] = useState<string>(
    () => urlStartDate || lsGet("startDate", defaults.startDate),
  );
  const [endDate, setEndDate] = useState<string>(
    () => urlEndDate || lsGet("endDate", defaults.endDate),
  );
  const [selectedAccount, setSelectedAccount] = useState<string>(
    () => urlAccount || lsGet("selectedAccount", defaults.selectedAccount),
  );
  const [selectedCategory, setSelectedCategory] = useState<string>(() =>
    lsGet("selectedCategory", defaults.selectedCategory),
  );
  const [searchQuery, setSearchQuery] = useState<string>(() =>
    lsGet("searchQuery", defaults.searchQuery),
  );
  const [showVirtual, setShowVirtual] = useState<boolean>(() =>
    lsGetBool("showVirtual", defaults.showVirtual),
  );

  // Once URL params have been consumed into state, clear them from the URL
  // so that subsequent filter changes don't conflict with stale params.
  useEffect(() => {
    if (urlAccount || urlMonth) {
      setSearchParams({}, { replace: true });
    }
    // Only run on mount — intentionally omitting deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist each field to localStorage whenever it changes
  useEffect(() => {
    lsSet("startDate", startDate);
  }, [startDate]);
  useEffect(() => {
    lsSet("endDate", endDate);
  }, [endDate]);
  useEffect(() => {
    lsSet("selectedAccount", selectedAccount);
  }, [selectedAccount]);
  useEffect(() => {
    lsSet("selectedCategory", selectedCategory);
  }, [selectedCategory]);
  useEffect(() => {
    lsSet("searchQuery", searchQuery);
  }, [searchQuery]);
  useEffect(() => {
    lsSet("showVirtual", String(showVirtual));
  }, [showVirtual]);

  // Compose a FilterState object for the filter logic (no setState needed)
  const filters: FilterState = useMemo(
    () => ({
      startDate,
      endDate,
      selectedAccount,
      selectedCategory,
      searchQuery,
      showVirtual,
    }),
    [
      startDate,
      endDate,
      selectedAccount,
      selectedCategory,
      searchQuery,
      showVirtual,
    ],
  );

  const setFilter = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      switch (key) {
        case "startDate":
          setStartDate(value as string);
          break;
        case "endDate":
          setEndDate(value as string);
          break;
        case "selectedAccount":
          setSelectedAccount(value as string);
          break;
        case "selectedCategory":
          setSelectedCategory(value as string);
          break;
        case "searchQuery":
          setSearchQuery(value as string);
          break;
        case "showVirtual":
          setShowVirtual(value as boolean);
          break;
      }
    },
    [],
  );

  // Quick-select date presets
  const applyPreset = useCallback((preset: string) => {
    const now = new Date();
    switch (preset) {
      case "this-month":
        setStartDate(getFirstDayOfMonth(now.getFullYear(), now.getMonth()));
        setEndDate(getLastDayOfMonth(now.getFullYear(), now.getMonth()));
        break;
      case "last-month": {
        const lastMonthYear =
          now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        setStartDate(getFirstDayOfMonth(lastMonthYear, lastMonth));
        setEndDate(getLastDayOfMonth(lastMonthYear, lastMonth));
        break;
      }
      case "last-3-months": {
        const threeMonthsAgoDate = new Date(
          now.getFullYear(),
          now.getMonth() - 2,
          1,
        );
        setStartDate(
          getFirstDayOfMonth(
            threeMonthsAgoDate.getFullYear(),
            threeMonthsAgoDate.getMonth(),
          ),
        );
        setEndDate(getLastDayOfMonth(now.getFullYear(), now.getMonth()));
        break;
      }
      case "this-year":
        setStartDate(getFirstDayOfYear(now.getFullYear()));
        setEndDate(getLastDayOfYear(now.getFullYear()));
        break;
      case "all-time":
        setStartDate("");
        setEndDate("");
        break;
    }
  }, []);

  const filteredTransactions = useMemo(
    () => applyFilters(transactions, filters, categories),
    [transactions, filters, categories],
  );

  // Summary totals — NEVER include virtual transactions regardless of showVirtual
  const summary = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const t of filteredTransactions) {
      if (t.is_virtual === true) continue;
      if (t.paid === false) continue;
      if (t.type === "earning") income += t.amount;
      else if (t.type === "purchase") expenses += t.amount;
    }
    return { income, expenses, net: income - expenses };
  }, [filteredTransactions]);

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

  // Category options — only those that appear in transactions, resolved to names for display
  // The filter value is the category ID (stored in transactions)
  const categoryOptions = useMemo(() => {
    const ids = new Set<string>();
    for (const t of transactions) {
      const cat = getTransactionCategory(t);
      if (cat) ids.add(cat);
    }
    // Map IDs to {id, name} for display, sorted by name
    return Array.from(ids)
      .map((id) => {
        const found = categories.find((c) => c.id === id);
        return { id, name: found?.name ?? id };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions, categories]);

  // Determine which preset is currently active (for button highlighting)
  const activePreset = useMemo(() => {
    const now = new Date();
    if (
      filters.startDate ===
        getFirstDayOfMonth(now.getFullYear(), now.getMonth()) &&
      filters.endDate === getLastDayOfMonth(now.getFullYear(), now.getMonth())
    )
      return "this-month";
    const lastMonthYear =
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    if (
      filters.startDate === getFirstDayOfMonth(lastMonthYear, lastMonth) &&
      filters.endDate === getLastDayOfMonth(lastMonthYear, lastMonth)
    )
      return "last-month";
    const threeMonthsAgoDate = new Date(
      now.getFullYear(),
      now.getMonth() - 2,
      1,
    );
    if (
      filters.startDate ===
        getFirstDayOfMonth(
          threeMonthsAgoDate.getFullYear(),
          threeMonthsAgoDate.getMonth(),
        ) &&
      filters.endDate === getLastDayOfMonth(now.getFullYear(), now.getMonth())
    )
      return "last-3-months";
    if (
      filters.startDate === getFirstDayOfYear(now.getFullYear()) &&
      filters.endDate === getLastDayOfYear(now.getFullYear())
    )
      return "this-year";
    if (filters.startDate === "" && filters.endDate === "") return "all-time";
    return null;
  }, [filters.startDate, filters.endDate]);

  // Category type lookup for display (keyed by ID)
  const categoryTypeMap = useMemo(() => {
    const map: Record<string, "income" | "expense"> = {};
    for (const c of categories) {
      map[c.id] = c.type;
    }
    return map;
  }, [categories]);

  const hasActiveFilters =
    filters.selectedAccount !== "" ||
    filters.selectedCategory !== "" ||
    filters.searchQuery !== "" ||
    filters.showVirtual ||
    activePreset !== "this-month";

  const resetFilters = () => {
    const d = getDefaultFilters();
    setStartDate(d.startDate);
    setEndDate(d.endDate);
    setSelectedAccount(d.selectedAccount);
    setSelectedCategory(d.selectedCategory);
    setSearchQuery(d.searchQuery);
    setShowVirtual(d.showVirtual);
  };

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

      {/* Summary bar — excludes virtual transactions */}
      <div className="transactions-summary-bar">
        <div className="summary-pill summary-pill--income">
          <span className="summary-pill-label">Income</span>
          <span className="summary-pill-value">
            +{summary.income.toFixed(2)}
          </span>
        </div>
        <div className="summary-pill summary-pill--expenses">
          <span className="summary-pill-label">Expenses</span>
          <span className="summary-pill-value">
            -{summary.expenses.toFixed(2)}
          </span>
        </div>
        <div
          className={`summary-pill summary-pill--net ${summary.net >= 0 ? "summary-pill--net-positive" : "summary-pill--net-negative"}`}
        >
          <span className="summary-pill-label">Net</span>
          <span className="summary-pill-value">
            {summary.net >= 0 ? "+" : ""}
            {summary.net.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        {/* Date range */}
        <div className="filter-group filter-group--date">
          <label className="filter-label">Date Range</label>
          <div className="date-range-inputs">
            <input
              type="text"
              inputMode="numeric"
              className="filter-input filter-input--date"
              value={isoToDisplay(filters.startDate)}
              onChange={(e) => {
                const display = e.target.value;
                if (display === "") {
                  setFilter("startDate", "");
                } else if (isValidDisplayDate(display)) {
                  setFilter("startDate", displayToIso(display));
                }
              }}
              placeholder="DD/MM/YYYY"
              pattern="\d{2}/\d{2}/\d{4}"
              maxLength={10}
              aria-label="Start date (DD/MM/YYYY)"
            />
            <span className="date-range-separator">→</span>
            <input
              type="text"
              inputMode="numeric"
              className="filter-input filter-input--date"
              value={isoToDisplay(filters.endDate)}
              onChange={(e) => {
                const display = e.target.value;
                if (display === "") {
                  setFilter("endDate", "");
                } else if (isValidDisplayDate(display)) {
                  setFilter("endDate", displayToIso(display));
                }
              }}
              placeholder="DD/MM/YYYY"
              pattern="\d{2}/\d{2}/\d{4}"
              maxLength={10}
              aria-label="End date (DD/MM/YYYY)"
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
            {categoryOptions.map(({ id, name }) => (
              <option key={id} value={id}>
                {name}
                {categoryTypeMap[id] ? ` (${categoryTypeMap[id]})` : ""}
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

        {/* Show projected transactions toggle */}
        <div className="filter-group filter-group--virtual">
          <label className="filter-label filter-label--checkbox">
            <input
              type="checkbox"
              checked={filters.showVirtual}
              onChange={(e) => setFilter("showVirtual", e.target.checked)}
            />
            Show projected transactions
          </label>
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
          categories={categories}
          accounts={accounts}
          onEditTransaction={onEditTransaction}
          onDeleteTransaction={onDeleteTransaction}
          onRealizeTransaction={onRealizeTransaction}
          onUnrealizeTransaction={onUnrealizeTransaction}
        />
      </div>
    </div>
  );
}
