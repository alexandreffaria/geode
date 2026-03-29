# Virtual Transactions — Technical Implementation Plan

## Overview

Virtual transactions are "shadow" entries that represent future recurring payments. They are stored in the same `transactions.json` file as real transactions but are excluded from account balance calculations. They can appear in charts/reports when a filter is enabled, and each one has a "realize" action that converts it into a real transaction with one click.

---

## 1. Backend Changes

### 1.1 Model Changes — `backend/models/transaction.go`

Add two new fields to the [`Transaction`](backend/models/transaction.go:58) struct:

```go
// Virtual transaction support
// IsVirtual: true = projected/forecast entry, does NOT affect account balances.
// Virtual transactions are auto-generated for recurring series (10-year horizon).
// They are excluded from balance calculations and can be "realized" via POST /api/transactions/:id/realize.
IsVirtual *bool `json:"is_virtual,omitempty"`
```

**Design decision:** Use `*bool` (pointer) consistent with the existing `Paid *bool` pattern. `nil` means "not virtual" (i.e., a real transaction). `true` means virtual. This keeps JSON backward-compatible — existing records without the field are treated as real.

**No changes needed to [`Validate()`](backend/models/transaction.go:94)** — virtual transactions are structurally identical to real ones; `is_virtual` is metadata only.

**No changes needed to [`GetAffectedAccounts()`](backend/models/transaction.go:178)** — balance exclusion is handled in the service layer, not the model.

### 1.2 Ledger Service Changes — `backend/services/ledger.go`

#### 1.2.1 Helper: `isVirtual()`

Add a helper analogous to the existing [`isUnpaid()`](backend/services/ledger.go:167):

```go
// isVirtual returns true if the transaction has IsVirtual explicitly set to true.
func isVirtual(transaction *models.Transaction) bool {
    return transaction.IsVirtual != nil && *transaction.IsVirtual
}
```

#### 1.2.2 Exclude virtual from balance updates

In [`updateAccountBalances()`](backend/services/ledger.go:173), add a guard at the top (after the existing `isUnpaid` guard):

```go
func (s *LedgerService) updateAccountBalances(transaction *models.Transaction) error {
    if isUnpaid(transaction) {
        return nil
    }
    // Virtual transactions do not affect account balances
    if isVirtual(transaction) {
        return nil
    }
    // ... rest of existing logic unchanged
}
```

In [`reverseAccountBalances()`](backend/services/ledger.go:220), add the same guard:

```go
func (s *LedgerService) reverseAccountBalances(transaction *models.Transaction) error {
    if isUnpaid(transaction) {
        return nil
    }
    if isVirtual(transaction) {
        return nil
    }
    // ... rest of existing logic unchanged
}
```

#### 1.2.3 Auto-generate virtual transactions on recurring creation

Add a new method `generateVirtualRecurring()` called from [`CreateTransaction()`](backend/services/ledger.go:37) after the real transaction is saved:

```go
// In CreateTransaction(), Case B (recurring):
if transaction.RecurrenceMonths != nil {
    groupID := uuid.New().String()
    transaction.RecurrenceGroupID = &groupID
}

saved, err := s.saveSingleTransaction(transaction)
if err != nil {
    return nil, err
}

// Auto-generate 10 years of virtual transactions for recurring series
if transaction.RecurrenceMonths != nil && transaction.InstallmentTotal == nil {
    if err := s.generateVirtualRecurring(saved); err != nil {
        // Log but don't fail — virtual generation is best-effort
        log.Printf("WARN: failed to generate virtual recurring for %s: %v", saved.ID, err)
    }
}

return []*models.Transaction{saved}, nil
```

New method:

