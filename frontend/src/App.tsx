import { useState, useCallback } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import type { Transaction, Account } from "./types";
import { apiService } from "./services/api";
import { useTransactions } from "./hooks/useTransactions";
import { useAccounts } from "./hooks/useAccounts";
import { useCategories } from "./hooks/useCategories";
import { useExchangeRates } from "./hooks/useExchangeRates";
import { AppLayout } from "./components/layout/AppLayout";
import { Dashboard } from "./pages/Dashboard";
import { TransactionsPage } from "./pages/TransactionsPage";
import { ChartsPage } from "./pages/ChartsPage";
import { AccountsPage } from "./pages/AccountsPage";
import { CategoriesPage } from "./pages/CategoriesPage";
import { ImporterPage } from "./pages/ImporterPage";
import { CreditCardBillModal } from "./components/CreditCardBillModal";
import {
  RecurringDeleteDialog,
  type DeleteScope,
} from "./components/RecurringDeleteDialog";

function App() {
  // ── Data hooks ──────────────────────────────────────────────────────────────
  const {
    transactions,
    loading: transactionsLoading,
    error: transactionsError,
    refetch: refetchTransactions,
    realizeTransaction,
    unrealizeTransaction,
  } = useTransactions();

  const {
    accounts,
    mainAccount,
    loading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
    createAccount,
    updateAccount,
    deleteAccount,
    setMainAccount,
  } = useAccounts();

  const { categories, createCategory, updateCategory, deleteCategory } =
    useCategories();

  const { data: exchangeRates } = useExchangeRates();

  const loading = transactionsLoading || accountsLoading;
  const error = transactionsError || accountsError;

  // ── Refetch helper ──────────────────────────────────────────────────────────
  const refetchData = useCallback(async () => {
    await Promise.all([refetchTransactions(), refetchAccounts()]);
  }, [refetchTransactions, refetchAccounts]);

  // ── Transaction modal state ─────────────────────────────────────────────────
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    transaction: Transaction | null;
  }>({
    isOpen: false,
    mode: "add",
    transaction: null,
  });

  const openAddModal = useCallback(() => {
    setModalState({ isOpen: true, mode: "add", transaction: null });
  }, []);

  const openEditModal = useCallback((transaction: Transaction) => {
    setModalState({ isOpen: true, mode: "edit", transaction });
  }, []);

  const closeModal = useCallback(() => {
    setModalState({ isOpen: false, mode: "add", transaction: null });
  }, []);

  const handleModalSuccess = useCallback(() => {
    refetchData();
    closeModal();
  }, [refetchData, closeModal]);

  // ── Delete transaction dialog state ────────────────────────────────────────
  const [deleteDialogState, setDeleteDialogState] = useState<{
    isOpen: boolean;
    transaction: Transaction | null;
    loading: boolean;
    error: string | null;
  }>({
    isOpen: false,
    transaction: null,
    loading: false,
    error: null,
  });

  const handleDeleteTransaction = useCallback((transaction: Transaction) => {
    setDeleteDialogState({
      isOpen: true,
      transaction,
      loading: false,
      error: null,
    });
  }, []);

  const handleDeleteDialogCancel = useCallback(() => {
    setDeleteDialogState({
      isOpen: false,
      transaction: null,
      loading: false,
      error: null,
    });
  }, []);

  const handleDeleteDialogConfirm = useCallback(
    async (scope: DeleteScope) => {
      const { transaction } = deleteDialogState;
      if (!transaction) return;

      setDeleteDialogState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        if (scope === "single") {
          await apiService.deleteTransaction(transaction.id);
        } else if (scope === "future") {
          await apiService.deleteFutureRecurring(transaction.id);
        } else {
          // scope === "all"
          await apiService.deleteRecurringGroup(
            transaction.recurrence_group_id!,
          );
        }
        // Close dialog first, then refetch so the UI updates cleanly
        setDeleteDialogState({
          isOpen: false,
          transaction: null,
          loading: false,
          error: null,
        });
        await refetchData();
      } catch (err) {
        setDeleteDialogState((prev) => ({
          ...prev,
          loading: false,
          error:
            err instanceof Error ? err.message : "Failed to delete transaction",
        }));
      }
    },
    [deleteDialogState, refetchData],
  );

  // ── Realize transaction (virtual → real) ────────────────────────────────────
  const handleRealizeTransaction = useCallback(
    async (transaction: Transaction) => {
      try {
        await realizeTransaction(transaction.id);
        // realizeTransaction already updates local state optimistically;
        // also refresh accounts since balances change on realize
        await refetchAccounts();
      } catch (err) {
        console.error("Failed to realize transaction:", err);
      }
    },
    [realizeTransaction, refetchAccounts],
  );

  // ── Unrealize transaction (real → virtual) ───────────────────────────────────
  const handleUnrealizeTransaction = useCallback(
    async (transaction: Transaction) => {
      try {
        await unrealizeTransaction(transaction.id);
        // unrealizeTransaction already updates local state optimistically;
        // also refresh accounts since balances change on unrealize
        await refetchAccounts();
      } catch (err) {
        console.error("Failed to unrealize transaction:", err);
      }
    },
    [unrealizeTransaction, refetchAccounts],
  );

  // ── Credit card bills modal state ───────────────────────────────────────────
  const [billsAccount, setBillsAccount] = useState<Account | null>(null);

  const handleViewBills = useCallback((account: Account) => {
    setBillsAccount(account);
  }, []);

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (loading) {
    return <div className="app-loading">Loading…</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          element={
            <AppLayout
              modalState={modalState}
              transactions={transactions}
              accounts={accounts}
              categories={categories}
              mainAccountName={mainAccount?.name}
              onCloseModal={closeModal}
              onModalSuccess={handleModalSuccess}
              onTransactionCreated={refetchTransactions}
              error={error}
              onRetry={refetchData}
            />
          }
        >
          <Route
            index
            element={
              <Dashboard
                transactions={transactions}
                accounts={accounts}
                categories={categories}
                exchangeRates={exchangeRates}
                onAddTransaction={openAddModal}
                onEditTransaction={openEditModal}
                onDeleteTransaction={handleDeleteTransaction}
                onRefreshData={refetchData}
                onOpenBillModal={handleViewBills}
              />
            }
          />
          <Route
            path="/transactions"
            element={
              <TransactionsPage
                transactions={transactions}
                accounts={accounts}
                categories={categories}
                onAddTransaction={openAddModal}
                onEditTransaction={openEditModal}
                onDeleteTransaction={handleDeleteTransaction}
                onRealizeTransaction={handleRealizeTransaction}
                onUnrealizeTransaction={handleUnrealizeTransaction}
              />
            }
          />
          <Route
            path="/charts"
            element={
              <ChartsPage
                transactions={transactions}
                categories={categories}
                accounts={accounts}
              />
            }
          />
          <Route
            path="/accounts"
            element={
              <AccountsPage
                accounts={accounts}
                onCreateAccount={createAccount}
                onUpdateAccount={updateAccount}
                onDeleteAccount={deleteAccount}
                onSetMainAccount={setMainAccount}
                onViewBills={handleViewBills}
              />
            }
          />
          <Route
            path="/categories"
            element={
              <CategoriesPage
                categories={categories}
                onCreateCategory={createCategory}
                onUpdateCategory={updateCategory}
                onDeleteCategory={deleteCategory}
              />
            }
          />
          <Route path="/importer" element={<ImporterPage />} />
        </Route>
      </Routes>

      {/* Global credit card bills modal (opened from AccountsPage) */}
      {billsAccount && (
        <CreditCardBillModal
          account={billsAccount}
          accounts={accounts}
          isOpen={true}
          onClose={() => setBillsAccount(null)}
          onPaymentMade={refetchData}
        />
      )}

      {/* Global delete confirmation dialog */}
      {deleteDialogState.transaction && (
        <RecurringDeleteDialog
          transaction={deleteDialogState.transaction}
          isOpen={deleteDialogState.isOpen}
          loading={deleteDialogState.loading}
          error={deleteDialogState.error}
          onConfirm={handleDeleteDialogConfirm}
          onCancel={handleDeleteDialogCancel}
        />
      )}
    </BrowserRouter>
  );
}

export default App;
