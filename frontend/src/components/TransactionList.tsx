import type { Transaction, Category, Account } from "../types";
import { CURRENCY_SYMBOLS } from "../constants";
import {
  formatDate,
  formatCurrency,
  isTransactionPending,
  formatBillMonth,
  getTransactionBillMonth,
  resolveCategoryName,
} from "../utils/transactionUtils";
import "./TransactionList.css";

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  accounts?: Account[];
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

const getCategoryField = (
  transaction: Transaction,
  categories: Category[],
): string => {
  if (transaction.type === "purchase" || transaction.type === "earning") {
    return resolveCategoryName(transaction.category, categories) || "—";
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
  categories,
  accounts = [],
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
                const categoryField = getCategoryField(transaction, categories);
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
                          {transaction.type.charAt(0).toUpperCase() +
                            transaction.type.slice(1)}
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
                        {transaction.installment_total != null &&
                          transaction.installment_total > 0 && (
                            <span className="installment-badge">
                              {transaction.installment_current}/
                              {transaction.installment_total}
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
                        {formatCurrency(
                          transaction.amount,
                          (transaction as unknown as { currency?: string })
                            .currency || "BRL",
                        )}
                      </span>
                      {transaction.type === "transfer" &&
                        transaction.transfer_rate != null &&
                        transaction.transfer_rate > 0 &&
                        (() => {
                          const fromAcc = accounts.find(
                            (a) => a.name === transaction.from_account,
                          );
                          const toAcc = accounts.find(
                            (a) => a.name === transaction.to_account,
                          );
                          if (
                            fromAcc &&
                            toAcc &&
                            fromAcc.currency !== toAcc.currency
                          ) {
                            const symbol =
                              CURRENCY_SYMBOLS[toAcc.currency] ??
                              toAcc.currency + " ";
                            return (
                              <span className="transfer-rate-tag">
                                {fromAcc.currency} → {toAcc.currency}: {symbol}
                                {transaction.transfer_rate.toFixed(2)}
                              </span>
                            );
                          }
                          return (
                            <span className="transfer-rate-tag">
                              rate: {transaction.transfer_rate.toFixed(4)}
                            </span>
                          );
                        })()}
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
