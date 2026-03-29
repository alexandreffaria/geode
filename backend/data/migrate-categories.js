#!/usr/bin/env node
/**
 * migrate-categories.js
 *
 * Migrates the Geode category system from name-based references to UUID-based IDs.
 *
 * Changes applied:
 *   categories.json:
 *     - Adds `id` (UUID) to each category that lacks one
 *     - Resolves `parent_name` → `parent_id` (UUID) and removes `parent_name`
 *
 *   transactions.json:
 *     - Replaces the `category` name string with the matching category UUID
 *
 * The script is idempotent: running it a second time on already-migrated data
 * is a no-op (existing `id` fields are preserved, already-UUID category fields
 * are left untouched).
 *
 * Backups are written to *.backup before any file is modified.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ── Paths ────────────────────────────────────────────────────────────────────

const DATA_DIR = path.join(__dirname);
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");
const TRANSACTIONS_FILE = path.join(DATA_DIR, "transactions.json");

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Returns true when the string looks like a UUID v4. */
function isUUID(str) {
  return (
    typeof str === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)
  );
}

function readJSON(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function backup(filePath) {
  if (!fs.existsSync(filePath)) return;
  const backupPath = filePath + ".backup";
  fs.copyFileSync(filePath, backupPath);
  console.log(`  ✔ Backed up → ${path.basename(backupPath)}`);
}

// ── Step 1: Migrate categories ───────────────────────────────────────────────

console.log("\n═══════════════════════════════════════════════");
console.log("  Geode — Category UUID Migration");
console.log("═══════════════════════════════════════════════\n");

let categories = readJSON(CATEGORIES_FILE);

if (!categories) {
  console.log(
    "categories.json not found — creating empty file and skipping category migration.",
  );
  writeJSON(CATEGORIES_FILE, []);
  categories = [];
}

console.log(
  `[1/4] Migrating categories.json  (${categories.length} records found)`,
);
backup(CATEGORIES_FILE);

// Pass 1 — assign UUIDs to every category that doesn't already have one
let categoriesAssigned = 0;
for (const cat of categories) {
  if (!cat.id) {
    cat.id = crypto.randomUUID();
    categoriesAssigned++;
  }
}
console.log(
  `  ✔ UUIDs assigned to ${categoriesAssigned} categor${categoriesAssigned === 1 ? "y" : "ies"} (${categories.length - categoriesAssigned} already had IDs)`,
);

// Build a name → UUID lookup map (case-sensitive, matching stored names exactly)
const nameToID = new Map();
for (const cat of categories) {
  nameToID.set(cat.name, cat.id);
}

// Pass 2 — resolve parent_name → parent_id, then remove parent_name
let parentResolved = 0;
let parentWarnings = 0;

for (const cat of categories) {
  // Already migrated: has parent_id (or no parent at all) and no parent_name
  if (!Object.prototype.hasOwnProperty.call(cat, "parent_name")) {
    continue; // fully migrated already
  }

  const pName = cat.parent_name;

  if (pName === null || pName === undefined || pName === "") {
    // Root category — ensure parent_id is absent (or null per Go omitempty)
    delete cat.parent_name;
    // Leave parent_id absent so Go's omitempty omits it
    continue;
  }

  // Has a parent name to resolve
  if (!cat.parent_id) {
    const parentUUID = nameToID.get(pName);
    if (parentUUID) {
      cat.parent_id = parentUUID;
      parentResolved++;
    } else {
      console.warn(
        `  ⚠ WARNING: parent_name "${pName}" for category "${cat.name}" not found — parent_id left unset`,
      );
      parentWarnings++;
    }
  }

  delete cat.parent_name;
}

console.log(
  `  ✔ parent_name resolved to parent_id for ${parentResolved} categor${parentResolved === 1 ? "y" : "ies"}`,
);
if (parentWarnings > 0) {
  console.warn(
    `  ⚠ ${parentWarnings} parent reference(s) could not be resolved`,
  );
}

// Reorder fields for readability: id first, then the rest
const orderedCategories = categories.map((cat) => {
  const {
    id,
    name,
    type,
    parent_id,
    gradient_start,
    gradient_end,
    image_url,
    created_at,
    last_updated,
    ...rest
  } = cat;
  const out = { id, name, type };
  if (parent_id !== undefined) out.parent_id = parent_id;
  out.gradient_start = gradient_start;
  out.gradient_end = gradient_end;
  out.image_url = image_url;
  out.created_at = created_at;
  out.last_updated = last_updated;
  // Preserve any unexpected extra fields
  Object.assign(out, rest);
  return out;
});

writeJSON(CATEGORIES_FILE, orderedCategories);
console.log(
  `  ✔ categories.json written (${orderedCategories.length} records)\n`,
);

// ── Step 2: Migrate transactions ─────────────────────────────────────────────

let transactions = readJSON(TRANSACTIONS_FILE);

if (!transactions) {
  console.log(
    "[2/4] transactions.json not found — skipping transaction migration.\n",
  );
} else {
  console.log(
    `[2/4] Migrating transactions.json  (${transactions.length} records found)`,
  );
  backup(TRANSACTIONS_FILE);

  let txUpdated = 0;
  let txSkipped = 0; // already a UUID
  let txNoMatch = 0; // name not found in categories
  let txNoField = 0; // no category field at all

  for (const tx of transactions) {
    if (!Object.prototype.hasOwnProperty.call(tx, "category")) {
      txNoField++;
      continue;
    }

    const catValue = tx.category;

    // Already a UUID — idempotent: leave it alone
    if (isUUID(catValue)) {
      txSkipped++;
      continue;
    }

    // Look up by name
    const uuid = nameToID.get(catValue);
    if (uuid) {
      tx.category = uuid;
      txUpdated++;
    } else {
      console.warn(
        `  ⚠ WARNING: transaction "${tx.id}" has category "${catValue}" which was not found in categories — left unchanged`,
      );
      txNoMatch++;
    }
  }

  writeJSON(TRANSACTIONS_FILE, transactions);

  console.log(`  ✔ ${txUpdated} transaction(s) updated with category UUID`);
  if (txSkipped > 0)
    console.log(
      `  ✔ ${txSkipped} transaction(s) already had UUID category (skipped)`,
    );
  if (txNoField > 0)
    console.log(`  ℹ ${txNoField} transaction(s) had no category field`);
  if (txNoMatch > 0)
    console.warn(
      `  ⚠ ${txNoMatch} transaction(s) had unresolvable category names`,
    );
  console.log(
    `  ✔ transactions.json written (${transactions.length} records)\n`,
  );
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log("═══════════════════════════════════════════════");
console.log("  Migration complete");
console.log("═══════════════════════════════════════════════");
console.log(`  Categories : ${orderedCategories.length} total`);
console.log(`    • ${categoriesAssigned} received new UUIDs`);
console.log(`    • ${parentResolved} parent references resolved`);
if (transactions) {
  console.log(`  Transactions: ${transactions.length} total`);
}
if (
  parentWarnings > 0 ||
  (transactions && transactions.some((t) => !isUUID(t.category) && t.category))
) {
  console.log(
    "\n  ⚠ Some warnings were emitted above — review before deploying.",
  );
}
console.log("");
