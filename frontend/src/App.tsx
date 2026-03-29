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
import { CreditCardBillModal } from "./components/CreditCardBillModal";

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

  // ── Delete transaction ──────────────────────────────────────────────────────
  const handleDeleteTransaction = useCallback(
    async (transaction: Transaction) => {
      if (
        !window.confirm(
          "Are you sure you want to delete this transaction? This will reverse its effects on account balances.",
        )
      ) {
        return;
      }
      try {
        await apiService.deleteTransaction(transaction.id);
        await refetchData();
      } catch (err) {
        console.error("Failed to delete transaction:", err);
      }
    },
    [refetchData],
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

  // ── Account/Category modal state ────────────────────────────────────────────
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

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
              isAccountModalOpen={isAccountModalOpen}
              isCategoryModalOpen={isCategoryModalOpen}
              transactions={transactions}
              accounts={accounts}
              categories={categories}
              mainAccountName={mainAccount?.name}
              onCloseModal={closeModal}
              onModalSuccess={handleModalSuccess}
              onOpenAccountModal={() => setIsAccountModalOpen(true)}
              onCloseAccountModal={() => setIsAccountModalOpen(false)}
              onOpenCategoryModal={() => setIsCategoryModalOpen(true)}
              onCloseCategoryModal={() => setIsCategoryModalOpen(false)}
              onCreateAccount={createAccount}
              onUpdateAccount={updateAccount}
              onDeleteAccount={deleteAccount}
              onSetMainAccount={setMainAccount}
              onCreateCategory={createCategory}
              onUpdateCategory={updateCategory}
              onDeleteCategory={deleteCategory}
              onViewBills={handleViewBills}
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
        </Route>
      </Routes>

      {/* Global credit card bills modal (opened from AccountManagementModal) */}
      {billsAccount && (
        <CreditCardBillModal
          account={billsAccount}
          accounts={accounts}
          isOpen={true}
          onClose={() => setBillsAccount(null)}
          onPaymentMade={refetchData}
        />
      )}
    </BrowserRouter>
  );
}

export default App;
