import { useState, useMemo, useCallback } from "react";
import type { Account, Category, Transaction } from "../types";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import {
  getFirstDayOfMonth,
  getLastDayOfMonth,
  getFirstDayOfYear,
  getLastDayOfYear,
  isoToDisplay,
  displayToIso,
  isValidDisplayDate,
} from "../utils/dateUtils";
import "./ChartsPage.css";

interface ChartsPageProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
}

// ── Date filter state ─────────────────────────────────────────────────────────

interface DateFilterState {
  startDate: string;
  endDate: string;
  showVirtual: boolean; // default false — virtual transactions excluded from charts
}

function getDefaultDateFilter(): DateFilterState {
  const now = new Date();
  return {
    startDate: getFirstDayOfMonth(now.getFullYear(), now.getMonth()),
    endDate: getLastDayOfMonth(now.getFullYear(), now.getMonth()),
    showVirtual: false,
  };
}

// ── Color helpers ─────────────────────────────────────────────────────────────

const FALLBACK_COLORS = [
  "#4a9eff",
  "#6bff6b",
  "#ff6b6b",
  "#ffd166",
  "#a78bfa",
  "#f97316",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
  "#f43f5e",
  "#14b8a6",
  "#8b5cf6",
];

function getCategoryColor(cat: Category | undefined, index: number): string {
  if (cat?.gradient_start && cat.gradient_start !== "") {
    return cat.gradient_start;
  }
  return FALLBACK_COLORS[index % FALLBACK_COLORS.length];
}

// ── Month aggregation ─────────────────────────────────────────────────────────

interface MonthDataPoint {
  month: string; // "Jan 2025"
  monthKey: string; // "2025-01" for sorting
  income: number;
  expenses: number;
  balance: number; // running cumulative balance
}

function buildMonthlyData(
  transactions: Transaction[],
  accounts: Account[],
): MonthDataPoint[] {
  const map = new Map<string, { income: number; expenses: number }>();

  for (const t of transactions) {
    // Skip pending (unpaid) credit card transactions
    if (t.paid === false) continue;
    // Only count purchases and earnings
    if (t.type !== "purchase" && t.type !== "earning") continue;

    const monthKey = t.date.slice(0, 7); // "YYYY-MM"
    const existing = map.get(monthKey) ?? { income: 0, expenses: 0 };

    if (t.type === "earning") {
      existing.income += t.amount;
    } else {
      existing.expenses += t.amount;
    }

    map.set(monthKey, existing);
  }

  // Sort by month key ascending
  const sorted = Array.from(map.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  // Compute initial balance from accounts (sum of all account balances)
  const totalAccountBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  // Build running balance: start from total account balance, then subtract/add
  // monthly net going backwards from the end so the last month ends at the
  // current total. We compute forward cumulative net first, then offset.
  let cumulativeNet = 0;
  sorted.forEach(([, { income, expenses }]) => {
    cumulativeNet += income - expenses;
  });

  // The final cumulative net should equal totalAccountBalance at the last month.
  // Starting balance = totalAccountBalance - totalCumulativeNet
  const startingBalance =
    sorted.length > 0
      ? totalAccountBalance - cumulativeNet
      : totalAccountBalance;

  let runningBalance = startingBalance;

  return sorted.map(([monthKey, { income, expenses }]) => {
    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    const label = date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
    runningBalance += income - expenses;
    return {
      month: label,
      monthKey,
      income,
      expenses,
      balance: runningBalance,
    };
  });
}

// ── Category totals ───────────────────────────────────────────────────────────

interface CategorySlice {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

function buildCategoryData(
  transactions: Transaction[],
  type: "purchase" | "earning",
  categories: Category[],
): CategorySlice[] {
  const map = new Map<string, number>();

  for (const t of transactions) {
    if (t.paid === false) continue;
    if (t.type !== type) continue;

    const existing = map.get(t.category) ?? 0;
    map.set(t.category, existing + t.amount);
  }

  const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
  if (total === 0) return [];

  const entries = Array.from(map.entries()).sort(([, a], [, b]) => b - a);

  return entries.map(([catId, value], index) => {
    const cat = categories.find((c) => c.id === catId);
    const name = cat?.name ?? catId;
    const color = getCategoryColor(cat, index);
    const percentage = total > 0 ? (value / total) * 100 : 0;
    return { name, value, color, percentage };
  });
}

// ── Custom Tooltip for ComposedChart ──────────────────────────────────────────

interface ComboTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

function ComboTooltipContent({ active, payload, label }: ComboTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{label}</p>
      {payload.map((entry) => (
        <p
          key={entry.name}
          className="chart-tooltip-row"
          style={{ color: entry.color }}
        >
          <span className="chart-tooltip-name">{entry.name}:</span>
          <span className="chart-tooltip-value">
            {entry.value.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </p>
      ))}
    </div>
  );
}

// ── Custom Tooltip for PieChart ───────────────────────────────────────────────

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: CategorySlice;
  }>;
}