```go
// generateVirtualRecurring creates virtual future instances of a recurring transaction
// for a 10-year horizon. The anchor transaction (already saved) is the first real entry.
// Virtual transactions share the same RecurrenceGroupID and have IsVirtual = true.
func (s *LedgerService) generateVirtualRecurring(anchor *models.Transaction) error {
    if anchor.RecurrenceGroupID == nil || anchor.RecurrenceMonths == nil {
        return nil
    }

    isVirtualTrue := true
    intervalMonths := *anchor.RecurrenceMonths
    intervalWeeks := 0
    if anchor.RecurrenceUnit != nil && *anchor.RecurrenceUnit == "week" {
        intervalWeeks = intervalMonths // recurrence_months stores the interval count
        intervalMonths = 0
    }

    // 10-year horizon from the anchor date
    horizon := anchor.Date.Time.AddDate(10, 0, 0)
    current := anchor.Date.Time

    for {
        // Advance by the recurrence interval
        if intervalWeeks > 0 {
            current = current.AddDate(0, 0, intervalWeeks*7)
        } else {
            current = current.AddDate(0, intervalMonths, 0)
        }
        if current.After(horizon) {
            break
        }

        t := &models.Transaction{
            ID:   uuid.New().String(),
            Date: models.Date{Time: current},

            Type:        anchor.Type,
            Amount:      anchor.Amount,
            Description: anchor.Description,
            Account:     anchor.Account,
            Category:    anchor.Category,
            FromAccount: anchor.FromAccount,
            ToAccount:   anchor.ToAccount,

            RecurrenceMonths:  anchor.RecurrenceMonths,
            RecurrenceUnit:    anchor.RecurrenceUnit,
            RecurrenceGroupID: anchor.RecurrenceGroupID,

            IsVirtual: &isVirtualTrue,
        }

        // saveSingleTransaction skips balance updates for virtual (via isVirtual guard)
        if err := s.saveSingleTransaction(t); err != nil {
            return fmt.Errorf("failed to save virtual transaction at %s: %w",
                current.Format("2006-01-02"), err)
        }
    }
    return nil
}
```

**Note on `RecurrenceUnit`:** The existing model uses `RecurrenceUnit *string` with values `"week"` or `"month"`, and `RecurrenceMonths *int` stores the interval count regardless of unit. The generation logic must respect this.

#### 1.2.4 `UpdateRecurringGroup()` — sync virtual transactions

The existing [`UpdateRecurringGroup()`](backend/services/ledger.go:317) already fetches all transactions by `RecurrenceGroupID` via [`GetTransactionsByGroupID()`](backend/storage/storage.go:11). Since virtual transactions share the same `RecurrenceGroupID`, they will be included in the group update automatically.

**Key change:** In the loop inside `UpdateRecurringGroup()`, preserve the `IsVirtual` flag from the original transaction (do not overwrite it from the template):

```go
// In the loop building `t` from `original`:
t := &models.Transaction{
    // Identity — must not change
    ID:                original.ID,
    Date:              original.Date,
    RecurrenceGroupID: original.RecurrenceGroupID,

    // Preserve virtual flag from original
    IsVirtual: original.IsVirtual,

    // Installment metadata — preserve if present on the original
    InstallmentTotal:   original.InstallmentTotal,
    InstallmentCurrent: original.InstallmentCurrent,
    InstallmentGroupID: original.InstallmentGroupID,

    // All other fields come from the template
    Type:        updated.Type,
    Amount:      updated.Amount,
    Description: updated.Description,
    Account:     updated.Account,
    Category:    updated.Category,
    FromAccount: updated.FromAccount,
    ToAccount:   updated.ToAccount,

    RecurrenceMonths: updated.RecurrenceMonths,
    RecurrenceUnit:   updated.RecurrenceUnit,

    Paid:                updated.Paid,
    CreditCardBillMonth: updated.CreditCardBillMonth,
}
```

This ensures that when the user edits a recurring group ("apply to all future"), the virtual transactions get the new amount/description/category but remain virtual.

#### 1.2.5 New method: `RealizeTransaction()`

```go
// RealizeTransaction converts a virtual transaction into a real one.
// It clears IsVirtual, then applies the balance change that was previously skipped.
// Returns the updated transaction.
func (s *LedgerService) RealizeTransaction(id string) (*models.Transaction, error) {
    t, err := s.storage.GetTransactionByID(id)
    if err != nil {
        return nil, err
    }
    if t == nil {
        return nil, ErrTransactionNotFound
    }
    if !isVirtual(t) {
        return nil, errors.New("transaction is not virtual")
    }

    // Clear the virtual flag
    t.IsVirtual = nil

    // Now apply balance changes (previously skipped because it was virtual)
    if err := s.updateAccountBalances(t); err != nil {
        return nil, fmt.Errorf("failed to apply balances on realize: %w", err)
    }

    // Persist
    if err := s.storage.UpdateTransaction(t); err != nil {
        // Rollback balance change
        if rbErr := s.reverseAccountBalances(t); rbErr != nil {
            log.Printf("CRITICAL: rollback failed for realize %s: %v", id, rbErr)
        }
        return nil, err
    }

    return t, nil
}
```

