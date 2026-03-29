import { useMemo, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import type { Account, Category, ExchangeRate, Transaction } from "../types";
import { CURRENCY_SYMBOLS } from "../constants";
import { Avatar } from "../components/ui/Avatar";
import { formatCurrency, resolveCategoryName } from "../utils/transactionUtils";
import "./Dashboard.css";

interface DashboardProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  exchangeRates: ExchangeRate | null;
  onAddTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
  onRefreshData?: () => void;
  onOpenBillModal?: (account: Account) => void;
}

function getCurrentMonthPrefix(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Returns today's date as "YYYY-MM-DD" in local time (avoids UTC offset issues). */
function getTodayLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Returns a date N days from today as "YYYY-MM-DD" in local time. */
function getDatePlusDays(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Formats a date string "YYYY-MM-DD" as a short due date like "Mar 29". */
function formatDueDate(dateStr: string): string {
  // Use T12:00:00 to avoid UTC midnight off-by-one in local timezones
  const date = new Date(dateStr + "T12:00:00");
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

interface BillRow {
  id: string;
  description: string;
  categoryId: string;
  account: string;
  date: string;
  amount: number;
  currency: string;
  isOverdue: boolean;
}

interface BillsTableProps {
  title: string;
  bills: BillRow[];
  categories: Category[];
  emptyMessage: string;
  accentClass: string;
}

function BillsTable({
  title,
  bills,
  categories,
  emptyMessage,
  accentClass,
}: BillsTableProps) {
  return (
    <div className={`bills-table-card ${accentClass}`}>
      <h3 className="bills-table-title">{title}</h3>
      {bills.length === 0 ? (
        <p className="bills-empty-state">{emptyMessage}</p>
      ) : (
        <div className="bills-table-wrapper">
          <table className="bills-table">
            <thead>
              <tr>
                <th className="bills-th">Description</th>
                <th className="bills-th">Category</th>
                <th className="bills-th">Account</th>
                <th className="bills-th bills-th--date">Due Date</th>
                <th className="bills-th bills-th--amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((bill) => (
                <tr
                  key={bill.id}
                  className={`bills-tr ${bill.isOverdue ? "bills-tr--overdue" : ""}`}
                >
                  <td className="bills-td bills-td--description">
                    {bill.isOverdue && (
                      <span
                        className="bills-overdue-badge"
                        title="Overdue"
                        aria-label="Overdue"
                      >
                        Overdue
                      </span>
                    )}
                    <span className="bills-description-text">
                      {bill.description || <em className="bills-no-desc">—</em>}
                    </span>
                  </td>
                  <td className="bills-td bills-td--category">
                    {resolveCategoryName(bill.categoryId, categories)}
                  </td>
                  <td className="bills-td bills-td--account">{bill.account}</td>
                  <td className="bills-td bills-td--date">
                    {formatDueDate(bill.date)}
                  </td>
                  <td className="bills-td bills-td--amount">
                    {formatCurrency(bill.amount, bill.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function Dashboard({
  transactions,
  accounts,
  categories,
  exchangeRates,
  onAddTransaction,
  onEditTransaction: _onEditTransaction,
  onDeleteTransaction: _onDeleteTransaction,
  onOpenBillModal,
}: DashboardProps) {
  const navigate = useNavigate();
  const activeAccounts = useMemo(
    () => accounts.filter((a) => !a.archived),
    [accounts],
  );

  const checkingAccounts = useMemo(
    () => activeAccounts.filter((a) => a.type !== "credit_card"),
    [activeAccounts],
  );

  const creditCardAccounts = useMemo(
    () => activeAccounts.filter((a) => a.type === "credit_card"),
    [activeAccounts],
  );

  const monthPrefix = useMemo(() => getCurrentMonthPrefix(), []);

  const navigateToTransactions = useCallback(
    (accountName: string) => {
      const params = new URLSearchParams({
        account: accountName,
        month: monthPrefix,
      });
      navigate(`/transactions?${params.toString()}`);
    },
    [navigate, monthPrefix],
  );

  const currentMonthTransactions = useMemo(
    () => transactions.filter((t) => t.date.startsWith(monthPrefix)),
    [transactions, monthPrefix],
  );

  const monthlySummary = useMemo(() => {
    let income = 0;
    let expenses = 0;

    for (const t of currentMonthTransactions) {
      // Skip virtual (projected) transactions — they don't affect real balances
      if (t.is_virtual === true) continue;
      // Skip pending (unpaid) transactions from summary
      if (t.paid === false) continue;
      if (t.type === "earning") {
        income += t.amount;
      } else if (t.type === "purchase") {
        expenses += t.amount;
      }
    }

    return { income, expenses, net: income - expenses };
  }, [currentMonthTransactions]);

  // Primary currency for summary display (most common among active accounts, fallback BRL)
  const primaryCurrency = useMemo(() => {
    if (activeAccounts.length === 0) return "BRL";
    const counts: Record<string, number> = {};
    for (const a of activeAccounts) {
      counts[a.currency] = (counts[a.currency] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }, [activeAccounts]);

  const currencySymbol = CURRENCY_SYMBOLS[primaryCurrency] ?? primaryCurrency;

  const mainAccount = accounts.find((a) => a.is_main);
  const baseCurrency = mainAccount?.currency ?? primaryCurrency;

  // Total balance across all active accounts, converted to baseCurrency
  const totalBalance = useMemo(() => {
    if (!exchangeRates || exchangeRates.base !== baseCurrency) return null;
    let sum = 0;
    for (const account of activeAccounts) {
      if (account.currency === baseCurrency) {
        sum += account.balance;
      } else {
        const rate = exchangeRates.rates[account.currency];
        if (rate == null || rate === 0) continue;
        sum += account.balance / rate;
      }
    }
    // DIAGNOSTIC LOG: confirm totalBalance sign before display
    console.log(
      "[DEBUG] totalBalance computed:",
      sum,
      "| isNegative:",
      sum < 0,
    );
    return sum;
  }, [exchangeRates, baseCurrency, activeAccounts]);

  // Total unpaid credit card debt
  const totalCreditDebt = useMemo(
    () =>
      creditCardAccounts.reduce(
        (sum, a) => sum + Math.abs(Math.min(a.balance, 0)),
        0,
      ),
    [creditCardAccounts],
  );

  // ── Bills to Pay / Bills to Receive ──────────────────────────────────────
  const { billsToPay, billsToReceive } = useMemo(() => {
    const today = getTodayLocalDateString();
    const cutoff = getDatePlusDays(15);

    // Build a lookup map: account name → currency
    const accountCurrencyMap: Record<string, string> = {};
    for (const a of accounts) {
      accountCurrencyMap[a.name] = a.currency;
    }

    const pay: BillRow[] = [];
    const receive: BillRow[] = [];

    for (const t of transactions) {
      // Only virtual transactions
      if (t.is_virtual !== true) continue;
      // Only purchase or earning (not transfer)
      if (t.type !== "purchase" && t.type !== "earning") continue;

      const isOverdue = t.date < today;
      const isUpcoming = t.date >= today && t.date <= cutoff;

      if (!isOverdue && !isUpcoming) continue;

      const account = t.account;
      const currency = accountCurrencyMap[account] ?? primaryCurrency;

      const row: BillRow = {
        id: t.id,
        description: t.description ?? "",
        categoryId: t.category ?? "",
        account,
        date: t.date,
        amount: t.amount,
        currency,
        isOverdue,
      };

      if (t.type === "purchase") {
        pay.push(row);
      } else {
        receive.push(row);
      }
    }

    // Sort: overdue first (ascending date), then upcoming (ascending date)
    const sortBills = (a: BillRow, b: BillRow) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return a.date.localeCompare(b.date);
    };

    pay.sort(sortBills);
    receive.sort(sortBills);

    return { billsToPay: pay, billsToReceive: receive };
  }, [transactions, accounts, primaryCurrency]);

  return (
    <div className="dashboard">
      {/* Page header */}
      <div className="dashboard-header">
        <div className="dashboard-header-text">
          <h1 className="dashboard-title">Dashboard</h1>
          <p className="dashboard-subtitle">{getMonthLabel()} overview</p>
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

      {/* Total balance card */}
      <section className="dashboard-section">
        <h2 className="section-title">Overview</h2>
        <div className="summary-cards summary-cards--overview">
          <div className="summary-card summary-card--total-balance">
            <div className="summary-card-label">Total Balance</div>
            {totalBalance !== null ? (
              <div
                className={`summary-card-amount ${totalBalance >= 0 ? "amount-positive" : "amount-negative"}`}
              >
                {formatCurrency(totalBalance, baseCurrency, true)}
              </div>
            ) : (
              <div className="summary-card-amount summary-card-amount--unavailable">
                —
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Monthly summary cards */}
      <section className="dashboard-section">
        <h2 className="section-title">This Month</h2>
        <div className="summary-cards">
          <div className="summary-card summary-card--income">
            <div className="summary-card-label">Income</div>
            <div className="summary-card-amount amount-positive">
              +{currencySymbol}
              {monthlySummary.income.toFixed(2)}
            </div>
          </div>
          <div className="summary-card summary-card--expenses">
            <div className="summary-card-label">Expenses</div>
            <div className="summary-card-amount amount-negative">
              -{currencySymbol}
              {monthlySummary.expenses.toFixed(2)}
            </div>
          </div>
          <div className="summary-card summary-card--net">
            <div className="summary-card-label">Net</div>
            <div
              className={`summary-card-amount ${
                monthlySummary.net >= 0 ? "amount-positive" : "amount-negative"
              }`}
            >
              {monthlySummary.net >= 0 ? "+" : "-"}
              {currencySymbol}
              {Math.abs(monthlySummary.net).toFixed(2)}
            </div>
          </div>
          {totalCreditDebt > 0 && (
            <div className="summary-card summary-card--credit-debt">
              <div className="summary-card-label">💳 Credit Debt</div>
              <div className="summary-card-amount amount-negative">
                -{currencySymbol}
                {totalCreditDebt.toFixed(2)}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Checking account balances */}
      {checkingAccounts.length > 0 && (
        <section className="dashboard-section">
          <h2 className="section-title">Accounts</h2>
          <div className="accounts-grid">
            {checkingAccounts.map((account) => {
              return (
                <div
                  key={account.name}
                  className="account-card account-card--clickable"
                  role="button"
                  tabIndex={0}
                  onClick={() => navigateToTransactions(account.name)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigateToTransactions(account.name);
                    }
                  }}
                  aria-label={`View transactions for ${account.name}`}
                >
                  <div className="account-card-header">
                    <Avatar
                      name={account.name}
                      gradientStart={account.gradient_start}
                      gradientEnd={account.gradient_end}
                      imageUrl={account.image_url || undefined}
                      size={40}
                    />
                    <div className="account-card-info">
                      <div className="account-name">{account.name}</div>
                      <span className="account-currency-badge">
                        {account.currency}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`account-balance ${
                      account.balance >= 0
                        ? "amount-positive"
                        : "amount-negative"
                    }`}
                  >
                    {formatCurrency(account.balance, account.currency)}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Credit card accounts */}
      {creditCardAccounts.length > 0 && (
        <section className="dashboard-section">
          <h2 className="section-title">💳 Credit Cards</h2>
          <div className="accounts-grid">
            {creditCardAccounts.map((account) => {
              const symbol =
                CURRENCY_SYMBOLS[account.currency] ?? account.currency;
              // For credit cards, balance is typically negative (debt)
              const debt = Math.abs(Math.min(account.balance, 0));
              const hasDebt = account.balance < 0;
              return (
                <div
                  key={account.name}
                  className="account-card account-card--credit-dashboard account-card--clickable"
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    // Don't navigate if the "View Bills" button was clicked
                    const target = e.target as HTMLElement;
                    if (target.closest(".account-view-bills-btn-dashboard"))
                      return;
                    navigateToTransactions(account.name);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigateToTransactions(account.name);
                    }
                  }}
                  aria-label={`View transactions for ${account.name}`}
                >
                  <div className="account-card-header">
                    <Avatar
                      name={account.name}
                      gradientStart={account.gradient_start}
                      gradientEnd={account.gradient_end}
                      imageUrl={account.image_url || undefined}
                      size={40}
                    />
                    <div className="account-card-info">
                      <div className="account-name">{account.name}</div>
                      <span className="account-currency-badge">
                        {account.currency}
                      </span>
                    </div>
                  </div>
                  <div
                    className={`account-balance ${hasDebt ? "amount-negative" : "amount-positive"}`}
                  >
                    {hasDebt
                      ? `-${symbol}${debt.toFixed(2)}`
                      : `${symbol}${account.balance.toFixed(2)}`}
                  </div>
                  {account.credit_limit != null && (
                    <div className="account-credit-limit-bar">
                      <div className="account-credit-limit-label">
                        <span>Used</span>
                        <span>
                          {symbol}
                          {debt.toFixed(2)} / {symbol}
                          {account.credit_limit.toFixed(2)}
                        </span>
                      </div>
                      <div className="account-credit-limit-track">
                        <div
                          className="account-credit-limit-fill"
                          style={{
                            width: `${Math.min(100, (debt / account.credit_limit) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <button
                    type="button"
                    className="account-view-bills-btn-dashboard"
                    onClick={() => onOpenBillModal?.(account)}
                  >
                    📋 View Bills
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Bills to Pay & Bills to Receive */}
      <section className="dashboard-section">
        <div className="section-header">
          <h2 className="section-title">Upcoming Bills</h2>
          <Link to="/transactions" className="section-link">
            View all →
          </Link>
        </div>
        <div className="bills-grid">
          <BillsTable
            title="💸 Bills to Pay"
            bills={billsToPay}
            categories={categories}
            emptyMessage="No bills to pay in the next 15 days 🎉"
            accentClass="bills-table-card--pay"
          />
          <BillsTable
            title="💰 Bills to Receive"
            bills={billsToReceive}
            categories={categories}
            emptyMessage="No income expected in the next 15 days."
            accentClass="bills-table-card--receive"
          />
        </div>
      </section>
    </div>
  );
}
