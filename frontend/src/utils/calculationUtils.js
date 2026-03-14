/**
 * Calculation utilities for double-entry accounting operations.
 * All functions are pure and have no side effects.
 */

import {
  isAssetAccount,
  isLiabilityAccount,
  isIncomeAccount,
  isExpenseAccount,
} from "./accountUtils.js";

/**
 * Calculates account balances from transactions using double-entry bookkeeping.
 * Each transaction increases the destination account and decreases the source account.
 *
 * @param {Array<Object>} transactions - Array of transaction objects
 * @returns {Object} Object mapping account names to their balances
 */
export function calculateAccountBalances(transactions) {
  return transactions.reduce((acc, tx) => {
    if (!acc[tx.destination]) acc[tx.destination] = 0;
    acc[tx.destination] += tx.amount;

    if (!acc[tx.source]) acc[tx.source] = 0;
    acc[tx.source] -= tx.amount;

    return acc;
  }, {});
}

/**
 * Calculates the total liquid cash from account balances.
 * Liquid cash includes all accounts under "Assets:Liquid".
 *
 * @param {Object} accountBalances - Object mapping account names to balances
 * @returns {number} Total liquid cash amount
 */
export function calculateLiquidCash(accountBalances) {
  return Object.entries(accountBalances)
    .filter(([name]) => name.startsWith("Assets:Liquid"))
    .reduce((sum, [_, bal]) => sum + bal, 0);
}

/**
 * Calculates the total assets from account balances.
 *
 * @param {Object} accountBalances - Object mapping account names to balances
 * @returns {number} Total assets amount
 */
export function calculateTotalAssets(accountBalances) {
  return Object.entries(accountBalances)
    .filter(([name]) => isAssetAccount(name))
    .reduce((sum, [_, bal]) => sum + bal, 0);
}

/**
 * Calculates the total liabilities from account balances.
 * Note: Liabilities are typically negative in double-entry accounting.
 *
 * @param {Object} accountBalances - Object mapping account names to balances
 * @returns {number} Total liabilities amount
 */
export function calculateTotalLiabilities(accountBalances) {
  return Object.entries(accountBalances)
    .filter(([name]) => isLiabilityAccount(name))
    .reduce((sum, [_, bal]) => sum + bal, 0);
}

/**
 * Calculates net worth from account balances.
 * Net worth = Total Assets + Total Liabilities (liabilities are negative).
 *
 * @param {Object} accountBalances - Object mapping account names to balances
 * @returns {number} Net worth amount
 */
export function calculateNetWorth(accountBalances) {
  const totalAssets = calculateTotalAssets(accountBalances);
  const totalLiabilities = calculateTotalLiabilities(accountBalances);
  return totalAssets + totalLiabilities;
}

/**
 * Calculates total income from transactions.
 * Income transactions have a source that starts with "Income".
 *
 * @param {Array<Object>} transactions - Array of transaction objects
 * @returns {number} Total income amount
 */
export function calculateTotalIncome(transactions) {
  return transactions
    .filter((t) => isIncomeAccount(t.source))
    .reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Calculates total expenses from transactions.
 * Expense transactions have a destination that starts with "Expenses".
 *
 * @param {Array<Object>} transactions - Array of transaction objects
 * @returns {number} Total expenses amount
 */
export function calculateTotalExpenses(transactions) {
  return transactions
    .filter((t) => isExpenseAccount(t.destination))
    .reduce((sum, t) => sum + t.amount, 0);
}
