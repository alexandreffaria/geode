# Personal Finances Application - Project Plan

## Project Overview

A simple, scalable personal finances application designed for tracking financial transactions with a focus on clean architecture and best accounting practices. The application enables users to manage their money flow through purchases, earnings, and transfers while maintaining accurate account balances.

### Goals

- Provide an intuitive interface for tracking daily financial transactions
- Maintain accurate account balances using double-entry bookkeeping principles
- Enable easy expansion for future features (reports, budgets, categories)
- Keep the codebase maintainable and well-structured

---

## Core Principles

### 1. Small, Incremental Development

- Build features iteratively, starting with core functionality
- Each phase should deliver working, usable software
- Avoid over-engineering; add complexity only when needed
- Maintain a clear separation between phases

### 2. Scalable Architecture

- Design with future growth in mind
- Use modular components that can be extended
- Keep data models flexible for future enhancements
- Ensure the architecture can handle increasing data volumes

### 3. Separation of Concerns

- Clear boundaries between frontend, backend, and data layers
- Independent components with well-defined interfaces
- Business logic isolated from presentation and storage
- API-first design for potential future integrations

### 4. Best Accounting Practices

- Implement double-entry bookkeeping concepts
- Every transaction affects at least two accounts
- Maintain audit trails (transaction history)
- Ensure data integrity and balance accuracy
- Immutable transaction records (no editing, only corrections via new transactions)

---

## Technology Stack

### Backend

- **Language**: Go (Golang)
- **Framework**: Standard library with `net/http` or lightweight framework (e.g., Chi, Gin)
- **Responsibilities**:
  - RESTful API endpoints
  - Business logic and validation
  - Data persistence management
  - Account balance calculations

### Frontend

- **Framework**: React 18+
- **Build Tool**: Vite (fast development, modern tooling)
- **State Management**: React hooks (useState, useContext) or lightweight solution
- **HTTP Client**: Fetch API or Axios
- **Responsibilities**:
  - User interface and interactions
  - Form handling and validation
  - Data presentation and visualization

### Database

- **Format**: Text-based storage (JSON or CSV)
- **Phase 1**: Simple JSON files
  - `transactions.json` - All transaction records
  - `accounts.json` - Account information and balances
- **Rationale**:
  - Easy to inspect and debug
  - No database setup required
  - Simple backup and version control
  - Can migrate to SQL/NoSQL database in future phases

### Styling

- **Theme**: Dark mode by default
- **Approach**: CSS Modules or Tailwind CSS
- **Design**: Modern, clean, minimalist UI
- **Responsive**: Mobile-friendly design

---

## Phase 1 Scope (Current)

### Core Features

#### 1. Transaction Management

- **Add Transactions**: Create new financial transactions
- **Transaction Types**:
  - **Purchase**: Money leaving an account (e.g., buying groceries)
  - **Earning**: Money entering an account (e.g., salary, freelance income)
  - **Transfer**: Moving money between accounts (e.g., savings to checking)

#### 2. Account Management

- **Auto-creation**: Accounts are automatically created when first referenced in a transaction
- **Simple Structure**: Accounts have a name and calculated balance
- **No Manual Account Creation**: Streamlined workflow (accounts emerge organically from transactions)

#### 3. Transaction Viewing

- Display list of all transactions
- Show transaction details (date, type, amount, accounts, description)
- Basic sorting (by date, most recent first)

### Out of Scope for Phase 1

- Editing or deleting transactions
- Categories or tags
- Reports and analytics
- Budget tracking
- Multi-currency support
- User authentication

---

## Data Model

### Transaction Structure

```json
{
  "id": "uuid-string",
  "date": "2026-03-24T03:25:36Z",
  "type": "purchase|earning|transfer",
  "amount": 50.0,
  "from_account": "Checking Account",
  "to_account": "Groceries",
  "description": "Weekly grocery shopping"
}
```

**Fields**:

