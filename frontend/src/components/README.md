# Components Architecture

This document describes the component architecture of the Geode Vault frontend application after the refactoring completed in Phase 6.

## Overview

The application has been refactored from a monolithic 503-line [`App.svelte`](../App.svelte) into a modular architecture with focused, reusable components organized by feature and responsibility.

## Directory Structure

```
components/
├── common/           # Reusable UI components
├── layout/           # Layout and structural components
├── dashboard/        # Dashboard metrics components
├── accounts/         # Account display components
├── transactions/     # Transaction table components
└── modals/           # Modal dialog components
```

## Component Hierarchy

```
App.svelte (Root Container)
├── Header.svelte
│   └── Uses: Button.svelte
│
├── Dashboard.svelte
│   └── MetricCard.svelte (×4)
│
├── AccountsSection.svelte
│   └── AccountCard.svelte (×N)
│
├── TransactionsSection.svelte
│   └── TransactionRow.svelte (×N)
│
├── TransactionModal.svelte
│   ├── ModalBackdrop.svelte
│   ├── AutocompleteInput.svelte
│   ├── Input.svelte
│   └── Button.svelte
│
└── DeleteConfirmModal.svelte
    ├── ModalBackdrop.svelte
    └── Button.svelte
```

## Data Flow

The application uses Svelte stores for centralized state management:

```
┌─────────────────┐
│  Wails Backend  │
└────────┬────────┘
         │
         ▼
┌─────────────────────┐
│ transactionStore.js │ ◄─── CRUD operations
└────────┬────────────┘
         │
         ├──────────────────────┐
         ▼                      ▼
┌─────────────────┐    ┌──────────────┐
│ accountStore.js │    │  uiStore.js  │
│ (derived)       │    │ (UI state)   │
└────────┬────────┘    └──────┬───────┘
         │                    │
         ▼                    ▼
┌─────────────────────────────────┐
│        Components               │
│  (Dashboard, Accounts, etc.)    │
└─────────────────────────────────┘
```

### Store Responsibilities

- **[`transactionStore.js`](../stores/transactionStore.js)**: Manages transaction data and CRUD operations
- **[`accountStore.js`](../stores/accountStore.js)**: Derives account balances, metrics, and autocomplete options from transactions
- **[`uiStore.js`](../stores/uiStore.js)**: Manages UI state (modals, forms)

## Component Categories

### 1. Common Components (`common/`)

Reusable UI primitives used throughout the application.

#### [`Button.svelte`](common/Button.svelte)

**Purpose:** Reusable button with variant styling

**Props:**

- `variant`: `'primary'` | `'secondary'` | `'danger'`
- `type`: `'button'` | `'submit'`
- `disabled`: boolean

**Usage:**

```svelte
<Button variant="primary" on:click={handleClick}>
  Save
</Button>
```

#### [`Input.svelte`](common/Input.svelte)

**Purpose:** Reusable input field with label

**Props:**

- `label`: string
- `type`: string (default: `'text'`)
- `value`: string | number
- `placeholder`: string
- `step`: number (for type="number")

**Usage:**

```svelte
<Input
  label="Amount"
  type="number"
  step="0.01"
  bind:value={amount}
/>
```

#### [`AutocompleteInput.svelte`](common/AutocompleteInput.svelte)

**Purpose:** Input field with datalist autocomplete

**Props:**

- `label`: string
- `value`: string
- `options`: string[]
- `placeholder`: string

**Usage:**

```svelte
<AutocompleteInput
  label="Account"
  options={walletOptions}
  bind:value={selectedWallet}
  placeholder="e.g. PagBank"
/>
```

#### [`AccountCard.svelte`](common/AccountCard.svelte)

**Purpose:** Display single account with balance

**Props:**

- `account`: `{ fullName, shortName, type, balance }`

**Usage:**

```svelte
<AccountCard account={accountData} />
```

#### [`MetricCard.svelte`](common/MetricCard.svelte)

**Purpose:** Display single dashboard metric

**Props:**

- `title`: string
- `value`: number
- `variant`: `'core'` | `'cash'` | `'income'` | `'expenses'`
- `currency`: string (default: `'BRL'`)

