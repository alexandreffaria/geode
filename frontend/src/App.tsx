import { useState } from "react";
import type { Transaction } from "./types";
import { apiService } from "./services/api";
import { useTransactions } from "./hooks/useTransactions";
import { useAccounts } from "./hooks/useAccounts";
import { TransactionModal } from "./components/TransactionModal";
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
  } = useAccounts();

  // Combine loading and error states
  const loading = transactionsLoading || accountsLoading;
  const error = transactionsError || accountsError;

  // Modal state management
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    transaction: Transaction | null;
  }>({
    isOpen: false,
    mode: "add",
    transaction: null,
  });

  // Refetch both transactions and accounts
  const refetchData = async () => {
    await Promise.all([refetchTransactions(), refetchAccounts()]);
  };

  // Modal handler functions
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
    refetchData(); // Refresh all data after successful add/edit
    closeModal();
  };

  const handleDeleteTransaction = async (transaction: Transaction) => {
    const confirmMessage = `Are you sure you want to delete this transaction? This will reverse its effects on account balances.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await apiService.deleteTransaction(transaction.id);
      // Refresh data after successful deletion
      await refetchData();
    } catch (err) {
      // Error handling is done by the hooks
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
        <h1>💰 Personal Finance Manager</h1>
        <p className="subtitle">
          Track your transactions and manage your accounts
        </p>
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
          onClose={closeModal}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}

export default App;
