/**
 * Account store - provides derived stores for account balances and metrics.
 * All stores are derived from the transaction store and update automatically.
 */

import { derived } from "svelte/store";
import { transactions } from "./transactionStore.js";
import {
  calculateAccountBalances,
  calculateLiquidCash,
  calculateTotalAssets,
  calculateTotalLiabilities,
  calculateNetWorth,
  calculateTotalIncome,
  calculateTotalExpenses,
} from "../utils/calculationUtils.js";
import {
  extractShortName,
  extractAccountType,
  isAssetAccount,
  isLiabilityAccount,
  isExpenseAccount,
  isIncomeAccount,
} from "../utils/accountUtils.js";

/**
 * Derived store: Account balances calculated from transactions.
 * Updates automatically when transactions change.
 */
export const accountBalances = derived(transactions, ($transactions) =>
  calculateAccountBalances($transactions),
);

/**
 * Derived store: Sorted list of all account names.
 */
export const allAccountNames = derived(accountBalances, ($accountBalances) =>
  Object.keys($accountBalances).sort(),
);

/**
 * Derived store: Short names for wallet options (Assets and Liabilities accounts).
 * Used for autocomplete in the transaction form.
 */
export const walletOptions = derived(allAccountNames, ($allAccountNames) =>
  $allAccountNames
    .filter((a) => isAssetAccount(a) || isLiabilityAccount(a))
    .map((a) => extractShortName(a)),
);

/**
 * Derived store: Short names for expense category options.
 * Used for autocomplete in the transaction form.
 */
export const expenseOptions = derived(allAccountNames, ($allAccountNames) =>
  $allAccountNames
    .filter((a) => isExpenseAccount(a))
    .map((a) => extractShortName(a)),
);

/**
 * Derived store: Short names for income category options.
 * Used for autocomplete in the transaction form.
 */
export const incomeOptions = derived(allAccountNames, ($allAccountNames) =>
  $allAccountNames
    .filter((a) => isIncomeAccount(a))
    .map((a) => extractShortName(a)),
);

/**
 * Derived store: Formatted accounts for display in account cards.
 * Filters to Assets and Liabilities with non-zero balances.
 */
export const displayAccounts = derived(accountBalances, ($accountBalances) =>
  Object.entries($accountBalances)
    .filter(([name]) => isAssetAccount(name) || isLiabilityAccount(name))
    .map(([name, balance]) => ({
      fullName: name,
      shortName: extractShortName(name),
      type: extractAccountType(name),
      balance,
    }))
    .filter((acc) => Math.abs(acc.balance) > 0.01)
    .sort((a, b) => a.fullName.localeCompare(b.fullName)),
);

/**
 * Derived store: Financial metrics calculated from account balances and transactions.
 * Includes netWorth, liquidCash, totalAssets, totalLiabilities, totalIncome, totalExpenses.
 */
export const metrics = derived(
  [accountBalances, transactions],
  ([$accountBalances, $transactions]) => ({
    netWorth: calculateNetWorth($accountBalances),
    liquidCash: calculateLiquidCash($accountBalances),
    totalAssets: calculateTotalAssets($accountBalances),
    totalLiabilities: calculateTotalLiabilities($accountBalances),
    totalIncome: calculateTotalIncome($transactions),
    totalExpenses: calculateTotalExpenses($transactions),
  }),
);