#### 1.2.6 `DeleteTransaction()` — no changes needed

[`DeleteTransaction()`](backend/services/ledger.go:398) calls `reverseAccountBalances()` which now has the `isVirtual` guard, so deleting a virtual transaction will correctly skip the balance reversal.

#### 1.2.7 `GetCreditCardBills()` — exclude virtual

In [`GetCreditCardBills()`](backend/services/ledger.go:749), add a virtual filter in the loop:

```go
for _, t := range allTransactions {
    // Skip virtual transactions — they don't affect real balances
    if isVirtual(t) {
        continue
    }
    // ... existing logic
}
```

### 1.3 Handler Changes — `backend/handlers/transactions.go`

#### 1.3.1 New handler: `RealizeTransaction`

```go
// RealizeTransaction handles POST /api/transactions/:id/realize
func (h *TransactionHandler) RealizeTransaction(w http.ResponseWriter, r *http.Request) {
    // Extract ID from path: /api/transactions/<id>/realize
    path := r.URL.Path[len("/api/transactions/"):]
    id := strings.TrimSuffix(path, "/realize")
    if id == "" || id == path {
        WriteError(w, http.StatusBadRequest, "Transaction ID required")
        return
    }

    result, err := h.ledger.RealizeTransaction(id)
    if err != nil {
        log.Printf("Error realizing transaction %s: %v", id, err)
        if errors.Is(err, services.ErrTransactionNotFound) {
            WriteError(w, http.StatusNotFound, err.Error())
        } else {
            WriteError(w, http.StatusBadRequest, err.Error())
        }
        return
    }

    WriteJSON(w, http.StatusOK, result)
    log.Printf("Transaction realized: %s", id)
}
```

### 1.4 Route Registration — `backend/main.go`

Add the realize route **before** the generic `/api/transactions/` handler (same pattern as `/api/transactions/group/`):

```go
// POST /api/transactions/:id/realize — must be registered before /api/transactions/
mux.HandleFunc("/api/transactions/", middleware.Chain(
    func(w http.ResponseWriter, r *http.Request) {
        path := r.URL.Path[len("/api/transactions/"):]
        id := strings.TrimSuffix(path, "/realize")

        // Route: POST /api/transactions/:id/realize
        if strings.HasSuffix(path, "/realize") && id != "" {
            if r.Method == http.MethodPost {
                h.transactions.RealizeTransaction(w, r)
            } else {
                handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
            }
            return
        }

        // Existing routes for specific transaction (GET, PUT, DELETE)
        if path != "" {
            switch r.Method {
            case http.MethodGet:
                h.transactions.GetTransactionByID(w, r)
            case http.MethodPut:
                h.transactions.UpdateTransaction(w, r)
            case http.MethodDelete:
                h.transactions.DeleteTransaction(w, r)
            default:
                handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
            }
        } else {
            handlers.WriteError(w, http.StatusBadRequest, "Transaction ID required")
        }
    },
    mw...,
))
```

### 1.5 Storage Changes — `backend/storage/storage.go` and `backend/storage/json_storage.go`

**No new storage interface methods are needed.** The existing [`GetTransactionsByGroupID()`](backend/storage/storage.go:11) already returns all transactions (including virtual) that share a `RecurrenceGroupID`. The `IsVirtual` field is just another JSON field on the `Transaction` struct and will be serialized/deserialized automatically by `json_storage.go`.

---

## 2. Frontend Changes

### 2.1 Type Updates — `frontend/src/types/index.ts`

Add `is_virtual` to [`BaseTransaction`](frontend/src/types/index.ts:25):

