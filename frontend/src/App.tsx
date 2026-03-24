import { useState, useEffect } from "react";
import type { Transaction, Account } from "./types";
import { apiService } from "./services/api";
import { TransactionForm } from "./components/TransactionForm";
import { TransactionList } from "./components/TransactionList";
import { AccountList } from "./components/AccountList";
import "./App.css";

function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setError(null);
      const [transactionsData, accountsData] = await Promise.all([
        apiService.getTransactions(),
        apiService.getAccounts(),
      ]);
      setTransactions(transactionsData.reverse()); // Show newest first
      setAccounts(accountsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTransactionAdded = () => {
    fetchData(); // Refresh all data after adding a transaction
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
          <button onClick={fetchData} className="retry-button">
            Retry
          </button>
        </div>
      )}

      <main className="app-main">
        <div className="left-column">
          <AccountList accounts={accounts} />
          <TransactionForm
            accounts={accounts}
            onTransactionAdded={handleTransactionAdded}
          />
        </div>
        <div className="right-column">
          <TransactionList transactions={transactions} />
        </div>
      </main>
    </div>
  );
}

export default App;
