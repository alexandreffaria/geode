import { Outlet, NavLink } from "react-router-dom";
import type {
  Transaction,
  Account,
  Category,
  CreateAccountRequest,
  UpdateAccountRequest,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from "../../types";
import { TransactionModal } from "../TransactionModal";
import { AccountManagementModal } from "../AccountManagementModal";
import { CategoryManagementModal } from "../CategoryManagementModal";
import "./AppLayout.css";

interface AppLayoutProps {
  modalState: {
    isOpen: boolean;
    mode: "add" | "edit";
    transaction: Transaction | null;
  };
  isAccountModalOpen: boolean;
  isCategoryModalOpen: boolean;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  mainAccountName?: string;
  onCloseModal: () => void;
  onModalSuccess: () => void;
  onOpenAccountModal: () => void;
  onCloseAccountModal: () => void;
  onOpenCategoryModal: () => void;
  onCloseCategoryModal: () => void;
  onCreateAccount: (data: CreateAccountRequest) => Promise<void>;
  onUpdateAccount: (name: string, data: UpdateAccountRequest) => Promise<void>;
  onDeleteAccount: (name: string) => Promise<void>;
  onSetMainAccount: (name: string) => Promise<void>;
  onCreateCategory: (data: CreateCategoryRequest) => Promise<void>;
  onUpdateCategory: (id: string, data: UpdateCategoryRequest) => Promise<void>;
  onDeleteCategory: (id: string) => Promise<void>;
  onViewBills: (account: Account) => void;
  error: string | null;
  onRetry: () => void;
}

export function AppLayout({
  modalState,
  isAccountModalOpen,
  isCategoryModalOpen,
  transactions,
  accounts,
  categories,
  mainAccountName,
  onCloseModal,
  onModalSuccess,
  onOpenAccountModal,
  onCloseAccountModal,
  onOpenCategoryModal,
  onCloseCategoryModal,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onSetMainAccount,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onViewBills,
  error,
  onRetry,
}: AppLayoutProps) {
  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon" aria-hidden="true">
            💰
          </span>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">Geode</span>
            <span className="sidebar-brand-tagline">Personal Finance</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? " sidebar-nav-link--active" : ""}`
            }
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
          >
            <span className="sidebar-nav-icon" aria-hidden="true">
              📈
            </span>
            <span className="sidebar-nav-label">Charts</span>
          </NavLink>
        </nav>

        <div className="sidebar-actions">
          <button
            type="button"
            className="sidebar-action-btn sidebar-action-btn--accounts"
            onClick={onOpenAccountModal}
          >
            <span className="sidebar-action-icon" aria-hidden="true">
              🏦
            </span>
            <span className="sidebar-action-label">Accounts</span>
          </button>
          <button
            type="button"
            className="sidebar-action-btn sidebar-action-btn--categories"
            onClick={onOpenCategoryModal}
          >
            <span className="sidebar-action-icon" aria-hidden="true">
              🏷️
            </span>
            <span className="sidebar-action-label">Categories</span>
          </button>
        </div>
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
      />

      {/* Account management modal */}
      <AccountManagementModal
        isOpen={isAccountModalOpen}
        accounts={accounts}
        onClose={onCloseAccountModal}
        onCreateAccount={onCreateAccount}
        onUpdateAccount={onUpdateAccount}
        onDeleteAccount={onDeleteAccount}
        onSetMainAccount={onSetMainAccount}
        onViewBills={onViewBills}
      />

      {/* Category management modal */}
      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        categories={categories}
        onClose={onCloseCategoryModal}
        onCreateCategory={onCreateCategory}
        onUpdateCategory={onUpdateCategory}
        onDeleteCategory={onDeleteCategory}
      />
    </div>
  );
}