```typescript
interface BaseTransaction {
  id: string;
  amount: number;
  description?: string;
  date: string;
  // Installment fields
  installment_total?: number;
  installment_current?: number;
  installment_group_id?: string;
  // Recurrence fields
  recurrence_months?: number;
  recurrence_unit?: RecurrenceUnit;
  recurrence_group_id?: string;
  // Credit card fields
  paid?: boolean | null;
  credit_card_bill_month?: string | null;
  // Virtual transaction flag
  is_virtual?: boolean | null;
}
```

### 2.2 New API Call — `frontend/src/services/api.ts`

Add a `realizeTransaction()` method to the [`ApiService`](frontend/src/services/api.ts:81) class:

```typescript
async realizeTransaction(id: string): Promise<Transaction> {
  const response = await fetch(`${API_BASE_URL}/transactions/${id}/realize`, {
    method: "POST",
  });
  return this.handleResponse<Transaction>(response);
}
```

No changes to [`buildTransactionPayload()`](frontend/src/services/api.ts:43) — `is_virtual` is never sent by the form (it is server-generated). The backend ignores it on create/update requests from the form.

### 2.3 Utility — `frontend/src/utils/transactionUtils.ts`

Add a helper function:

```typescript
/**
 * Returns true if the transaction is virtual (projected/forecast).
 * Virtual transactions do not affect account balances.
 */
export function isTransactionVirtual(transaction: Transaction): boolean {
  return transaction.is_virtual === true;
}
```

### 2.4 Filter State — `frontend/src/pages/TransactionsPage.tsx`

#### 2.4.1 Extend `FilterState`

```typescript
interface FilterState {
  startDate: string;
  endDate: string;
  selectedAccount: string;
  selectedCategory: string;
  searchQuery: string;
  showVirtual: boolean; // NEW — default false
}
```

#### 2.4.2 Update `getDefaultFilters()`

```typescript
function getDefaultFilters(): FilterState {
  const now = new Date();
  return {
    startDate: getFirstDayOfMonth(now),
    endDate: getLastDayOfMonth(now),
    selectedAccount: "",
    selectedCategory: "",
    searchQuery: "",
    showVirtual: false, // hidden by default
  };
}
```

#### 2.4.3 Update `applyFilters()`

```typescript
function applyFilters(
  transactions: Transaction[],
  filters: FilterState,
  categories: Category[],
): Transaction[] {
  return transactions.filter((t) => {
    // Virtual filter: hide virtual transactions unless showVirtual is true
    if (!filters.showVirtual && t.is_virtual === true) return false;

    // ... existing date, account, category, search filters unchanged
  });
}
```

#### 2.4.4 Add checkbox to filter bar UI

In the JSX filter bar section, add after the search group:

```tsx
{
  /* Virtual transactions toggle */
}
<div className="filter-group filter-group--virtual">
  <label className="filter-label filter-label--checkbox">
    <input
      type="checkbox"
      checked={filters.showVirtual}
      onChange={(e) => setFilter("showVirtual", e.target.checked)}
    />
    Show projected transactions
  </label>
</div>;
```

#### 2.4.5 Update `hasActiveFilters`

```typescript
const hasActiveFilters =
  filters.selectedAccount !== "" ||
  filters.selectedCategory !== "" ||
  filters.searchQuery !== "" ||
  filters.showVirtual ||
  activePreset !== "this-month";
```

#### 2.4.6 Pass `onRealizeTransaction` callback

The page needs to handle the realize action. Add to `TransactionsPageProps`:

```typescript
interface TransactionsPageProps {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onAddTransaction: () => void;
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
  onRealizeTransaction: (transaction: Transaction) => void; // NEW
}
```

Pass it through to `TransactionList`:

```tsx
<TransactionList
  transactions={filteredTransactions}
  categories={categories}
  accounts={accounts}
  onEditTransaction={onEditTransaction}
  onDeleteTransaction={onDeleteTransaction}
  onRealizeTransaction={onRealizeTransaction} // NEW
/>
```

### 2.5 UI Changes — `frontend/src/components/TransactionList.tsx`

#### 2.5.1 Extend props

```typescript
interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  accounts?: Account[];
  onEditTransaction: (transaction: Transaction) => void;
  onDeleteTransaction: (transaction: Transaction) => void;
  onRealizeTransaction: (transaction: Transaction) => void; // NEW
}
```

#### 2.5.2 Visual differentiation for virtual rows

In the `<tr>` element, add a CSS class for virtual transactions:

