# Common Components

This directory contains reusable, presentational components for the Geode Vault application.

## Components

### Button.svelte

Reusable button component with three variants:

- **primary**: Purple brand color (default)
- **secondary**: Gray with border
- **danger**: Red for destructive actions

**Props:**

- `variant`: 'primary' | 'secondary' | 'danger' (default: 'primary')
- `type`: 'button' | 'submit' (default: 'button')
- `disabled`: boolean (default: false)

**Events:**

- `click`: Forwarded from native button

**Example:**

```svelte
<Button variant="primary" on:click={handleSave}>
  Save Transaction
</Button>
```

---

### Input.svelte

Reusable input field component with consistent styling.

**Props:**

- `type`: string (default: 'text')
- `value`: string | number (use with bind:value)
- `placeholder`: string (default: '')
- `id`: string | undefined
- `step`: number | undefined (for number inputs)
- `disabled`: boolean (default: false)

**Events:**

- All native input events (input, change, focus, blur, keydown, etc.)

**Example:**

```svelte
<Input
  type="date"
  bind:value={transaction.date}
  id="date-input"
/>
```

---

### AutocompleteInput.svelte

Input field with datalist autocomplete functionality.

**Props:**

- `value`: string (use with bind:value)
- `options`: string[] (default: [])
- `placeholder`: string (default: '')
- `id`: string | undefined
- `label`: string | undefined (optional label for standalone use)

**Events:**

- All native input events (input, change, focus, blur)

**Example:**

```svelte
<AutocompleteInput
  bind:value={accountName}
  options={walletOptions}
  placeholder="e.g. PagBank"
  id="wallet-input"
/>
```

---

### MetricCard.svelte

Dashboard metric card displaying a title and formatted currency value.

**Props:**

- `title`: string (required)
- `value`: number (required)
- `variant`: 'core' | 'cash' | 'income' | 'expenses' (default: 'core')
- `currency`: string (default: 'BRL')

**Variants:**

- `core`: White text (for net worth)
- `cash`: Blue text (for liquid cash)
- `income`: Green text (for income)
- `expenses`: Red text (for expenses)

**Example:**

```svelte
<MetricCard
  title="Total Net Worth"
  value={netWorth}
  variant="core"
/>
```

---

### AccountCard.svelte

Card displaying account information with type badge and balance.

**Props:**

- `account`: object (required)
  - `fullName`: string (e.g., "Assets:Liquid:PagBank")
  - `shortName`: string (e.g., "PagBank")
  - `type`: string (e.g., "Liquid", "Fixed", "Debt")
  - `balance`: number

**Features:**

- Automatically styles liability accounts differently
- Color-coded type badges (Liquid: blue, Fixed: purple, Debt: red)
- Positive/negative balance coloring

**Example:**

```svelte
<AccountCard account={{
  fullName: "Assets:Liquid:PagBank",
  shortName: "PagBank",
  type: "Liquid",
  balance: 1500.00
}} />
```

---

### ModalBackdrop.svelte

Reusable modal backdrop with click-outside and escape-to-close functionality.

**Props:**

- `show`: boolean (default: true)

**Events:**

- `close`: Emitted when backdrop is clicked or Escape key is pressed

**Features:**

- Backdrop blur effect
- Click outside to close
- Escape key to close
- Prevents body scroll when open
- Accessible (role="dialog", aria-modal="true")

**Example:**

```svelte
<ModalBackdrop show={showModal} on:close={handleClose}>
  <div class="modal">
    <h2>Modal Title</h2>
    <p>Modal content here</p>
  </div>
</ModalBackdrop>
```

---

## Design Principles

1. **Self-contained**: Each component includes its own styles
2. **Scoped styles**: All styles are scoped to the component (Svelte default)
3. **Reusable**: Components are generic and can be used throughout the app
4. **Accessible**: Semantic HTML and ARIA attributes where appropriate
5. **Event forwarding**: Native events are forwarded for flexibility
6. **Prop validation**: Clear prop types with JSDoc comments
7. **Consistent styling**: Matches the original App.svelte design

## Usage Notes

- All components use the same color scheme and styling as the original App.svelte
- Components are designed to work together (e.g., Button inside ModalBackdrop)
- Import components using relative paths: `import Button from './Button.svelte'`
- Use `bind:value` for two-way data binding with Input and AutocompleteInput
- All currency formatting is handled by the `formatCurrency` utility function
