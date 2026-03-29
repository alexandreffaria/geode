import { useState, useCallback } from "react";
import { Outlet, NavLink } from "react-router-dom";
import type { Transaction, Account, Category } from "../../types";
import { TransactionModal } from "../TransactionModal";
import "./AppLayout.css";

interface AppLayoutProps {
  modalState: {
    isOpen: boolean;
    mode: "add" | "edit";
    transaction: Transaction | null;
  };
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  mainAccountName?: string;
  onCloseModal: () => void;
  onModalSuccess: () => void;
  /** Called after each successful save when "Create and start a new one" is active.
   *  Refreshes the background transaction list without closing the modal. */
  onTransactionCreated?: () => void;
  error: string | null;
  onRetry: () => void;
}

export function AppLayout({
  modalState,
  transactions,
  accounts,
  categories,
  mainAccountName,
  onCloseModal,
  onModalSuccess,
  onTransactionCreated,
  error,
  onRetry,
}: AppLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(
    () => localStorage.getItem("sidebar-collapsed") === "true",
  );

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="app-sidebar" data-collapsed={isCollapsed}>
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon" aria-hidden="true">
            💰
          </span>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">Geode</span>
            <span className="sidebar-brand-tagline">Personal Finance</span>
          </div>
          <button
            type="button"
            className="sidebar-collapse-btn"
            onClick={toggleCollapsed}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? "›" : "‹"}
          </button>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? " sidebar-nav-link--active" : ""}`
            }
            title="Dashboard"
          >
            <span className="sidebar-nav-icon" aria-hidden="true">
              📊
            </span>
            <span className="sidebar-nav-label">Dashboard</span>
          </NavLink>
          <NavLink
            to="/transactions"
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? " sidebar-nav-link--active" : ""}`
            }
            title="Transactions"
          >
            <span className="sidebar-nav-icon" aria-hidden="true">
              📋
            </span>
            <span className="sidebar-nav-label">Transactions</span>
          </NavLink>
          <NavLink
            to="/charts"
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? " sidebar-nav-link--active" : ""}`
            }
            title="Charts"
          >
            <span className="sidebar-nav-icon" aria-hidden="true">
              📈
            </span>
            <span className="sidebar-nav-label">Charts</span>
          </NavLink>
          <NavLink
            to="/accounts"
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? " sidebar-nav-link--active" : ""}`
            }
            title="Accounts"
          >
            <span className="sidebar-nav-icon" aria-hidden="true">
              🏦
            </span>
            <span className="sidebar-nav-label">Accounts</span>
          </NavLink>
          <NavLink
            to="/categories"
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? " sidebar-nav-link--active" : ""}`
            }
            title="Categories"
          >
            <span className="sidebar-nav-icon" aria-hidden="true">
              🏷️
            </span>
            <span className="sidebar-nav-label">Categories</span>
          </NavLink>
          <NavLink
            to="/importer"
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? " sidebar-nav-link--active" : ""}`
            }
            title="Importer"
          >
            <span className="sidebar-nav-icon" aria-hidden="true">
              📥
            </span>
            <span className="sidebar-nav-label">Importer</span>
          </NavLink>
        </nav>
      </aside>

      {/* Main content */}
      <main className="app-content">
        {error && (
          <div className="global-error" role="alert">
            <span>{error}</span>
            <button type="button" className="retry-button" onClick={onRetry}>
              Retry
            </button>
          </div>
        )}
        <Outlet />
      </main>

      {/* Transaction modal */}
      <TransactionModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        transaction={modalState.transaction ?? undefined}
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        mainAccountName={mainAccountName}
        onClose={onCloseModal}
        onSuccess={onModalSuccess}
        onTransactionCreated={onTransactionCreated}
      />
    </div>
  );
}
