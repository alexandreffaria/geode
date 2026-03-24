import type { Transaction } from "../types";
import "./TransactionList.css";

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTransactionTypeLabel = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <div className="transaction-list-container">
      <h2>Transaction History</h2>
      {transactions.length === 0 ? (
        <p className="no-transactions">
          No transactions yet. Add your first transaction above!
        </p>
      ) : (
        <div className="transaction-table-wrapper">
          <table className="transaction-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>From</th>
                <th>To</th>
                <th className="amount-column">Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction.id}>
                  <td className="date-cell">
                    {formatDate(transaction.timestamp)}
                  </td>
                  <td>
                    <span className={`type-badge type-${transaction.type}`}>
                      {getTransactionTypeLabel(transaction.type)}
                    </span>
                  </td>
                  <td className="description-cell">
                    {transaction.description}
                  </td>
                  <td className="account-cell">{transaction.from_account}</td>
                  <td className="account-cell">{transaction.to_account}</td>
                  <td className="amount-cell">
                    <span
                      className={`amount ${transaction.type === "earning" ? "positive" : "negative"}`}
                    >
                      {transaction.type === "earning" ? "+" : "-"}$
                      {transaction.amount.toFixed(2)}
                    </span>
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