```tsx
<tr
  key={transaction.id}
  className={[
    pending ? "transaction-row--pending" : "",
    transaction.is_virtual ? "transaction-row--virtual" : "",
  ]
    .filter(Boolean)
    .join(" ")}
>
```

#### 2.5.3 Virtual badge in the type cell

In the type cell, add a virtual badge alongside the existing pending/paid badges:

```tsx
<td>
  <div className="type-cell">
    <span className={`type-badge type-${transaction.type}`}>
      {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
    </span>
    {pending && (
      <span className="status-badge status-badge--pending">Pending</span>
    )}
    {isPaid && <span className="status-badge status-badge--paid">Paid</span>}
    {transaction.is_virtual && (
      <span className="status-badge status-badge--virtual">Projected</span>
    )}
  </div>
</td>
```

#### 2.5.4 Thumbs-up "Realize" button in actions cell

Replace the actions cell for virtual transactions:

```tsx
<td className="actions-cell">
  {transaction.is_virtual ? (
    <>
      <button
        className="realize-button"
        onClick={() => onRealizeTransaction(transaction)}
        aria-label={`Realize transaction: ${transaction.description || "No description"}`}
        title="Convert to real transaction"
      >
        👍 Realize
      </button>
      <button
        className="delete-button"
        onClick={() => onDeleteTransaction(transaction)}
        aria-label={`Delete projected transaction: ${transaction.description || "No description"}`}
      >
        🗑️ Delete
      </button>
    </>
  ) : (
    <>
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
    </>
  )}
</td>
```

#### 2.5.5 CSS additions — `frontend/src/components/TransactionList.css`

```css
/* Virtual transaction row — muted/dashed appearance */
.transaction-row--virtual {
  opacity: 0.65;
  border-left: 3px dashed var(--accent-color, #4a9eff);
}

.transaction-row--virtual td {
  font-style: italic;
}

/* Virtual status badge */
.status-badge--virtual {
  background: rgba(74, 158, 255, 0.15);
  color: #4a9eff;
  border: 1px solid rgba(74, 158, 255, 0.3);
}

/* Realize button */
.realize-button {
  background: rgba(107, 255, 107, 0.1);
  color: #6bff6b;
  border: 1px solid rgba(107, 255, 107, 0.3);
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  font-size: 0.8rem;
}

.realize-button:hover {
  background: rgba(107, 255, 107, 0.2);
}
```

### 2.6 `TransactionForm` Changes — `frontend/src/components/TransactionForm.tsx`

**No new form field is needed** — virtual transactions are auto-generated by the backend, not created by the user.

However, when the form is opened in `edit` mode for a virtual transaction, it should display a read-only informational banner:

```tsx
{
  /* Read-only virtual indicator — shown in edit mode for virtual transactions */
}
{
  isEditMode && initialTransaction?.is_virtual && (
    <div className="virtual-info-banner">
      <span className="virtual-info-icon">🔮</span>
      <span>
        This is a <strong>projected transaction</strong>. It does not affect
        your account balance. Use the "Realize" button in the list to convert
        it.
      </span>
    </div>
  );
}
```

Add CSS for `.virtual-info-banner` in `TransactionForm.css`:

```css
.virtual-info-banner {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 14px;
  background: rgba(74, 158, 255, 0.08);
  border: 1px solid rgba(74, 158, 255, 0.25);
  border-radius: 6px;
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin-bottom: 12px;
}
```

**Note on `transactionToFormData()`** in [`frontend/src/utils/transactionUtils.ts`](frontend/src/utils/transactionUtils.ts:111): No changes needed — `is_virtual` is not a form field and does not need to be round-tripped through form data.

### 2.7 Charts Page — `frontend/src/pages/ChartsPage.tsx`

#### 2.7.1 Add `showVirtual` filter state

```typescript
interface DateFilterState {
  startDate: string;
  endDate: string;
  showVirtual: boolean; // NEW
}

function getDefaultDateFilter(): DateFilterState {
  const now = new Date();
  return {
    startDate: getFirstDayOfMonth(now),
    endDate: getLastDayOfMonth(now),
    showVirtual: false,
  };
}
```

#### 2.7.2 Update `filteredTransactions` memo

