import { useState } from "react";
import type { Transaction } from "./types";
import { apiService } from "./services/api";
import { useTransactions } from "./hooks/useTransactions";
import { useAccounts } from "./hooks/useAccounts";
import { useCategories } from "./hooks/useCategories";
import { TransactionModal } from "./components/TransactionModal";
import { AccountManagementModal } from "./components/AccountManagementModal";
import { CategoryManagementModal } from "./components/CategoryManagementModal";
import { TransactionList } from "./components/TransactionList";
import { AccountList } from "./components/AccountList";
import "./App.css";

function App() {
  // Use custom hooks for data fetching
  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
  } = useTransactions();

  const {
    accounts,
    loading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
  } = useAccounts();

  const { categories, createCategory, updateCategory, deleteCategory } =
    useCategories();

  // Combine loading and error states
  const loading = transactionsLoading || accountsLoading;
  const error = transactionsError || accountsError;

  // Transaction modal state
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    transaction: Transaction | null;
  }>({
    isOpen: false,
    mode: "add",
    transaction: null,
  });

  // Account management modal state
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

  // Category management modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Refetch both transactions and accounts
  const refetchData = async () => {
    await Promise.all([refetchTransactions(), refetchAccounts()]);
  };

  // Transaction modal handler functions
  const openAddModal = () => {
    setModalState({ isOpen: true, mode: "add", transaction: null });
  };

  const openEditModal = (transaction: Transaction) => {
    setModalState({ isOpen: true, mode: "edit", transaction });
  };

  const closeModal = () => {
    setModalState({ isOpen: false, mode: "add", transaction: null });
  };

  const handleModalSuccess = () => {
    refetchData();
    closeModal();
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    const confirmMessage = `Are you sure you want to delete this transaction? This will reverse its effects on account balances.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await apiService.deleteTransaction(transaction.id);
      await refetchData();
    } catch (err) {
      console.error("Failed to delete transaction:", err);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-left">
          <h1>💰 Personal Finance Manager</h1>
          <p className="subtitle">
            Track your transactions and manage your accounts
          </p>
        </div>
        <nav className="app-header-nav">
          <button
            className="nav-button nav-button--categories"
            onClick={() => setIsCategoryModalOpen(true)}
            type="button"
            aria-label="Manage categories"
          >
            🏷️ Categories
          </button>
          <button
            className="nav-button nav-button--accounts"
            onClick={() => setIsAccountModalOpen(true)}
            type="button"
            aria-label="Manage accounts"
          >
            ⚙️ Accounts
          </button>
        </nav>
      </header>

      {error && (
        <div className="global-error">
          <strong>Error:</strong> {error}
          <button onClick={refetchData} className="retry-button">
            Retry
          </button>
        </div>
      )}

      <main className="app-main">
        <div className="left-column">
          <AccountList accounts={accounts} />
          <button className="add-transaction-button" onClick={openAddModal}>
            <span className="button-icon">+</span>
            Add Transaction
          </button>
        </div>
        <div className="right-column">
          <TransactionList
            transactions={transactions}
            onEditTransaction={openEditModal}
            onDeleteTransaction={handleDeleteTransaction}
          />
        </div>
      </main>

      {/* Transaction Modal */}
      {modalState.isOpen && (
        <TransactionModal
          isOpen={modalState.isOpen}
          mode={modalState.mode}
          transaction={modalState.transaction ?? undefined}
          accounts={accounts}
          categories={categories}
          onClose={closeModal}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Account Management Modal */}
      {isAccountModalOpen && (
        <AccountManagementModal
          isOpen={isAccountModalOpen}
          accounts={accounts}
          onClose={() => setIsAccountModalOpen(false)}
          onCreateAccount={createAccount}
          onUpdateAccount={updateAccount}
          onDeleteAccount={deleteAccount}
        />
      )}

      {/* Category Management Modal */}
      {isCategoryModalOpen && (
        <CategoryManagementModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          categories={categories}
          onCreateCategory={createCategory}
          onUpdateCategory={updateCategory}
          onDeleteCategory={deleteCategory}
        />
      )}
    </div>
  );
}

export default App;