- `id`: Unique identifier (UUID)
- `date`: ISO 8601 timestamp
- `type`: Transaction type (purchase, earning, transfer)
- `amount`: Positive decimal number (always positive, direction determined by type)
- `from_account`: Source account name (null for earnings)
- `to_account`: Destination account name (null for purchases to external)
- `description`: User-provided description (optional)

### Account Structure

```json
{
  "name": "Checking Account",
  "balance": 1500.0,
  "created_at": "2026-03-01T10:00:00Z",
  "last_updated": "2026-03-24T03:25:36Z"
}
```

**Fields**:

- `name`: Unique account name (primary identifier)
- `balance`: Current calculated balance
- `created_at`: Timestamp of first transaction involving this account
- `last_updated`: Timestamp of last transaction affecting this account

### Double-Entry Bookkeeping Mapping

| Transaction Type | From Account   | To Account          | Example              |
| ---------------- | -------------- | ------------------- | -------------------- |
| **Purchase**     | User's account | Expense category    | Checking → Groceries |
| **Earning**      | Income source  | User's account      | Salary → Checking    |
| **Transfer**     | Source account | Destination account | Checking → Savings   |

---

## Architecture

### Backend API Endpoints

#### Transactions

- `POST /api/transactions` - Create a new transaction
  - Request body: Transaction object (without id)
  - Response: Created transaction with generated id
  - Side effect: Updates affected account balances

- `GET /api/transactions` - List all transactions
  - Query params: `?limit=50&offset=0&sort=date_desc`
  - Response: Array of transactions

- `GET /api/transactions/:id` - Get specific transaction
  - Response: Single transaction object

#### Accounts

- `GET /api/accounts` - List all accounts
  - Response: Array of accounts with current balances

- `GET /api/accounts/:name` - Get specific account
  - Response: Account object with transaction history

### Backend Structure

```
backend/
├── main.go                 # Entry point, server setup
├── handlers/
│   ├── transactions.go     # Transaction HTTP handlers
│   └── accounts.go         # Account HTTP handlers
├── models/
│   ├── transaction.go      # Transaction struct and methods
│   └── account.go          # Account struct and methods
├── storage/
│   ├── storage.go          # Storage interface
│   └── json_storage.go     # JSON file implementation
├── services/
│   └── ledger.go           # Business logic (balance calculations, validation)
└── data/
    ├── transactions.json   # Transaction data file
    └── accounts.json       # Account data file
```

### Frontend Components Structure

```
frontend/
├── src/
│   ├── App.jsx                    # Main app component
│   ├── main.jsx                   # Entry point
│   ├── components/
│   │   ├── TransactionForm.jsx   # Form to add transactions
│   │   ├── TransactionList.jsx   # Display list of transactions
│   │   ├── TransactionItem.jsx   # Single transaction display
│   │   ├── AccountList.jsx       # Display all accounts
│   │   └── AccountCard.jsx       # Single account display
│   ├── services/
│   │   └── api.js                # API client functions
│   ├── hooks/
│   │   └── useTransactions.js    # Custom hook for transaction data
│   └── styles/
│       └── App.css               # Global styles
├── index.html
├── package.json
└── vite.config.js
```

### Data Flow

1. **Adding a Transaction**:

   ```
   User fills form → Frontend validates → POST to backend API
   → Backend validates → Creates transaction record
   → Updates account balances → Saves to JSON files
   → Returns success → Frontend refreshes data → UI updates
   ```

2. **Viewing Transactions**:

   ```
   Component mounts → Fetch from backend API
   → Backend reads JSON file → Returns transaction list
   → Frontend displays in UI
   ```

3. **Account Balance Calculation**:
   ```
   Transaction created → Ledger service processes
   → Determines affected accounts → Calculates balance changes
   → Updates account records → Persists to storage
   ```

### API Request/Response Examples

#### Create Purchase Transaction

```http
POST /api/transactions
Content-Type: application/json

{
  "date": "2026-03-24T03:25:36Z",
  "type": "purchase",
  "amount": 45.50,
  "from_account": "Checking Account",
  "to_account": "Groceries",
  "description": "Whole Foods shopping"
}
```

