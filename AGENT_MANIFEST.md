# AGENT MANIFEST - Geode Personal Finances Tool

**Version:** 1.0  
**Last Updated:** 2026-03-23  
**Purpose:** Single source of truth for all AI-assisted development on the Geode project

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture](#architecture)
4. [Core Principles](#core-principles)
5. [Code Organization](#code-organization)
6. [Data Models](#data-models)
7. [Development Guidelines](#development-guidelines)
8. [Key Patterns](#key-patterns)
9. [Critical Areas](#critical-areas)
10. [Current Features](#current-features)
11. [AI Agent Guidelines](#ai-agent-guidelines)
12. [Future Considerations](#future-considerations)

---

## Project Overview

### Name

**Geode** - A personal finances management tool

### Purpose

Geode is a desktop application for managing personal finances using double-entry bookkeeping principles. It provides transaction tracking, account management, and financial metrics visualization.

### Core Philosophy

**Files as Source of Truth (Obsidian-like)**

- All financial data is stored in human-readable CSV files
- No database - the CSV file IS the database
- Users can directly edit the CSV file if needed
- Data portability and transparency are paramount
- The vault directory contains all user data

**Key Characteristics:**

- **Transparent**: Users can see and understand their data
- **Portable**: CSV files can be opened anywhere
- **Durable**: Plain text survives software changes
- **Auditable**: Every transaction is visible and traceable

---

## Technology Stack

### Backend

- **Language:** Go 1.23
- **Framework:** Wails v2.11.0 (Go + Web frontend)
- **Storage:** CSV files (no database)
- **Key Libraries:**
  - `encoding/csv` - CSV file operations
  - `sync` - Concurrency control (RWMutex for file locking)
  - `github.com/google/uuid` - ID generation

### Frontend

- **Framework:** Svelte 3.49.0
- **Build Tool:** Vite 3.0.7
- **Language:** JavaScript (ES6+)
- **Styling:** CSS with CSS variables
- **State Management:** Svelte stores

### Build & Development

- **Build System:** Wails CLI
- **Development:** `wails dev` (hot reload)
- **Production:** `wails build`
- **Package Manager:** npm (frontend)

---

## Architecture

### Layered Architecture

Geode follows a clean, layered architecture with clear separation of concerns:

```
┌─────────────────────────────────────┐
│         Frontend (Svelte)           │
│  Components, Stores, Utils          │
└─────────────────┬───────────────────┘
                  │ Wails RPC
┌─────────────────▼───────────────────┐
│      App Layer (app.go)             │
│  Thin controller, type conversion   │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│      Service Layer                  │
│  Business logic orchestration       │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│      Domain Layer                   │
│  Entities, validation, rules        │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│      Storage Layer                  │
│  Repository pattern, CSV operations │
└─────────────────┬───────────────────┘
                  │
┌─────────────────▼───────────────────┐
│      File System                    │
│  vault/geode.csv                    │
└─────────────────────────────────────┘
```

### Layer Responsibilities

**Frontend Layer** ([`frontend/src/`](frontend/src/))

- User interface components
- State management via Svelte stores
- Client-side validation and formatting
- Calls backend via Wails-generated bindings

**App Layer** ([`app.go`](app.go))

- Thin controller between frontend and backend
- Type conversion (frontend types ↔ domain types)
- Minimal logic - delegates to services
- Wails binding target

**Service Layer** ([`internal/service/`](internal/service/))

- Business logic orchestration
- Transaction workflows
- Balance calculations
- Input sanitization and validation
- Error handling

**Domain Layer** ([`internal/domain/`](internal/domain/))

- Core business entities (Transaction, Account, Balance)
- Business rules and validation
- Domain-specific logic
- Pure Go structs with methods

**Storage Layer** ([`internal/storage/`](internal/storage/))

- Data persistence abstraction
- Repository pattern implementation
- CSV file operations
- Atomic writes and file locking
- Search and query operations

**Validation Layer** ([`internal/validation/`](internal/validation/))

- Input validation rules
- Data sanitization
- Format checking
- Reusable validators

**Error Layer** ([`internal/errors/`](internal/errors/))

- Custom error types
- Error wrapping with context
- User-friendly error messages

---

## Core Principles

### 1. Files are the Source of Truth

**Implementation:**

- Single CSV file: [`vault/geode.csv`](vault/geode.csv)
- Human-readable format
- Direct file editing supported
- No caching layer (always read from file)

**CSV Structure:**

```csv
id,date,source,destination,amount,currency,description,status,tags
tx_1234567890,2024-01-15,Assets:Liquid:PagBank,Expenses:Mercado,150.00,BRL,Grocery shopping,cleared,food,groceries
```

### 2. Double-Entry Bookkeeping

**Every transaction has:**

- **Source account** (where money comes FROM)
- **Destination account** (where money goes TO)
- **Amount** (always positive)

**Balance Calculation:**

- Source account: balance DECREASES by amount
- Destination account: balance INCREASES by amount
- Net effect: money moves from source to destination

**Example:**

```
Transaction: Assets:Bank → Expenses:Food, 100 BRL
Result:
  - Assets:Bank balance: -100 BRL
  - Expenses:Food balance: +100 BRL
```

### 3. CSV-Based Storage with Atomic Writes

**Write Strategy:**

1. Write to temporary file (`.tmp` extension)
2. Flush and close temporary file
3. Atomically rename temp file to actual file
4. This prevents corruption if write fails

**Implementation:** See [`CSVRepository.writeAllUnlocked()`](internal/storage/csv_repository.go:326)

**File Locking:**

- `sync.RWMutex` for concurrent access control
- Read operations: `RLock()` / `RUnlock()`
- Write operations: `Lock()` / `Unlock()`

### 4. Account Hierarchy and Path Resolution

**Account Path Format:**

```
Category:Subcategory:Account
```

**Valid Categories:**

- `Assets` - Things you own (bank accounts, cash, investments)
- `Liabilities` - Things you owe (credit cards, loans)
- `Equity` - Net worth, opening balances
- `Income` - Money coming in (salary, gifts)
- `Expenses` - Money going out (food, rent, utilities)

**Examples:**

- `Assets:Liquid:PagBank` - Liquid asset in PagBank account
- `Expenses:Mercado` - Grocery expenses (2 parts minimum)
- `Income:Salary:MainJob` - Salary from main job

**Validation Rules:**

- Minimum 2 parts (Category:Account)
- No empty parts
- First part must be valid category
- Parts can contain: letters, numbers, spaces, hyphens, underscores

---

## Code Organization

### Backend Structure

```
geode/
├── main.go                          # Application entry point
├── app.go                           # Wails app struct (thin controller)
├── internal/
│   ├── domain/                      # Business entities
│   │   ├── transaction.go           # Transaction entity + validation
│   │   ├── account.go               # Account entity + path logic
│   │   └── balance.go               # Balance calculations
│   ├── service/                     # Business logic
│   │   ├── transaction_service.go   # Transaction CRUD + workflows
│   │   ├── account_service.go       # Account management
│   │   ├── balance_service.go       # Balance & metrics calculations
│   │   └── backup_service.go        # Backup/restore operations
│   ├── storage/                     # Data persistence
│   │   ├── repository.go            # Repository interface
│   │   └── csv_repository.go        # CSV implementation
│   ├── validation/                  # Input validation
│   │   └── validator.go             # Validation rules
│   └── errors/                      # Error handling
│       └── errors.go                # Custom error types
└── vault/                           # Data storage
    └── geode.csv                    # Transaction data
```

### Frontend Structure

```
frontend/src/
├── App.svelte                       # Main app component
├── main.js                          # Entry point
├── components/                      # UI components
│   ├── layout/
│   │   └── Header.svelte            # App header
│   ├── dashboard/
│   │   └── Dashboard.svelte         # Dashboard container
│   ├── accounts/
│   │   └── AccountsSection.svelte   # Accounts display
│   ├── transactions/
│   │   ├── TransactionsSection.svelte
│   │   └── TransactionRow.svelte
│   ├── modals/
│   │   ├── TransactionModal.svelte  # Add/Edit transaction
│   │   └── DeleteConfirmModal.svelte
│   └── common/                      # Reusable components
│       ├── Button.svelte
│       ├── Input.svelte
│       ├── AutocompleteInput.svelte
│       ├── MetricCard.svelte
│       └── AccountCard.svelte
├── stores/                          # State management
│   ├── transactionStore.js          # Transaction state
│   ├── accountStore.js              # Account state
│   └── uiStore.js                   # UI state (modals, etc.)
├── utils/                           # Utility functions
│   ├── formatUtils.js               # Currency, date formatting
│   ├── calculationUtils.js          # Balance calculations
│   ├── accountUtils.js              # Account path resolution
│   └── transactionUtils.js          # Transaction helpers
└── style/                           # Shared styles
    ├── variables.css                # CSS variables
    └── global.css                   # Global styles
```

---

## Data Models

### Transaction

**Location:** [`internal/domain/transaction.go`](internal/domain/transaction.go)

**Structure:**

```go
type Transaction struct {
    ID          string  // Format: "tx_<timestamp>"
    Date        string  // Format: "YYYY-MM-DD"
    Source      string  // Account path (e.g., "Assets:Bank")
    Destination string  // Account path (e.g., "Expenses:Food")
    Amount      float64 // Always positive
    Currency    string  // 3-letter code (e.g., "BRL", "USD")
    Description string  // Free text
    Status      string  // "cleared", "pending", "reconciled"
    Tags        string  // Comma-separated tags
}
```

**Validation Rules:**

- Date: Required, YYYY-MM-DD format, not in future
- Source: Required, valid account path
- Destination: Required, valid account path
- Amount: Must be > 0
- Currency: 3 uppercase letters (optional, defaults to "BRL")
- Status: One of cleared/pending/reconciled (optional, defaults to "cleared")

**Methods:**

- `Validate()` - Validates all fields
- `SetDefaults()` - Sets default values (ID, status, currency)
- `ToCSVRow()` - Converts to CSV row
- `FromCSVRow()` - Creates from CSV row

### Account

**Location:** [`internal/domain/account.go`](internal/domain/account.go)

**Structure:**

```go
type Account struct {
    Path     string   // Full path: "Assets:Liquid:PagBank"
    Category string   // Top-level: "Assets"
    Parts    []string // All parts: ["Assets", "Liquid", "PagBank"]
}
```

**Methods:**

- `NewAccount(path)` - Creates account from path string
- `IsAsset()`, `IsLiability()`, `IsEquity()`, `IsIncome()`, `IsExpense()` - Category checks
- `GetParentPath()` - Returns parent account path
- `GetName()` - Returns account name (last part)

### Balance

**Location:** [`internal/domain/balance.go`](internal/domain/balance.go)

**Structures:**

```go
type Balance struct {
    AccountPath string
    Amount      float64
    Currency    string
}

type AccountBalance struct {
    Account  *Account
    Balances map[string]float64 // Currency -> Amount
}

type BalanceSheet struct {
    Accounts map[string]*AccountBalance // AccountPath -> AccountBalance
}
```

**Key Methods:**

- `ProcessTransaction(tx)` - Updates balances for a transaction
- `GetAccountBalance(path, currency)` - Gets balance for specific account
- `GetAllBalances()` - Returns all balances sorted

---

## Development Guidelines

### Adding New Features

#### Backend Feature Addition

1. **Define Domain Model** (if needed)
   - Add to [`internal/domain/`](internal/domain/)
   - Include validation methods
   - Add business logic methods

2. **Create/Update Service**
   - Add to [`internal/service/`](internal/service/)
   - Implement business logic
   - Use repository for data access
   - Handle errors properly

3. **Update Repository** (if needed)
   - Add methods to [`Repository`](internal/storage/repository.go) interface
   - Implement in [`CSVRepository`](internal/storage/csv_repository.go)
   - Ensure atomic operations

4. **Expose via App Layer**
   - Add method to [`app.go`](app.go)
   - Convert between frontend and domain types
   - Call service layer
   - Return boolean or data to frontend

5. **Add Validation** (if needed)
   - Add validators to [`internal/validation/validator.go`](internal/validation/validator.go)
   - Use in service layer

#### Frontend Feature Addition

1. **Create/Update Store**
   - Add to [`frontend/src/stores/`](frontend/src/stores/)
   - Import Wails-generated bindings
   - Implement async operations
   - Export reactive store

2. **Create Components**
   - Add to appropriate [`frontend/src/components/`](frontend/src/components/) subdirectory
   - Keep components small and focused
   - Use props for data, events for actions
   - Style with scoped CSS

3. **Add Utilities** (if needed)
   - Add to [`frontend/src/utils/`](frontend/src/utils/)
   - Keep pure functions
   - Export named functions

4. **Update UI**
   - Import components in parent
   - Subscribe to stores
   - Handle user interactions

### Naming Conventions

#### Backend (Go)

**Files:**

- Lowercase with underscores: `transaction_service.go`
- Match primary type: `csv_repository.go` contains `CSVRepository`

**Types:**

- PascalCase: `TransactionService`, `CSVRepository`
- Interfaces: Noun without "I" prefix: `Repository`

**Functions/Methods:**

- PascalCase (exported): `Create()`, `GetAll()`
- camelCase (private): `getAllUnlocked()`, `writeAllUnlocked()`

**Variables:**

- camelCase: `transactions`, `balanceSheet`
- Short names in small scopes: `tx`, `err`

#### Frontend (JavaScript/Svelte)

**Files:**

- PascalCase for components: `TransactionModal.svelte`
- camelCase for utilities: `formatUtils.js`
- camelCase for stores: `transactionStore.js`

**Functions:**

- camelCase: `loadTransactions()`, `formatCurrency()`
- Async functions: prefix with verb: `loadTransactions()`, `addTransaction()`

**Variables:**

- camelCase: `transactions`, `accountBalances`
- Constants: UPPER_SNAKE_CASE: `DEFAULT_CURRENCY`

**Components:**

- PascalCase: `TransactionModal`, `MetricCard`
- Props: camelCase: `export let accountPath`

### Error Handling Patterns

#### Backend Error Handling

**Custom Error Types:**

```go
// Validation errors
errors.NewValidationError("field", "message")
errors.WrapValidationError("field", "message", err)

// Not found errors
errors.NewNotFoundError("resource", "id")

// Storage errors
errors.NewStorageError("operation", "message")
errors.WrapStorageError("operation", "message", err)
```

**Service Layer Pattern:**

```go
func (s *TransactionService) Create(tx *domain.Transaction) error {
    // Sanitize inputs
    tx.Description = validation.SanitizeString(tx.Description)

    // Set defaults
    tx.SetDefaults()

    // Validate
    if err := tx.Validate(); err != nil {
        return err // Return domain error
    }

    // Persist
    return s.repo.Create(tx)
}
```

**App Layer Pattern:**

```go
func (a *App) AddTransaction(tx Transaction) bool {
    // Convert to domain type
    domainTx := &domain.Transaction{...}

    // Call service
    if err := a.transactionService.Create(domainTx); err != nil {
        fmt.Printf("Error adding transaction: %v\n", err)
        return false
    }

    return true
}
```

#### Frontend Error Handling

**Store Pattern:**

```javascript
export async function addTransaction(transaction) {
  try {
    const success = await AddTransaction(transaction);
    if (success) {
      await loadTransactions();
    }
    return success;
  } catch (error) {
    console.error("Failed to add transaction:", error);
    return false;
  }
}
```

**Component Pattern:**

```javascript
async function handleSubmit() {
  const success = await addTransaction(formData);
  if (!success) {
    // Show error message to user
    errorMessage = "Failed to add transaction. Please try again.";
  }
}
```

### Code Quality Standards

**Backend:**

- Use `gofmt` for formatting
- Handle all errors explicitly
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused
- Use interfaces for abstraction
- Validate all inputs
- Use proper error types

**Frontend:**

- Use consistent indentation (2 spaces)
- Keep components under 200 lines
- Extract reusable logic to utilities
- Use semantic HTML
- Add ARIA labels for accessibility
- Use CSS variables for theming
- Avoid inline styles
- Comment complex reactive statements

---

## Key Patterns

### Repository Pattern

**Interface:** [`internal/storage/repository.go`](internal/storage/repository.go)

**Purpose:** Abstract data access, allow different storage implementations

**Usage:**

```go
type Repository interface {
    Create(tx *domain.Transaction) error
    GetAll() ([]*domain.Transaction, error)
    GetByID(id string) (*domain.Transaction, error)
    Update(tx *domain.Transaction) error
    Delete(id string) error
    Search(criteria SearchCriteria) ([]*domain.Transaction, error)
    Backup(backupPath string) error
    Restore(backupPath string) error
}
```

**Benefits:**

- Can swap CSV for SQLite later
- Easy to mock for testing
- Clear contract for data operations

### State Management (Svelte Stores)

**Pattern:** Writable stores with async operations

**Example:** [`frontend/src/stores/transactionStore.js`](frontend/src/stores/transactionStore.js)

```javascript
import { writable } from "svelte/store";

const { subscribe, set, update } = writable([]);

export async function loadTransactions() {
  const txs = await GetTransactions();
  set(txs);
}

export const transactions = { subscribe };
```

**Usage in Components:**

```svelte
<script>
    import { transactions } from './stores/transactionStore.js';
</script>

{#each $transactions as tx}
    <TransactionRow {tx} />
{/each}
```

### Utility Functions

**Location:** [`frontend/src/utils/`](frontend/src/utils/)

**Pattern:** Pure functions, named exports

**Example:**

```javascript
// formatUtils.js
export function formatCurrency(amount, currency = "BRL") {
  return `${currency} ${amount.toFixed(2)}`;
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString();
}
```

---

## Critical Areas

### High-Risk Code Requiring Extra Care

#### 1. Account Path Resolution

**Location:** [`internal/domain/account.go`](internal/domain/account.go), [`frontend/src/utils/accountUtils.js`](frontend/src/utils/accountUtils.js)

**Why Critical:**

- Incorrect paths break double-entry bookkeeping
- Invalid categories cause calculation errors
- Path parsing errors corrupt data

**Rules:**

- Always validate account paths before use
- Ensure category is one of: Assets, Liabilities, Equity, Income, Expenses
- Minimum 2 parts (Category:Account)
- No empty parts

**Testing Checklist:**

- Valid paths accepted
- Invalid paths rejected
- Edge cases handled (empty, single part, special chars)

#### 2. Double-Entry Balance Calculations

**Location:** [`internal/domain/balance.go`](internal/domain/balance.go), [`internal/service/balance_service.go`](internal/service/balance_service.go)

**Why Critical:**

- Incorrect calculations show wrong balances
- Sign errors (+ vs -) break accounting equation
- Currency mixing causes incorrect totals

**Rules:**

- Source account: SUBTRACT amount
- Destination account: ADD amount
- Always process both sides of transaction
- Handle multiple currencies separately
- Net worth = Assets - Liabilities (not + Liabilities)

**Testing Checklist:**

- Simple transaction: A→B, verify both balances
- Multiple transactions: verify cumulative effect
- Multiple currencies: verify separation
- Net worth calculation: verify Assets - Liabilities

#### 3. CSV File Operations

**Location:** [`internal/storage/csv_repository.go`](internal/storage/csv_repository.go)

**Why Critical:**

- File corruption loses all user data
- Concurrent access causes race conditions
- Failed writes leave incomplete data

**Rules:**

- ALWAYS use file locking (RWMutex)
- ALWAYS write to temp file first, then rename
- ALWAYS close files in defer statements
- ALWAYS flush CSV writer before closing
- NEVER write directly to main file

**Atomic Write Pattern:**

```go
func (r *CSVRepository) writeAllUnlocked(transactions []*domain.Transaction) error {
    // 1. Write to temp file
    tempPath := r.filePath + ".tmp"
    file, err := os.Create(tempPath)
    if err != nil {
        return err
    }
    defer file.Close()

    // 2. Write data
    writer := csv.NewWriter(file)
    defer writer.Flush()
    // ... write rows ...

    // 3. Close file
    file.Close()

    // 4. Atomic rename
    if err := os.Rename(tempPath, r.filePath); err != nil {
        os.Remove(tempPath)
        return err
    }

    return nil
}
```

**Testing Checklist:**

- Write succeeds: file updated correctly
- Write fails: original file unchanged
- Concurrent reads during write: no corruption
- Power loss during write: file recoverable

#### 4. Transaction Validation

**Location:** [`internal/domain/transaction.go`](internal/domain/transaction.go), [`internal/validation/validator.go`](internal/validation/validator.go)

**Why Critical:**

- Invalid data corrupts CSV file
- Missing validation allows bad transactions
- Incorrect dates break chronological order

**Rules:**

- Validate BEFORE writing to storage
- Sanitize user input (remove newlines, null bytes)
- Check date format and range
- Verify amount is positive
- Validate account paths exist and are valid

**Validation Checklist:**

- Date: YYYY-MM-DD format, not in future
- Amount: > 0, reasonable maximum
- Accounts: valid paths, valid categories
- Currency: 3 uppercase letters
- Status: one of cleared/pending/reconciled

---

## Current Features

### Transaction Management

- ✅ Add new transactions (expense/income/transfer)
- ✅ View all transactions in ledger
- ✅ Edit existing transactions
- ✅ Delete transactions with confirmation
- ✅ Transaction validation

### Account Management

- ✅ Hierarchical account structure
- ✅ Account path validation
- ✅ Account autocomplete
- ✅ Balance calculation per account
- ✅ Multi-currency support

### Dashboard & Metrics

- ✅ Net worth calculation (Assets - Liabilities)
- ✅ Liquid cash display
- ✅ Total income calculation
- ✅ Total expenses calculation
- ✅ Account balances by category

### Data Storage

- ✅ CSV-based storage
- ✅ Atomic file writes
- ✅ File locking for concurrent access
- ✅ Backup functionality
- ✅ Restore from backup

### User Interface

- ✅ Clean, modern design
- ✅ Modal-based transaction entry
- ✅ Autocomplete for accounts
- ✅ Responsive layout
- ✅ Empty state handling

---

## AI Agent Guidelines

### When Working on This Codebase

#### 1. Always Respect the Architecture

**DO:**

- Follow the layered architecture
- Put code in the correct layer
- Use existing patterns and conventions
- Respect separation of concerns

**DON'T:**

- Mix layers (e.g., UI logic in domain)
- Bypass services to access storage directly
- Add business logic to app.go
- Create circular dependencies

#### 2. Maintain Data Integrity

**DO:**

- Validate all inputs before storage
- Use atomic writes for CSV operations
- Acquire locks before file operations
- Handle errors at every layer

**DON'T:**

- Write directly to CSV without locking
- Skip validation "for speed"
- Ignore errors
- Assume data is always valid

#### 3. Follow Double-Entry Principles

**DO:**

- Always update both source and destination
- Keep amounts positive
- Validate account paths
- Test balance calculations

**DON'T:**

- Create one-sided transactions
- Use negative amounts
- Mix up source and destination
- Forget to update balances

#### 4. Preserve User Data

**DO:**

- Test with backup data first
- Use atomic operations
- Validate before writing
- Handle edge cases

**DON'T:**

- Modify CSV format without migration
- Delete data without confirmation
- Skip backup before major changes
- Assume file always exists

#### 5. Write Clear, Maintainable Code

**DO:**

- Use meaningful names
- Add comments for complex logic
- Keep functions small
- Follow existing patterns

**DON'T:**

- Use cryptic abbreviations
- Write 200+ line functions
- Reinvent existing utilities
- Ignore code style

#### 6. Test Thoroughly

**DO:**

- Test happy path
- Test error cases
- Test edge cases
- Test with real-world data

**DON'T:**

- Only test success cases
- Skip validation testing
- Ignore concurrent access
- Test only with perfect data

### Common Pitfalls to Avoid

1. **Forgetting to lock files** → Data corruption
2. **Not using atomic writes** → Partial data on failure
3. **Skipping validation** → Invalid data in CSV
4. **Wrong balance calculation** → Incorrect financial data
5. **Mixing currencies** → Wrong totals
6. **Invalid account paths** → Broken categorization
7. **Not handling errors** → Silent failures
8. **Bypassing service layer** → Inconsistent business logic

### Before Making Changes

**Ask yourself:**

1. Which layer does this belong in?
2. Does this follow existing patterns?
3. Have I validated all inputs?
4. Will this preserve data integrity?
5. Have I handled all error cases?
6. Is this testable?
7. Does this maintain backward compatibility?

### Code Review Checklist

- [ ] Code is in the correct layer
- [ ] Follows naming conventions
- [ ] Validates all inputs
- [ ] Handles all errors
- [ ] Uses atomic operations for writes
- [ ] Acquires locks for file access
- [ ] Maintains double-entry integrity
- [ ] Includes appropriate comments
- [ ] Follows existing patterns
- [ ] Is testable
- [ ] Doesn't break existing features

---

## Future Considerations

### Potential Enhancements

**Features:**

- Advanced search and filtering
- Transaction categories and tags
- Budget tracking
- Recurring transactions
- Multi-currency conversion
- Reports and charts
- Data export (JSON, QIF, OFX)
- Import from bank statements
- Transaction attachments (receipts)

**Technical Improvements:**

- Migration to SQLite (while keeping CSV export)
- Automated backups
- Undo/redo functionality
- Transaction templates
- Keyboard shortcuts
- Dark/light theme toggle
- Mobile companion app
- Cloud sync (optional)

**Architecture Evolution:**

- Plugin system for custom reports
- API for external integrations
- Event sourcing for audit trail
- CQRS for complex queries
- GraphQL API layer

### Migration Paths

**From CSV to SQLite:**

1. Keep Repository interface unchanged
2. Implement SQLiteRepository
3. Add migration tool (CSV → SQLite)
4. Keep CSV export functionality
5. Switch repository implementation

**Adding Features:**

1. Define domain model
2. Add to service layer
3. Update repository if needed
4. Expose via app.go
5. Build frontend UI

---

## Quick Reference

### File Locations

| What                 | Where                                                                                |
| -------------------- | ------------------------------------------------------------------------------------ |
| Transaction entity   | [`internal/domain/transaction.go`](internal/domain/transaction.go)                   |
| Account entity       | [`internal/domain/account.go`](internal/domain/account.go)                           |
| Balance calculations | [`internal/domain/balance.go`](internal/domain/balance.go)                           |
| Transaction service  | [`internal/service/transaction_service.go`](internal/service/transaction_service.go) |
| Balance service      | [`internal/service/balance_service.go`](internal/service/balance_service.go)         |
| CSV repository       | [`internal/storage/csv_repository.go`](internal/storage/csv_repository.go)           |
| Validation           | [`internal/validation/validator.go`](internal/validation/validator.go)               |
| Error types          | [`internal/errors/errors.go`](internal/errors/errors.go)                             |
| App controller       | [`app.go`](app.go)                                                                   |
| Main entry           | [`main.go`](main.go)                                                                 |
| Transaction store    | [`frontend/src/stores/transactionStore.js`](frontend/src/stores/transactionStore.js) |
| Format utilities     | [`frontend/src/utils/formatUtils.js`](frontend/src/utils/formatUtils.js)             |
| Main app component   | [`frontend/src/App.svelte`](frontend/src/App.svelte)                                 |

### Key Commands

```bash
# Development
wails dev              # Run with hot reload

# Build
wails build            # Production build

# Frontend only
cd frontend
npm install            # Install dependencies
npm run dev            # Vite dev server
npm run build          # Build frontend
```

### Important Constants

```go
// Default values
DEFAULT_CURRENCY = "BRL"
DEFAULT_STATUS = "cleared"
ID_PREFIX = "tx_"

// Valid categories
VALID_CATEGORIES = ["Assets", "Liabilities", "Equity", "Income", "Expenses"]

// Valid statuses
VALID_STATUSES = ["cleared", "pending", "reconciled"]

// Date format
DATE_FORMAT = "2006-01-02" //
```
