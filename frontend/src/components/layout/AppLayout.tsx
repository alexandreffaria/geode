import { NavLink, Outlet } from "react-router-dom";
import type {
  Account,
  Category,
  Transaction,
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
  // Modal state
  modalState: {
    isOpen: boolean;
    mode: "add" | "edit";
    transaction: Transaction | null;
  };
  isAccountModalOpen: boolean;
  isCategoryModalOpen: boolean;
  // Data
  accounts: Account[];
  categories: Category[];
  // Handlers
  onCloseModal: () => void;
  onModalSuccess: () => void;
  onOpenAccountModal: () => void;
  onCloseAccountModal: () => void;
  onOpenCategoryModal: () => void;
  onCloseCategoryModal: () => void;
  onCreateAccount: (data: CreateAccountRequest) => Promise<void>;
  onUpdateAccount: (name: string, data: UpdateAccountRequest) => Promise<void>;
  onDeleteAccount: (name: string) => Promise<void>;
  onCreateCategory: (data: CreateCategoryRequest) => Promise<void>;
  onUpdateCategory: (
    name: string,
    data: UpdateCategoryRequest,
  ) => Promise<void>;
  onDeleteCategory: (name: string) => Promise<void>;
  onViewBills?: (account: Account) => void;
  error: string | null;
  onRetry: () => void;
}

export function AppLayout({
  modalState,
  isAccountModalOpen,
  isCategoryModalOpen,
  accounts,
  categories,
  onCloseModal,
  onModalSuccess,
  onOpenAccountModal,
  onCloseAccountModal,
  onOpenCategoryModal,
  onCloseCategoryModal,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onCreateCategory,
  onUpdateCategory,
  onDeleteCategory,
  onViewBills,
  error,
  onRetry,
}: AppLayoutProps) {
  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">🧭</span>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-name">Geode</span>
            <span className="sidebar-brand-tagline">Track your coins.</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? " sidebar-nav-link--active" : ""}`
            }
          >
            <span className="sidebar-nav-icon">🏠</span>
            <span className="sidebar-nav-label">Dashboard</span>
          </NavLink>
          <NavLink
            to="/transactions"
            className={({ isActive }) =>
              `sidebar-nav-link${isActive ? " sidebar-nav-link--active" : ""}`
            }
          >
            <span className="sidebar-nav-icon">📋</span>
            <span className="sidebar-nav-label">Transactions</span>
          </NavLink>
        </nav>

        <div className="sidebar-actions">
          <button
            className="sidebar-action-btn sidebar-action-btn--categories"
            onClick={onOpenCategoryModal}
            type="button"
            aria-label="Manage categories"
          >
            <span className="sidebar-action-icon">🏷️</span>
            <span className="sidebar-action-label">Categories</span>
          </button>
          <button
            className="sidebar-action-btn sidebar-action-btn--accounts"
            onClick={onOpenAccountModal}
            type="button"
            aria-label="Manage accounts"
          >
            <span className="sidebar-action-icon">👤</span>
            <span className="sidebar-action-label">Accounts</span>
          </button>
        </div>
      </aside>

      <div className="app-content">
        {error && (
          <div className="global-error">
            <strong>Error:</strong> {error}
            <button onClick={onRetry} className="retry-button">
              Retry
            </button>
          </div>
        )}
        <Outlet />
      </div>

      {/* Global Modals */}
      <TransactionModal
        isOpen={modalState.isOpen}
        mode={modalState.mode}
        transaction={modalState.transaction ?? undefined}
        accounts={accounts}
        categories={categories}
        onClose={onCloseModal}
        onSuccess={onModalSuccess}
      />

      <AccountManagementModal
        isOpen={isAccountModalOpen}
        accounts={accounts}
        onClose={onCloseAccountModal}
        onCreateAccount={onCreateAccount}
        onUpdateAccount={onUpdateAccount}
        onDeleteAccount={onDeleteAccount}
        onViewBills={onViewBills}
      />

      <CategoryManagementModal
        isOpen={isCategoryModalOpen}
        onClose={onCloseCategoryModal}
        categories={categories}
        onCreateCategory={onCreateCategory}
        onUpdateCategory={onUpdateCategory}
        onDeleteCategory={onDeleteCategory}
      />
    </div>
  );
}