function PieTooltipContent({ active, payload }: PieTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const entry = payload[0];
  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip-label">{entry.name}</p>
      <p className="chart-tooltip-row" style={{ color: entry.payload.color }}>
        <span className="chart-tooltip-name">Amount:</span>
        <span className="chart-tooltip-value">
          {entry.value.toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </span>
      </p>
      <p className="chart-tooltip-row" style={{ color: entry.payload.color }}>
        <span className="chart-tooltip-name">Share:</span>
        <span className="chart-tooltip-value">
          {entry.payload.percentage.toFixed(1)}%
        </span>
      </p>
    </div>
  );
}

// ── Custom Legend for PieChart ────────────────────────────────────────────────

interface PieLegendProps {
  data: CategorySlice[];
}

function PieLegend({ data }: PieLegendProps) {
  return (
    <ul className="pie-legend">
      {data.map((entry) => (
        <li key={entry.name} className="pie-legend-item">
          <span
            className="pie-legend-dot"
            style={{ background: entry.color }}
          />
          <span className="pie-legend-name">{entry.name}</span>
          <span className="pie-legend-pct">{entry.percentage.toFixed(1)}%</span>
        </li>
      ))}
    </ul>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChartsPage({
  transactions,
  categories,
  accounts,
}: ChartsPageProps) {
  const [dateFilter, setDateFilter] =
    useState<DateFilterState>(getDefaultDateFilter);

  const setDateField = useCallback(
    <K extends keyof DateFilterState>(key: K, value: DateFilterState[K]) => {
      setDateFilter((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  // Quick-select date presets
  const applyPreset = useCallback((preset: string) => {
    const now = new Date();
    switch (preset) {
      case "this-month":
        setDateFilter((prev) => ({
          ...prev,
          startDate: getFirstDayOfMonth(now.getFullYear(), now.getMonth()),
          endDate: getLastDayOfMonth(now.getFullYear(), now.getMonth()),
        }));
        break;
      case "last-month": {
        const lastMonthYear =
          now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
        setDateFilter((prev) => ({
          ...prev,
          startDate: getFirstDayOfMonth(lastMonthYear, lastMonth),
          endDate: getLastDayOfMonth(lastMonthYear, lastMonth),
        }));
        break;
      }
      case "last-3-months": {
        const threeMonthsAgoDate = new Date(
          now.getFullYear(),
          now.getMonth() - 2,
          1,
        );
        setDateFilter((prev) => ({
          ...prev,
          startDate: getFirstDayOfMonth(
            threeMonthsAgoDate.getFullYear(),
            threeMonthsAgoDate.getMonth(),
          ),
          endDate: getLastDayOfMonth(now.getFullYear(), now.getMonth()),
        }));
        break;
      }
      case "this-year":
        setDateFilter((prev) => ({
          ...prev,
          startDate: getFirstDayOfYear(now.getFullYear()),
          endDate: getLastDayOfYear(now.getFullYear()),
        }));
        break;
      case "all-time":
        setDateFilter((prev) => ({ ...prev, startDate: "", endDate: "" }));
        break;
    }
  }, []);

  // Determine which preset is currently active (for button highlighting)
  const activePreset = useMemo(() => {
    const now = new Date();
    if (
      dateFilter.startDate ===
        getFirstDayOfMonth(now.getFullYear(), now.getMonth()) &&
      dateFilter.endDate ===
        getLastDayOfMonth(now.getFullYear(), now.getMonth())
    )
      return "this-month";
    const lastMonthYear =
      now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    if (
      dateFilter.startDate === getFirstDayOfMonth(lastMonthYear, lastMonth) &&
      dateFilter.endDate === getLastDayOfMonth(lastMonthYear, lastMonth)
    )
      return "last-month";
    const threeMonthsAgoDate = new Date(
      now.getFullYear(),
      now.getMonth() - 2,
      1,
    );
    if (
      dateFilter.startDate ===
        getFirstDayOfMonth(
          threeMonthsAgoDate.getFullYear(),
          threeMonthsAgoDate.getMonth(),
        ) &&
      dateFilter.endDate ===
        getLastDayOfMonth(now.getFullYear(), now.getMonth())
    )
      return "last-3-months";
    if (
      dateFilter.startDate === getFirstDayOfYear(now.getFullYear()) &&
      dateFilter.endDate === getLastDayOfYear(now.getFullYear())
    )
      return "this-year";
    if (dateFilter.startDate === "" && dateFilter.endDate === "")
      return "all-time";
    return null;
  }, [dateFilter.startDate, dateFilter.endDate]);

  // Filter transactions by date range (and virtual flag) before computing chart aggregates
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Exclude virtual unless showVirtual is enabled
      if (!dateFilter.showVirtual && t.is_virtual === true) return false;
      if (dateFilter.startDate && t.date < dateFilter.startDate) return false;
      if (dateFilter.endDate && t.date > dateFilter.endDate) return false;
      return true;
    });
  }, [transactions, dateFilter]);

  const monthlyData = useMemo(
    () => buildMonthlyData(filteredTransactions, accounts),
    [filteredTransactions, accounts],
  );

  const expenseCategoryData = useMemo(
    () => buildCategoryData(filteredTransactions, "purchase", categories),
    [filteredTransactions, categories],
  );

  const incomeCategoryData = useMemo(
    () => buildCategoryData(filteredTransactions, "earning", categories),
    [filteredTransactions, categories],
  );

  const hasMonthlyData = monthlyData.length > 0;
  const hasExpenseCategoryData = expenseCategoryData.length > 0;
  const hasIncomeCategoryData = incomeCategoryData.length > 0;

  return (
    <div className="charts-page">
      {/* Page header */}
      <div className="charts-header">
        <div className="charts-header-text">
          <h1 className="charts-title">Charts</h1>
          <p className="charts-subtitle">Visual overview of your finances</p>
        </div>
      </div>

      {/* Date range filter bar */}
      <div className="filter-bar">
        <div className="filter-group filter-group--date">
          <label className="filter-label">Date Range</label>
          <div className="date-range-inputs">
            <input
              type="text"
              inputMode="numeric"
              className="filter-input filter-input--date"
              value={isoToDisplay(dateFilter.startDate)}
              onChange={(e) => {
                const display = e.target.value;
                if (display === "") {
                  setDateField("startDate", "");
                } else if (isValidDisplayDate(display)) {
                  setDateField("startDate", displayToIso(display));
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
              value={isoToDisplay(dateFilter.endDate)}
              onChange={(e) => {
                const display = e.target.value;
                if (display === "") {
                  setDateField("endDate", "");
                } else if (isValidDisplayDate(display)) {
                  setDateField("endDate", displayToIso(display));
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

        {/* Show projected transactions toggle */}
        <div className="filter-group filter-group--virtual">
          <label className="filter-label filter-label--checkbox">
            <input
              type="checkbox"
              checked={dateFilter.showVirtual}
              onChange={(e) =>
                setDateFilter((prev) => ({
                  ...prev,
                  showVirtual: e.target.checked,
                }))
              }
            />
            Include projected transactions
          </label>
        </div>
      </div>

      {/* Warning note when projected transactions are included */}
      {dateFilter.showVirtual && (
        <div className="charts-virtual-warning">
          ⚠️ Includes projected transactions — chart data reflects forecasted
          values, not actual balances.
        </div>
      )}

      {/* Combo chart — income/expense bars + running balance line */}
      <section className="charts-section">
        <div className="charts-section-header">
          <h2 className="charts-section-title">Income vs Expenses</h2>
          <p className="charts-section-desc">
            Monthly income &amp; expenses with running account balance
          </p>
        </div>

        <div className="chart-card">
          {hasMonthlyData ? (
            <ResponsiveContainer width="100%" height={340}>
              <ComposedChart
                data={monthlyData}
                margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-color)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                  axisLine={{ stroke: "var(--border-color)" }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="bars"
                  tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v.toLocaleString("en-US", { maximumFractionDigits: 0 })
                  }
                  width={72}
                />
                <YAxis
                  yAxisId="balance"
                  orientation="right"
                  tick={{ fill: "var(--text-tertiary)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) =>
                    v.toLocaleString("en-US", { maximumFractionDigits: 0 })
                  }
                  width={80}
                />
                <Tooltip content={<ComboTooltipContent />} />
                <Legend
                  wrapperStyle={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                    paddingTop: "12px",
                  }}
                />
                <Bar
                  yAxisId="bars"
                  dataKey="income"
                  name="Income"
                  fill="#6bff6b"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={48}
                />
                <Bar
                  yAxisId="bars"
                  dataKey="expenses"
                  name="Expenses"
                  fill="#ff6b6b"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={48}
                />
                <Line
                  yAxisId="balance"
                  type="monotone"
                  dataKey="balance"
                  name="Balance"
                  stroke="#e0e0e0"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#e0e0e0", strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#e0e0e0" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="chart-empty-state">
              <span className="chart-empty-icon">📈</span>
              <p>No transaction data to display yet.</p>
              <p className="chart-empty-hint">
                Add some income and expense transactions to see your trends.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Pie charts — expenses and income by category, side by side */}
      <section className="charts-section">
        <div className="charts-section-header">
          <h2 className="charts-section-title">
            Spending &amp; Income by Category
          </h2>
          <p className="charts-section-desc">
            Breakdown of expense and income transactions by category
          </p>
        </div>

        <div className="pie-charts-row">
          {/* Expenses by category */}
          <div className="pie-charts-col">
            <h3 className="pie-chart-col-title">Expenses by Category</h3>
            <div className="chart-card chart-card--pie">
              {hasExpenseCategoryData ? (
                <div className="pie-chart-layout">
                  <div className="pie-chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={expenseCategoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          innerRadius={56}
                          paddingAngle={2}
                        >
                          {expenseCategoryData.map((entry, index) => (
                            <Cell
                              key={`cell-exp-${index}`}
                              fill={entry.color}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <PieLegend data={expenseCategoryData} />
                </div>
              ) : (
                <div className="chart-empty-state">
                  <span className="chart-empty-icon">🥧</span>
                  <p>No expense data to display yet.</p>
                  <p className="chart-empty-hint">
                    Add some expense transactions to see your spending
                    breakdown.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Income by category */}
          <div className="pie-charts-col">
            <h3 className="pie-chart-col-title">Income by Category</h3>
            <div className="chart-card chart-card--pie">
              {hasIncomeCategoryData ? (
                <div className="pie-chart-layout">
                  <div className="pie-chart-container">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={incomeCategoryData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={120}
                          innerRadius={56}
                          paddingAngle={2}
                        >
                          {incomeCategoryData.map((entry, index) => (
                            <Cell
                              key={`cell-inc-${index}`}
                              fill={entry.color}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <PieLegend data={incomeCategoryData} />
                </div>
              ) : (
                <div className="chart-empty-state">
                  <span className="chart-empty-icon">💰</span>
                  <p>No income data to display yet.</p>
                  <p className="chart-empty-hint">
                    Add some income transactions to see your earnings breakdown.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