**Usage:**

```svelte
<MetricCard
  title="Total Net Worth"
  value={netWorth}
  variant="core"
/>
```

#### [`ModalBackdrop.svelte`](common/ModalBackdrop.svelte)

**Purpose:** Reusable modal backdrop with click-outside-to-close

**Props:**

- `closeOnBackdropClick`: boolean (default: `true`)

**Events:**

- `close`: Emitted when backdrop clicked or Escape pressed

**Usage:**

```svelte
<ModalBackdrop on:close={handleClose}>
  <div class="modal">
    <!-- Modal content -->
  </div>
</ModalBackdrop>
```

### 2. Layout Components (`layout/`)

Structural components for page layout.

#### [`Header.svelte`](layout/Header.svelte)

**Purpose:** App header with title and action buttons

**Props:** None (uses stores)

**Features:**

- Displays app title
- Refresh button (reloads transactions)
- New Transaction button (opens add modal)

### 3. Dashboard Components (`dashboard/`)

Components for displaying financial metrics.

#### [`Dashboard.svelte`](dashboard/Dashboard.svelte)

**Purpose:** Container for 4 metric cards

**Props:** None (reads from `accountStore`)

**Displays:**

- Total Net Worth
- Liquid Cash
- Total Income
- Total Expenses

### 4. Account Components (`accounts/`)

Components for displaying accounts and balances.

#### [`AccountsSection.svelte`](accounts/AccountsSection.svelte)

**Purpose:** Container for account cards

**Props:** None (reads from `accountStore`)

**Features:**

- Displays all assets and liabilities
- Filters out zero balances
- Sorted alphabetically

### 5. Transaction Components (`transactions/`)

Components for displaying and managing transactions.

#### [`TransactionsSection.svelte`](transactions/TransactionsSection.svelte)

**Purpose:** Container for transaction table

**Props:** None (reads from `transactionStore`)

**Features:**

- Displays all transactions in a table
- Sorted by date (newest first)
- Click row to edit
- Edit and delete buttons

#### [`TransactionRow.svelte`](transactions/TransactionRow.svelte)

**Purpose:** Single transaction row

**Props:**

- `transaction`: Transaction object

**Events:**

- `edit`: Emitted when row or edit button clicked
- `delete`: Emitted when delete button clicked

### 6. Modal Components (`modals/`)

Components for modal dialogs.

#### [`TransactionModal.svelte`](modals/TransactionModal.svelte)

**Purpose:** Add/Edit transaction modal

**Props:** None (uses `uiStore` and `transactionStore`)

**Features:**

- Three modes: Expense, Income, Transfer
- Autocomplete for accounts and categories
- Account path resolution
- Form validation
- Save/Cancel actions

#### [`DeleteConfirmModal.svelte`](modals/DeleteConfirmModal.svelte)

**Purpose:** Delete confirmation dialog

**Props:** None (uses `uiStore` and `transactionStore`)

**Features:**

- Confirmation message
- Cancel/Delete actions
- Prevents accidental deletions

## Utility Modules

The application uses utility modules for shared logic:

- **[`accountUtils.js`](../utils/accountUtils.js)**: Account path resolution and manipulation
- **[`calculationUtils.js`](../utils/calculationUtils.js)**: Double-entry accounting calculations
- **[`transactionUtils.js`](../utils/transactionUtils.js)**: Transaction helpers and builders
- **[`formatUtils.js`](../utils/formatUtils.js)**: Formatting helpers (currency, dates)

## Styling Approach

### Global Styles

Global styles are defined in [`style/global.css`](../style/global.css) and include:

- CSS reset and base styles
- Typography
- Color scheme (dark theme)
- Layout utilities

### CSS Variables

CSS variables are defined in [`style/variables.css`](../style/variables.css) for:

- Colors
- Spacing
- Border radius
- Transitions

### Component Styles

Each component has scoped styles using Svelte's `<style>` blocks. This ensures:

- No style conflicts
- Easy maintenance
- Component portability

## Best Practices

### Component Design

