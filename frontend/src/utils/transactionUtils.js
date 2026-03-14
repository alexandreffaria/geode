/**
 * Transaction utility functions for creating and manipulating transaction objects.
 */

/**
 * Creates and returns an empty transaction object with default values.
 * The date is set to today's date in ISO format.
 *
 * @returns {Object} A new empty transaction object
 */
export function getEmptyTransaction() {
  const today = new Date().toISOString().split("T")[0];
  return {
    id: "",
    date: today,
    source: "",
    destination: "",
    amount: 0,
    description: "",
    currency: "BRL",
    tags: "",
    status: "cleared",
  };
}

/**
 * Sorts transactions by date, newest first.
 *
 * @param {Array<Object>} transactions - Array of transaction objects
 * @returns {Array<Object>} New sorted array of transactions
 */
export function sortTransactionsByDate(transactions) {
  return [...transactions].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Determines the transaction mode based on source and destination accounts.
 *
 * @param {Object} transaction - Transaction object with source and destination
 * @returns {string} Transaction mode: 'income', 'expense', or 'transfer'
 */
export function determineTransactionMode(transaction) {
  if (transaction.source.startsWith("Income")) {
    return "income";
  } else if (transaction.destination.startsWith("Expenses")) {
    return "expense";
  } else {
    return "transfer";
  }
}
