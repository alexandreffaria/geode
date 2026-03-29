import type { Transaction } from "../types";
import {
  formatDate,
  formatAmount,
  getTransactionTypeLabel,
  isTransactionPending,
  formatBillMonth,
  getTransactionBillMonth,
} from "../utils/transactionUtils";
import "./TransactionList.css";

interface TransactionListProps {
  transactions: Transaction[];
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
}

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

const getAmountClass = (type: Transaction["type"]) => {
  if (type === "earning") return "amount amount-positive";
  if (type === "purchase") return "amount amount-negative";
  return "amount amount-neutral";
};

export function TransactionList({
  transactions,
  onEditTransaction,
  onDeleteTransaction,
}: TransactionListProps) {
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
                <th className="actions-column">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => {
                const categoryField = getCategoryField(transaction);
                const pending = isTransactionPending(transaction);
                const billMonth = getTransactionBillMonth(transaction);
                const isPaid = transaction.paid === true;

                return (
                  <tr
                    key={transaction.id}
                    className={pending ? "transaction-row--pending" : ""}
                  >
                    <td className="date-cell">
                      {formatDate(transaction.date)}
                    </td>
                    <td>
                      <div className="type-cell">
                        <span className={`type-badge type-${transaction.type}`}>
                          {getTransactionTypeLabel(transaction.type)}
                        </span>
                        {pending && (
                          <span className="status-badge status-badge--pending">
                            Pending
                          </span>
                        )}
                        {isPaid && (
                          <span className="status-badge status-badge--paid">
                            Paid
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="description-cell">
                      <div className="description-content">
                        <span>{transaction.description || "—"}</span>
                        {billMonth && (
                          <span className="bill-month-label">
                            📅 {formatBillMonth(billMonth)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="account-cell">
                      {getFromField(transaction)}
                    </td>
                    <td className="account-cell">
                      {categoryField !== "—"
                        ? categoryField
                        : getToField(transaction)}
                    </td>
                    <td className="amount-cell">
                      <span
                        className={`${getAmountClass(transaction.type)}${pending ? " amount--pending" : ""}`}
                      >
                        {formatAmount(
                          transaction.amount,
                          transaction.type === "earning",
                        )}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="edit-button"
                        onClick={() => onEditTransaction(transaction)}
                        aria-label={`Edit transaction: ${transaction.description || "No description"}`}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => onDeleteTransaction(transaction)}
                        aria-label={`Delete transaction: ${transaction.description || "No description"}`}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