```typescript
const filteredTransactions = useMemo(() => {
  return transactions.filter((t) => {
    // Exclude virtual unless showVirtual is enabled
    if (!dateFilter.showVirtual && t.is_virtual === true) return false;
    if (dateFilter.startDate && t.date < dateFilter.startDate) return false;
    if (dateFilter.endDate && t.date > dateFilter.endDate) return false;
    return true;
  });
}, [transactions, dateFilter]);
```

#### 2.7.3 Update `buildMonthlyData()` — virtual transactions already skip `paid === false`

The existing guard `if (t.paid === false) continue;` in [`buildMonthlyData()`](frontend/src/pages/ChartsPage.tsx:104) handles unpaid credit card transactions. Virtual transactions have `paid` as `undefined`/`null` (not `false`), so they would pass through this guard. When `showVirtual` is true, they will be included in the chart data — which is the desired behavior for projections.

**No changes needed to `buildMonthlyData()`, `buildExpenseCategoryData()`, or `buildIncomeCategoryData()`** — they operate on `filteredTransactions` which already respects the `showVirtual` flag.

#### 2.7.4 Add checkbox to filter bar UI

```tsx
{
  /* Virtual transactions toggle */
}
<div className="filter-group filter-group--virtual">
  <label className="filter-label filter-label--checkbox">
    <input
      type="checkbox"
      checked={dateFilter.showVirtual}
      onChange={(e) =>
        setDateFilter((prev) => ({ ...prev, showVirtual: e.target.checked }))
      }
    />
    Include projected transactions
  </label>
</div>;
```

### 2.8 App-level wiring — `frontend/src/App.tsx`

The `onRealizeTransaction` handler needs to be added at the app level (wherever `onDeleteTransaction` and `onEditTransaction` are currently wired). The handler should:

1. Call `apiService.realizeTransaction(transaction.id)`
2. Call `refetch()` from `useTransactions()` to refresh the list

```typescript
const handleRealizeTransaction = useCallback(
  async (transaction: Transaction) => {
    try {
      await apiService.realizeTransaction(transaction.id);
      refetch();
    } catch (err) {
      console.error("Failed to realize transaction:", err);
      // Optionally show an error toast/notification
    }
  },
  [refetch],
);
```

Pass `onRealizeTransaction={handleRealizeTransaction}` to `TransactionsPage`.

---

## 3. Data Flow — Step-by-Step Scenarios

### 3.1 Creating a new recurring transaction

```
User fills TransactionForm with paymentSchedule.mode = "recurring"
  → handleSubmit() calls apiService.addTransaction(formData)
  → buildTransactionPayload() sets recurrence_months + recurrence_unit
  → POST /api/transactions

Backend: CreateTransaction()
  → Validate()
  → Case B: RecurrenceMonths != nil
      → groupID = uuid.New()
      → transaction.RecurrenceGroupID = &groupID
  → saveSingleTransaction(transaction)
      → updateAccountBalances() — real transaction, balances updated
      → storage.SaveTransaction()
  → generateVirtualRecurring(saved)
      → Loop: advance date by interval until +10 years
      → For each future date:
          → t.IsVirtual = &true
          → saveSingleTransaction(t)
              → updateAccountBalances() — isVirtual guard skips balance update
              → storage.SaveTransaction()
  → Returns []*Transaction{saved} (only the real anchor)

Frontend: refetch() → transactions list now includes the real + all virtual entries
  → Virtual entries hidden by default (showVirtual = false in FilterState)
```

### 3.2 Editing a recurring transaction — "Apply to all future"

```
User opens edit modal for a recurring transaction
  → TransactionForm detects recurrence_group_id on initialTransaction
  → handleSubmit() calls onRecurringEditChoice(formData)
  → Parent shows "Edit this one / Edit all future" dialog
  → User chooses "Edit all future"
  → apiService.updateRecurringGroup(groupId, formData)
  → PUT /api/transactions/group/:group_id

Backend: UpdateRecurringGroup()
  → storage.GetTransactionsByGroupID(groupID)
      → Returns ALL transactions with this RecurrenceGroupID
         (both real and virtual — they share the same group ID)
  → For each transaction in group:
      → Build updated `t` preserving:
          - t.ID, t.Date, t.RecurrenceGroupID (identity)
          - t.IsVirtual = original.IsVirtual  ← KEY: preserve virtual flag
      → reverseAccountBalances(original)
          → isVirtual guard: virtual originals skip reversal
      → updateAccountBalances(t)
          → isVirtual guard: virtual updated entries skip balance update
      → storage.UpdateTransaction(t)
  → Returns all updated transactions

Frontend: refetch() → all group members updated with new amount/description/category
  → Virtual entries retain is_virtual = true
  → Real entries retain is_virtual = nil/false
```