1. **Single Responsibility**: Each component has one clear purpose
2. **Reusability**: Common components are designed to be reused
3. **Props Over State**: Prefer props for data flow
4. **Store Subscriptions**: Use stores for shared state
5. **Event Forwarding**: Use `on:event` for parent communication

### State Management

1. **Centralized State**: Use stores for shared state
2. **Derived Stores**: Compute derived data in stores, not components
3. **Immutable Updates**: Always create new objects/arrays when updating
4. **Reactive Statements**: Use `$:` for reactive computations

### Code Organization

1. **Feature-Based**: Group components by feature
2. **Flat Structure**: Avoid deep nesting
3. **Clear Naming**: Use descriptive component names
4. **Consistent Patterns**: Follow established patterns

## Adding New Features

### Adding a New Component

1. Create the component file in the appropriate directory
2. Define clear props and events
3. Add scoped styles
4. Document usage in this README
5. Import and use in parent component

Example:

```svelte
<!-- components/common/NewComponent.svelte -->
<script>
  export let prop1;
  export let prop2 = 'default';
</script>

<div class="new-component">
  <!-- Component content -->
</div>

<style>
  .new-component {
    /* Scoped styles */
  }
</style>
```

### Adding a New Store

1. Create the store file in `stores/`
2. Define writable or derived stores
3. Export store and actions
4. Document in this README

Example:

```javascript
// stores/newStore.js
import { writable, derived } from "svelte/store";

export const data = writable([]);

export const derivedData = derived(data, ($data) => {
  // Compute derived data
  return $data.map(/* ... */);
});

export function loadData() {
  // Load data logic
}
```

### Adding a New Modal

1. Create modal component in `modals/`
2. Use `ModalBackdrop.svelte` for consistency
3. Add modal state to `uiStore.js`
4. Add open/close actions to `uiStore.js`
5. Include modal in [`App.svelte`](../App.svelte)

## Testing Checklist

When making changes, verify:

- [ ] Build succeeds (`npm run build`)
- [ ] All transactions load correctly
- [ ] Dashboard metrics are accurate
- [ ] Account balances are correct
- [ ] Add transaction works
- [ ] Edit transaction works
- [ ] Delete transaction works
- [ ] Autocomplete shows correct options
- [ ] Account path resolution works
- [ ] Modals open/close correctly
- [ ] No console errors
- [ ] No visual regressions

## Performance Considerations

- **Reactive Efficiency**: Svelte's reactivity is efficient, but avoid unnecessary computations
- **Store Subscriptions**: Components automatically subscribe/unsubscribe
- **List Rendering**: Use `{#each}` with key for optimal updates
- **Derived Stores**: Computed once and cached until dependencies change

## Migration Notes

This architecture was created through a 6-phase refactoring process:

1. **Phase 1**: Extracted utilities and stores
2. **Phase 2**: Extracted leaf components (Button, Input, etc.)
3. **Phase 3**: Extracted container components (Header, Dashboard, etc.)
4. **Phase 4**: Extracted transaction components
5. **Phase 5**: Extracted modal components
6. **Phase 6**: Final integration and cleanup

The original 503-line [`App.svelte`](../App.svelte) is now ~60 lines, with all logic distributed across focused modules.

## Future Enhancements

The modular architecture makes it easy to add:

- **Charts/Visualizations**: Add `ChartsSection.svelte`
- **Filtering/Search**: Add filter store and `FilterBar.svelte`
- **Bulk Operations**: Add bulk selection state
- **Export Functionality**: Add `ExportModal.svelte`
- **Settings/Preferences**: Add `SettingsModal.svelte` and `settingsStore.js`
- **Multi-Currency Support**: Extend calculation utils
- **Recurring Transactions**: Add `RecurringTransactionModal.svelte`
- **Budget Tracking**: Add `BudgetSection.svelte` and budget store

## Resources

- [Svelte Documentation](https://svelte.dev/docs)
- [Svelte Stores](https://svelte.dev/docs#run-time-svelte-store)
- [Wails Documentation](https://wails.io/docs/introduction)
- [Refactoring Plan](../../plans/app-refactoring-plan.md)
