/**
 * Account utility functions for handling account paths and types
 * in the double-entry accounting system.
 */

/**
 * Resolves a short account name to its full accounting path.
 * Looks for existing accounts that end with the given name (case-insensitive),
 * or creates a new path with the default prefix if not found.
 *
 * @param {string} shortName - The short name to resolve (e.g., "PagBank")
 * @param {string} defaultPrefix - The default prefix to use if not found (e.g., "Assets:Liquid")
 * @param {string[]} allAccountNames - Array of all existing account paths
 * @returns {string} The full account path (e.g., "Assets:Liquid:PagBank")
 */
export function resolveAccount(shortName, defaultPrefix, allAccountNames) {
  const cleanName = shortName.trim();
  // Look for an existing account that ends with what you typed
  const existing = allAccountNames.find(
    (a) => a.split(":").pop().toLowerCase() === cleanName.toLowerCase(),
  );
  return existing
    ? existing
    : `${defaultPrefix}:${cleanName.replace(/\s+/g, "")}`;
}

/**
 * Extracts the short name (last segment) from a full account path.
 *
 * @param {string} fullPath - The full account path (e.g., "Assets:Liquid:PagBank")
 * @returns {string} The short name (e.g., "PagBank")
 */
export function extractShortName(fullPath) {
  return fullPath.split(":").pop();
}

/**
 * Extracts the account type (second segment) from a full account path.
 *
 * @param {string} fullPath - The full account path (e.g., "Assets:Liquid:PagBank")
 * @returns {string} The account type (e.g., "Liquid") or "Other" if not found
 */
export function extractAccountType(fullPath) {
  const parts = fullPath.split(":");
  return parts[1] || "Other";
}

/**
 * Checks if an account is an Asset account.
 *
 * @param {string} fullPath - The full account path
 * @returns {boolean} True if the account starts with "Assets"
 */
export function isAssetAccount(fullPath) {
  return fullPath.startsWith("Assets");
}

/**
 * Checks if an account is a Liability account.
 *
 * @param {string} fullPath - The full account path
 * @returns {boolean} True if the account starts with "Liabilities"
 */
export function isLiabilityAccount(fullPath) {
  return fullPath.startsWith("Liabilities");
}

/**
 * Checks if an account is an Income account.
 *
 * @param {string} fullPath - The full account path
 * @returns {boolean} True if the account starts with "Income"
 */
export function isIncomeAccount(fullPath) {
  return fullPath.startsWith("Income");
}

/**
 * Checks if an account is an Expense account.
 *
 * @param {string} fullPath - The full account path
 * @returns {boolean} True if the account starts with "Expenses"
 */
export function isExpenseAccount(fullPath) {
  return fullPath.startsWith("Expenses");
}