### 3.3 Realizing a virtual transaction (thumbs up)

```
User clicks "👍 Realize" on a virtual transaction row in TransactionList
  → onRealizeTransaction(transaction) called
  → handleRealizeTransaction() in App.tsx
  → apiService.realizeTransaction(transaction.id)
  → POST /api/transactions/:id/realize

Backend: RealizeTransaction()
  → storage.GetTransactionByID(id)
  → isVirtual check: must be true
  → t.IsVirtual = nil  (clear the flag)
  → updateAccountBalances(t)
      → isVirtual guard no longer fires (IsVirtual is nil)
      → Balance updated normally based on transaction type
  → storage.UpdateTransaction(t)
  → Returns updated transaction (now real)

Frontend: refetch()
  → Transaction now has is_virtual = undefined/null
  → Appears as a normal real transaction in the list
  → No longer shown with dashed border / italic / "Projected" badge
```

### 3.4 Toggling the virtual filter

```
User checks "Show projected transactions" checkbox in TransactionsPage
  → setFilter("showVirtual", true)
  → FilterState.showVirtual = true
  → applyFilters() re-runs:
      → Virtual transactions now pass the is_virtual filter
      → They appear in the list with dashed border + "Projected" badge
      → "Realize" button shown instead of "Edit"

User unchecks the checkbox
  → setFilter("showVirtual", false)
  → Virtual transactions filtered out again
  → Count in header updates: "Showing X of Y transactions"
```

---

## 4. Key Design Decisions

### 4.1 Storage: same file, same struct

Virtual transactions are stored in the same `transactions.json` alongside real transactions. No separate file or collection is needed. The `is_virtual` field is `omitempty` so existing records without it are treated as real (backward-compatible).

### 4.2 No separate "virtual" transaction type

Virtual is a **flag** (`is_virtual: true`), not a new `TransactionType`. This means all existing type-specific logic (purchase/earning/transfer), validation, and display code works unchanged. The flag is orthogonal to type.

### 4.3 Installments never generate virtual transactions

The [`createInstallments()`](backend/services/ledger.go:68) path in `CreateTransaction()` is entered when `InstallmentTotal != nil`. The `generateVirtualRecurring()` call is only made when `RecurrenceMonths != nil && InstallmentTotal == nil`. The existing validation in [`Validate()`](backend/models/transaction.go:126) already enforces that installments and recurrence are mutually exclusive, so this is naturally handled.

### 4.4 Virtual transactions share the RecurrenceGroupID

This is the critical design choice that makes "edit all future" work seamlessly. Because virtual transactions have the same `RecurrenceGroupID` as the real anchor, [`UpdateRecurringGroup()`](backend/services/ledger.go:317) picks them all up via [`GetTransactionsByGroupID()`](backend/storage/storage.go:11). The only required change is preserving `IsVirtual` from the original in the update loop.

### 4.5 Realize is a targeted single-transaction operation

`RealizeTransaction()` only converts one virtual transaction at a time. It does not cascade to other group members. This matches the UX: the user clicks "👍 Realize" on a specific future date's entry, confirming that payment has occurred.

### 4.6 Virtual transactions are excluded from credit card bill calculations

[`GetCreditCardBills()`](backend/services/ledger.go:749) is updated to skip virtual transactions. This prevents projected future credit card purchases from inflating the bill summary.

### 4.7 `generateVirtualRecurring()` is best-effort

If virtual generation fails (e.g., storage error), the real anchor transaction is already saved and the error is only logged. This prevents a virtual generation failure from rolling back a legitimate real transaction.

### 4.8 Frontend: `is_virtual` is never sent in create/update payloads

