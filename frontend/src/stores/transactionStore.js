/**
 * Transaction store - manages transaction data and backend operations.
 * Provides a centralized store for all transactions with CRUD operations.
 */

import { writable } from "svelte/store";
import {
  GetTransactions,
  AddTransaction,
  UpdateTransaction,
  DeleteTransaction,
} from "../../wailsjs/go/main/App.js";

// Create the writable store for transactions
const { subscribe, set, update } = writable([]);

/**
 * Loads all transactions from the backend and updates the store.
 *
 * @returns {Promise<void>}
 */
export async function loadTransactions() {
  const txs = await GetTransactions();
  set(txs);
}

/**
 * Adds a new transaction to the backend and reloads the store.
 *
 * @param {Object} transaction - The transaction object to add
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function addTransaction(transaction) {
  const success = await AddTransaction(transaction);
  if (success) {
    await loadTransactions();
  }
  return success;
}

/**
 * Updates an existing transaction in the backend and reloads the store.
 *
 * @param {Object} transaction - The transaction object to update
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function updateTransaction(transaction) {
  const success = await UpdateTransaction(transaction);
  if (success) {
    await loadTransactions();
  }
  return success;
}

/**
 * Deletes a transaction from the backend and reloads the store.
 *
 * @param {string} id - The ID of the transaction to delete
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function deleteTransaction(id) {
  const success = await DeleteTransaction(id);
  if (success) {
    await loadTransactions();
  }
  return success;
}

// Export the store
export const transactions = {
  subscribe,
};