Response:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "date": "2026-03-24T03:25:36Z",
  "type": "purchase",
  "amount": 45.5,
  "from_account": "Checking Account",
  "to_account": "Groceries",
  "description": "Whole Foods shopping"
}
```

---

## Future Phases

### Phase 2: Reports and Analytics

- **Features**:
  - Monthly/yearly spending summaries
  - Income vs. expenses charts
  - Account balance history over time
  - Top spending categories
- **Technical Additions**:
  - Aggregation queries
  - Chart library integration (e.g., Chart.js, Recharts)
  - Date range filtering

### Phase 3: Budget Tracking

- **Features**:
  - Set monthly budgets per category
  - Budget vs. actual spending comparison
  - Alerts when approaching budget limits
  - Budget rollover options
- **Technical Additions**:
  - Budget data model
  - Notification system
  - Budget calculation service

### Phase 4: Categories and Tags

- **Features**:
  - Assign categories to transactions
  - Multiple tags per transaction
  - Category-based filtering and reporting
  - Custom category creation
- **Technical Additions**:
  - Category/tag data models
  - Many-to-many relationships
  - Enhanced search and filtering

### Phase 5: Data Management

- **Features**:
  - Export data (CSV, JSON, PDF)
  - Import transactions from bank statements
  - Backup and restore functionality
  - Data validation and cleanup tools
- **Technical Additions**:
  - File parsing libraries
  - Export formatters
  - Import wizards

### Phase 6: Advanced Features (Future Consideration)

- Multi-user support with authentication
- Recurring transactions
- Bill reminders
- Investment tracking
- Multi-currency support
- Mobile app (React Native)
- Database migration (PostgreSQL/SQLite)

---

## Development Workflow

### Getting Started

1. Set up Go backend with basic HTTP server
2. Create data models and storage layer
3. Implement transaction endpoints
4. Set up React frontend with Vite
5. Create transaction form and list components
6. Connect frontend to backend API
7. Test and refine

### Testing Strategy

- **Backend**: Unit tests for business logic, integration tests for API endpoints
- **Frontend**: Component tests with React Testing Library
- **Manual Testing**: End-to-end user workflows

### Version Control

- Git repository with clear commit messages
- Feature branches for new functionality
- Main branch always in working state

---

## Success Criteria for Phase 1

- [ ] User can add purchase transactions
- [ ] User can add earning transactions
- [ ] User can add transfer transactions
- [ ] Accounts are automatically created when referenced
- [ ] Account balances are accurately calculated
- [ ] Transactions are persisted to JSON files
- [ ] Transaction list displays all transactions
- [ ] UI is clean, modern, and dark-themed
- [ ] Application runs locally without errors
- [ ] Code is well-organized and documented

---

## Notes and Considerations

### Design Decisions

- **Text-based storage**: Chosen for simplicity in Phase 1; can migrate to database later
- **Auto-create accounts**: Reduces friction for users; manual account management can be added later
- **Immutable transactions**: Following accounting best practices; corrections via new transactions
- **API-first**: Backend provides API that frontend consumes; enables future mobile app or integrations

### Potential Challenges

- **Balance calculation accuracy**: Must ensure double-entry logic is correct
- **Concurrent access**: JSON file storage may have issues with concurrent writes (acceptable for single-user Phase 1)
- **Data validation**: Need robust validation on both frontend and backend
- **Date/time handling**: Ensure consistent timezone handling

### Migration Path

When ready to scale beyond Phase 1:

1. Migrate from JSON to SQLite (embedded) or PostgreSQL (client-server)
2. Add proper indexing for performance
3. Implement transaction support (ACID properties)
4. Add user authentication and multi-user support
5. Consider caching layer for frequently accessed data

---

_Document Version: 1.0_  
_Last Updated: 2026-03-24_  
_Status: Phase 1 - Planning Complete_