[`buildTransactionPayload()`](frontend/src/services/api.ts:43) does not include `is_virtual`. The backend sets it during `generateVirtualRecurring()`. This prevents the frontend from accidentally creating virtual transactions manually.

### 4.9 Description suggestions exclude virtual transactions

In [`getDescriptionSuggestions()`](frontend/src/utils/transactionUtils.ts:162), virtual transactions should be excluded to avoid polluting autocomplete with projected entries. Add a guard:

```typescript
export function getDescriptionSuggestions(
  transactions: Transaction[],
): DescriptionSuggestion[] {
  const seen = new Map<string, DescriptionSuggestion>();
  for (const tx of transactions) {
    if (tx.is_virtual) continue; // skip virtual transactions
    if (!tx.description?.trim()) continue;
    // ... rest unchanged
  }
  return Array.from(seen.values());
}
```

---

## 5. File Change Summary

| File                                          | Change Type | Summary                                                                                                                                                                                                                                                                      |
| --------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `backend/models/transaction.go`               | Modify      | Add `IsVirtual *bool` field to `Transaction` struct                                                                                                                                                                                                                          |
| `backend/services/ledger.go`                  | Modify      | Add `isVirtual()` helper; guard `updateAccountBalances()` and `reverseAccountBalances()`; add `generateVirtualRecurring()` method; add `RealizeTransaction()` method; update `UpdateRecurringGroup()` to preserve `IsVirtual`; update `GetCreditCardBills()` to skip virtual |
| `backend/handlers/transactions.go`            | Modify      | Add `RealizeTransaction()` handler                                                                                                                                                                                                                                           |
| `backend/main.go`                             | Modify      | Register `POST /api/transactions/:id/realize` route                                                                                                                                                                                                                          |
| `backend/storage/storage.go`                  | No change   | Existing interface is sufficient                                                                                                                                                                                                                                             |
| `backend/storage/json_storage.go`             | No change   | JSON serialization handles new field automatically                                                                                                                                                                                                                           |
| `frontend/src/types/index.ts`                 | Modify      | Add `is_virtual?: boolean \| null` to `BaseTransaction`                                                                                                                                                                                                                      |
| `frontend/src/services/api.ts`                | Modify      | Add `realizeTransaction(id)` method                                                                                                                                                                                                                                          |
| `frontend/src/utils/transactionUtils.ts`      | Modify      | Add `isTransactionVirtual()` helper; update `getDescriptionSuggestions()` to skip virtual                                                                                                                                                                                    |
| `frontend/src/components/TransactionList.tsx` | Modify      | Add virtual row styling, "Projected" badge, "👍 Realize" button; extend props with `onRealizeTransaction`                                                                                                                                                                    |
| `frontend/src/components/TransactionList.css` | Modify      | Add `.transaction-row--virtual`, `.status-badge--virtual`, `.realize-button` styles                                                                                                                                                                                          |
| `frontend/src/components/TransactionForm.tsx` | Modify      | Add read-only virtual info banner in edit mode                                                                                                                                                                                                                               |
| `frontend/src/components/TransactionForm.css` | Modify      | Add `.virtual-info-banner` style                                                                                                                                                                                                                                             |
| `frontend/src/pages/TransactionsPage.tsx`     | Modify      | Add `showVirtual` to `FilterState`; update `applyFilters()`; add checkbox to filter bar; add `onRealizeTransaction` prop                                                                                                                                                     |
| `frontend/src/pages/ChartsPage.tsx`           | Modify      | Add `showVirtual` to `DateFilterState`; update `filteredTransactions` memo; add checkbox to filter bar                                                                                                                                                                       |
| `frontend/src/App.tsx`                        | Modify      | Add `handleRealizeTransaction` callback; pass to `TransactionsPage`                                                                                                                                                                                                          |

---

## 6. Out of Scope / Not Needed

- **No new storage interface methods** — `GetTransactionsByGroupID()` already covers group lookups.
- **No changes to `PaymentScheduleSelector`** — virtual generation is fully server-side.
- **No changes to `InstallmentField` or `RecurringField`** — the form UI is unchanged.
- **No changes to `useTransactions` hook** — `refetch()` already handles refreshing after realize.
- **No migration script needed** — existing transactions without `is_virtual` are treated as real by the `nil` check in `isVirtual()`.
