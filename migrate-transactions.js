#!/usr/bin/env node

/**
 * Migration script to convert double-entry accounting transactions
 * to consumer-friendly budgeting app format.
 *
 * Changes:
 * - Purchase: from_account + to_account → account + category
 * - Earning: from_account + to_account → account + category
 * - Transfer: keeps from_account + to_account (no changes)
 * - Removes category "accounts" (Groceries, Employer, Coffee, etc.)
 * - Keeps only real accounts (Checking Account, Savings Account)
 */

const fs = require("fs");
const path = require("path");

const TRANSACTIONS_FILE = path.join(
  __dirname,
  "backend/data/transactions.json",
);
const ACCOUNTS_FILE = path.join(__dirname, "backend/data/accounts.json");
const BACKUP_SUFFIX = ".backup";

function backupFile(filePath) {
  const backupPath = filePath + BACKUP_SUFFIX;
  fs.copyFileSync(filePath, backupPath);
  console.log(`✓ Backed up ${filePath} to ${backupPath}`);
}

function migrateTransactions(transactions) {
  return transactions.map((t) => {
    if (t.type === "purchase") {
      // Purchase: money leaves from_account, category is to_account
      return {
        id: t.id,
        date: t.date,
        type: t.type,
        amount: t.amount,
        description: t.description,
        account: t.from_account,
        category: t.to_account,
      };
    } else if (t.type === "earning") {
      // Earning: money enters to_account, category is from_account
      return {
        id: t.id,
        date: t.date,
        type: t.type,
        amount: t.amount,
        description: t.description,
        account: t.to_account,
        category: t.from_account,
      };
    } else if (t.type === "transfer") {
      // Transfer: keep as-is
      return {
        id: t.id,
        date: t.date,
        type: t.type,
        amount: t.amount,
        description: t.description,
        from_account: t.from_account,
        to_account: t.to_account,
      };
    }
    return t;
  });
}

function filterRealAccounts(accounts) {
  // Keep only accounts that are actual bank/financial accounts
  // These typically have "Account" in the name or are known account types
  const realAccountPatterns = [
    /account/i,
    /savings/i,
    /checking/i,
    /credit/i,
    /wallet/i,
    /cash/i,
  ];

  return accounts.filter((account) => {
    return realAccountPatterns.some((pattern) => pattern.test(account.name));
  });
}

function recalculateAccountBalances(accounts, transactions) {
  // Reset all balances to 0
  const accountMap = new Map();
  accounts.forEach((acc) => {
    accountMap.set(acc.name, { ...acc, balance: 0 });
  });

  // Recalculate based on transactions
  transactions.forEach((t) => {
    if (t.type === "purchase") {
      // Decrease account balance
      const acc = accountMap.get(t.account);
      if (acc) {
        acc.balance -= t.amount;
      }
    } else if (t.type === "earning") {
      // Increase account balance
      const acc = accountMap.get(t.account);
      if (acc) {
        acc.balance += t.amount;
      }
    } else if (t.type === "transfer") {
      // Decrease from_account, increase to_account
      const fromAcc = accountMap.get(t.from_account);
      const toAcc = accountMap.get(t.to_account);
      if (fromAcc) {
        fromAcc.balance -= t.amount;
      }
      if (toAcc) {
        toAcc.balance += t.amount;
      }
    }
  });

  return Array.from(accountMap.values());
}

function main() {
  console.log("🔄 Starting transaction data migration...\n");

  // Check if files exist
  if (!fs.existsSync(TRANSACTIONS_FILE)) {
    console.error(`❌ Error: ${TRANSACTIONS_FILE} not found`);
    process.exit(1);
  }
  if (!fs.existsSync(ACCOUNTS_FILE)) {
    console.error(`❌ Error: ${ACCOUNTS_FILE} not found`);
    process.exit(1);
  }

  // Backup original files
  backupFile(TRANSACTIONS_FILE);
  backupFile(ACCOUNTS_FILE);

  // Read data
  console.log("\n📖 Reading data files...");
  const transactions = JSON.parse(fs.readFileSync(TRANSACTIONS_FILE, "utf8"));
  const accounts = JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf8"));
  console.log(`  - Found ${transactions.length} transactions`);
  console.log(`  - Found ${accounts.length} accounts`);

  // Migrate transactions
  console.log("\n🔧 Migrating transactions...");
  const migratedTransactions = migrateTransactions(transactions);
  console.log(`  - Migrated ${migratedTransactions.length} transactions`);

  // Filter real accounts
  console.log("\n🏦 Filtering real accounts...");
  const realAccounts = filterRealAccounts(accounts);
  console.log(`  - Kept ${realAccounts.length} real accounts:`);
  realAccounts.forEach((acc) => console.log(`    • ${acc.name}`));

  // Recalculate balances
  console.log("\n💰 Recalculating account balances...");
  const updatedAccounts = recalculateAccountBalances(
    realAccounts,
    migratedTransactions,
  );
  updatedAccounts.forEach((acc) => {
    console.log(`  - ${acc.name}: $${acc.balance.toFixed(2)}`);
  });

  // Write migrated data
  console.log("\n💾 Writing migrated data...");
  fs.writeFileSync(
    TRANSACTIONS_FILE,
    JSON.stringify(migratedTransactions, null, 2),
  );
  console.log(`  ✓ Updated ${TRANSACTIONS_FILE}`);

  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(updatedAccounts, null, 2));
  console.log(`  ✓ Updated ${ACCOUNTS_FILE}`);

  console.log("\n✅ Migration completed successfully!");
  console.log(`\n📝 Summary:`);
  console.log(
    `  - Transactions: ${transactions.length} → ${migratedTransactions.length}`,
  );
  console.log(`  - Accounts: ${accounts.length} → ${updatedAccounts.length}`);
  console.log(`  - Backups saved with ${BACKUP_SUFFIX} extension`);
}

// Run migration
try {
  main();
} catch (error) {
  console.error("\n❌ Migration failed:", error.message);
  console.error(error.stack);
  process.exit(1);
}
