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

  const getFromField = (transaction: Transaction) => {
    if (transaction.type === "transfer") {
      return transaction.from_account;
    } else if (transaction.type === "purchase") {
      return transaction.account;
    }
    return "—"; // earning has no "from"
  };

  const getToField = (transaction: Transaction) => {
    if (transaction.type === "transfer") {
      return transaction.to_account;
    } else if (transaction.type === "earning") {
      return transaction.account;
    }
    return "—"; // purchase has no "to"
  };

  const getCategoryField = (transaction: Transaction) => {
    if (transaction.type === "purchase" || transaction.type === "earning") {
      return transaction.category;
    }
    return "—"; // transfer has no category
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
                <th>Account/From</th>
                <th>Category/To</th>
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
                  <td className="account-cell">{getFromField(transaction)}</td>
                  <td className="account-cell">
                    {getCategoryField(transaction) !== "—"
                      ? getCategoryField(transaction)
                      : getToField(transaction)}
                  </td>
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
