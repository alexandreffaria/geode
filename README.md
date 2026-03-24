# 💰 Personal Finances Application

A modern, scalable personal finances application for tracking financial transactions with a focus on clean architecture and accounting best practices. Built with Go and React, featuring a beautiful dark mode interface and intuitive transaction management.

[![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat&logo=go)](https://go.dev/)
[![React Version](https://img.shields.io/badge/React-19.2-61DAFB?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=flat&logo=vite)](https://vitejs.dev/)

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Current Phase](#-current-phase-phase-1)
- [Key Features](#-key-features)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Features in Detail](#-features-in-detail)
- [API Documentation](#-api-documentation)
- [Data Storage](#-data-storage)
- [Development Workflow](#-development-workflow)
- [Future Roadmap](#-future-roadmap)
- [Project Principles](#-project-principles)
- [Contributing](#-contributing)

---

## 🎯 Overview

This personal finances application enables users to manage their money flow through purchases, earnings, and transfers while maintaining accurate account balances using double-entry bookkeeping principles. The application is designed with scalability in mind, starting with a simple text-based storage system that can easily migrate to a full database solution as needs grow.

### Why This Project?

- **Simple yet powerful**: Easy to use for daily transaction tracking
- **Accounting principles**: Built on solid double-entry bookkeeping foundations
- **Scalable architecture**: Designed to grow from personal use to advanced features
- **Modern tech stack**: Leverages the latest tools and best practices
- **Developer-friendly**: Clean code structure with clear separation of concerns

---

## 🚀 Current Phase: Phase 1

**Status**: ✅ **Implemented and Running**

Phase 1 focuses on core transaction management functionality with a minimal but complete feature set:

### What's Implemented

- ✅ Add transactions (purchases, earnings, transfers)
- ✅ Automatic account creation when referenced
- ✅ Real-time balance tracking
- ✅ Transaction history viewing
- ✅ Dark mode UI
- ✅ RESTful API backend
- ✅ Text-based JSON storage

### What's Not in Phase 1

- ❌ Editing or deleting transactions (immutable by design)
- ❌ Categories or tags
- ❌ Reports and analytics
- ❌ Budget tracking
- ❌ Multi-currency support
- ❌ User authentication

---

## ✨ Key Features

### 💸 Transaction Management

- **Three Transaction Types**:
  - **Purchase**: Money leaving an account (e.g., groceries, bills)
  - **Earning**: Money entering an account (e.g., salary, freelance income)
  - **Transfer**: Moving money between accounts (e.g., savings to checking)

### 🏦 Smart Account Management

- **Auto-creation**: Accounts are automatically created when first referenced
- **Real-time balances**: Balances update instantly with each transaction
- **No manual setup**: Start tracking immediately without account configuration

### 🌙 Modern UI

- **Dark mode by default**: Easy on the eyes for extended use
- **Responsive design**: Works on desktop and mobile
- **Intuitive interface**: Clean, modern design with smooth interactions
- **Color-coded transactions**: Visual distinction between transaction types

### 📊 Balance Tracking

- **Accurate calculations**: Double-entry bookkeeping ensures balance accuracy
- **Total overview**: See your total balance across all accounts
- **Transaction history**: Complete audit trail of all financial activities

---

## 🛠️ Technology Stack

### Backend

- **Language**: [Go 1.21+](https://go.dev/)
- **HTTP Server**: Go standard library `net/http`
- **UUID Generation**: `github.com/google/uuid`
- **Storage**: Text-based JSON files
- **Architecture**: Clean layered architecture (handlers, services, storage, models)

### Frontend

- **Framework**: [React 19.2](https://react.dev/)
- **Language**: [TypeScript 5.9](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 8.0](https://vitejs.dev/)
- **Styling**: Custom CSS with dark mode theme
- **HTTP Client**: Native Fetch API

### Development Tools

- **Version Control**: Git
- **Package Management**: Go modules, npm
- **Code Quality**: ESLint, TypeScript compiler
- **Development Server**: Vite dev server with HMR

---

## 📁 Project Structure

```
geode/
├── README.md                    # This file - main project documentation
├── project_plan.md              # Detailed project plan and architecture
│
├── backend/                     # Go backend server
│   ├── main.go                  # Entry point and HTTP server setup
│   ├── go.mod                   # Go module dependencies
│   ├── README.md                # Backend-specific documentation
│   ├── handlers/                # HTTP request handlers
│   │   ├── transactions.go      # Transaction endpoints
│   │   └── accounts.go          # Account endpoints
│   ├── models/                  # Data structures
│   │   ├── transaction.go       # Transaction model
│   │   └── account.go           # Account model
│   ├── services/                # Business logic
│   │   └── ledger.go            # Transaction processing and balance calculations
│   ├── storage/                 # Data persistence layer
│   │   ├── storage.go           # Storage interface
│   │   └── json_storage.go      # JSON file implementation
│   └── data/                    # Data files (auto-created)
│       ├── transactions.json    # Transaction records
│       └── accounts.json        # Account information
│
└── frontend/                    # React frontend application
    ├── src/
    │   ├── main.tsx             # Application entry point
    │   ├── App.tsx              # Main app component
    │   ├── components/          # React components
    │   │   ├── AccountList.tsx      # Account display
    │   │   ├── TransactionForm.tsx  # Transaction input form
    │   │   └── TransactionList.tsx  # Transaction history
    │   ├── services/            # API communication
    │   │   └── api.ts           # Backend API client
    │   └── types/               # TypeScript definitions
    │       └── index.ts         # Shared types
    ├── vite.config.ts           # Vite configuration
    ├── package.json             # npm dependencies
    ├── README.md                # Frontend-specific documentation
    └── QUICKSTART.md            # Quick start guide
```

### Directory Descriptions

- **[`backend/`](backend/)**: Go server providing RESTful API endpoints, business logic, and data persistence
- **[`frontend/`](frontend/)**: React application with TypeScript for the user interface
- **[`project_plan.md`](project_plan.md)**: Comprehensive project plan with architecture details, data models, and future phases

---

## 🚀 Quick Start

### Prerequisites

Before you begin, ensure you have the following installed:

- **Go**: Version 1.21 or higher ([Download](https://go.dev/dl/))
- **Node.js**: Version 18 or higher ([Download](https://nodejs.org/))
- **npm**: Comes with Node.js

### Installation & Running

#### 1. Clone or Navigate to the Project

```bash
cd /home/meulindo/geode
```

#### 2. Start the Backend Server

Open a terminal and run:

```bash
cd backend
go mod tidy          # Install Go dependencies
go run main.go       # Start the server
```

The backend server will start on **http://localhost:8080**

**Expected output:**

```
Server starting on :8080
```

#### 3. Start the Frontend Development Server

Open a **new terminal** and run:

```bash
cd frontend
npm install          # Install npm dependencies (first time only)
npm run dev          # Start the development server
```

The frontend will start on **http://localhost:5173**

**Expected output:**

```
VITE v8.0.1  ready in XXX ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
```

#### 4. Access the Application

Open your browser and navigate to:

```
http://localhost:5173
```

You should see the Personal Finance Manager interface with:

- Account list (initially empty)
- Transaction form to add new transactions
- Transaction history (initially empty)

### First Steps

1. **Add your first earning**: Record income to create your first account
2. **Make a purchase**: Track an expense
3. **Transfer funds**: Move money between accounts
4. **View balances**: See your accounts update in real-time

---

## 🎨 Features in Detail

### Transaction Types

#### 💳 Purchase

Money leaving your account for expenses.

**Example**: Buying groceries

- **From**: Checking Account
- **To**: Groceries
- **Amount**: $45.50
- **Effect**: Checking Account balance decreases

#### 💵 Earning

Money entering your account from income sources.

**Example**: Monthly salary

- **From**: Employer
- **To**: Checking Account
- **Amount**: $3,000.00
- **Effect**: Checking Account balance increases

#### 🔄 Transfer

Moving money between your own accounts.

**Example**: Saving money

- **From**: Checking Account
- **To**: Savings Account
- **Amount**: $500.00
- **Effect**: Checking decreases, Savings increases

### Auto-Account Creation

Accounts are created automatically when you reference them in a transaction. No need to set up accounts beforehand!

**Example Flow**:

1. Add earning: "Employer" → "Checking Account"
2. System creates both "Employer" and "Checking Account"
3. Balances are calculated automatically
4. Accounts appear in the account list

### Balance Tracking

The application uses **double-entry bookkeeping** principles:

- Every transaction affects at least two accounts
- Balances are calculated from transaction history
- Ensures accuracy and maintains audit trail
- Immutable transactions (no editing, only corrections via new transactions)

### Dark Mode UI

- **Eye-friendly**: Reduced eye strain for extended use
- **Modern design**: Clean, minimalist interface
- **Color coding**:
  - 🟢 Green for earnings
  - 🔴 Red for purchases and transfers
  - 🔵 Blue accents for interactive elements
- **Responsive**: Works on all screen sizes

---

## 📡 API Documentation

The backend provides a RESTful API for managing transactions and accounts.

### Base URL

```
http://localhost:8080
```

### Endpoints Overview

| Method | Endpoint                | Description              |
| ------ | ----------------------- | ------------------------ |
| `POST` | `/api/transactions`     | Create a new transaction |
| `GET`  | `/api/transactions`     | List all transactions    |
| `GET`  | `/api/transactions/:id` | Get specific transaction |
| `GET`  | `/api/accounts`         | List all accounts        |
| `GET`  | `/api/accounts/:name`   | Get specific account     |
| `GET`  | `/health`               | Health check             |

### Example: Create a Purchase

```bash
curl -X POST http://localhost:8080/api/transactions \
  -H "Content-Type: application/json" \
  -d '{
    "type": "purchase",
    "amount": 45.50,
    "from_account": "Checking Account",
    "to_account": "Groceries",
    "description": "Weekly grocery shopping"
  }'
```

### Example: Get All Accounts

```bash
curl http://localhost:8080/api/accounts
```

**Response:**

```json
[
  {
    "name": "Checking Account",
    "balance": 2454.5,
    "created_at": "2026-03-24T03:25:36Z",
    "last_updated": "2026-03-24T03:30:00Z"
  }
]
```

### Detailed API Documentation

For complete API documentation with all request/response examples, see:

- **[Backend README](backend/README.md)** - Full API reference

---

## 💾 Data Storage

### Text-Based JSON Storage

Phase 1 uses simple JSON files for data persistence:

**Location**: [`backend/data/`](backend/data/)

**Files**:

- **[`transactions.json`](backend/data/transactions.json)**: All transaction records
- **[`accounts.json`](backend/data/accounts.json)**: Account information and balances

### Why JSON Files?

- ✅ **Simple**: Easy to inspect and debug
- ✅ **No setup**: No database installation required
- ✅ **Version control friendly**: Can track changes in Git
- ✅ **Easy backup**: Just copy the files
- ✅ **Portable**: Works on any system
- ✅ **Migration ready**: Easy to migrate to database later

### Data Persistence

- Files are automatically created on first run
- Data persists between server restarts
- Mutex locks prevent concurrent write issues
- Atomic writes ensure data integrity

### Future Migration Path

When ready to scale:

1. Migrate to SQLite (embedded) or PostgreSQL (client-server)
2. Add proper indexing for performance
3. Implement ACID transaction support
4. Add user authentication and multi-user support

---

## 🔧 Development Workflow

### Making Changes

#### Backend Changes

1. Navigate to [`backend/`](backend/)
2. Modify Go files as needed
3. Restart the server: `go run main.go`
4. Test with curl or the frontend

**Key files**:

- [`handlers/`](backend/handlers/) - Add/modify API endpoints
- [`services/ledger.go`](backend/services/ledger.go) - Business logic
- [`models/`](backend/models/) - Data structures
- [`storage/`](backend/storage/) - Data persistence

#### Frontend Changes

1. Navigate to [`frontend/`](frontend/)
2. Modify React components in [`src/`](frontend/src/)
3. Changes auto-reload with Vite HMR
4. No restart needed!

**Key files**:

- [`src/components/`](frontend/src/components/) - UI components
- [`src/services/api.ts`](frontend/src/services/api.ts) - API calls
- [`src/types/index.ts`](frontend/src/types/index.ts) - TypeScript types
- [`src/App.tsx`](frontend/src/App.tsx) - Main app logic

### Testing Approach

**Backend**:

```bash
cd backend
go test ./...
```

**Frontend**:

- Manual testing through the UI
- Browser developer tools for debugging
- React DevTools for component inspection

### Building for Production

**Backend**:

```bash
cd backend
go build -o bin/server .
./bin/server
```

**Frontend**:

```bash
cd frontend
npm run build
npm run preview
```

---

## 🗺️ Future Roadmap

The application is designed to grow incrementally. Here's what's planned:

### Phase 2: Reports and Analytics 📊

- Monthly/yearly spending summaries
- Income vs. expenses charts
- Account balance history over time
- Top spending categories
- Date range filtering

### Phase 3: Budget Tracking 💰

- Set monthly budgets per category
- Budget vs. actual spending comparison
- Alerts when approaching budget limits
- Budget rollover options

### Phase 4: Categories and Tags 🏷️

- Assign categories to transactions
- Multiple tags per transaction
- Category-based filtering and reporting
- Custom category creation

### Phase 5: Data Management 📁

- Export data (CSV, JSON, PDF)
- Import transactions from bank statements
- Backup and restore functionality
- Data validation and cleanup tools

### Phase 6: Advanced Features 🚀

- Multi-user support with authentication
- Recurring transactions
- Bill reminders
- Investment tracking
- Multi-currency support
- Mobile app (React Native)
- Database migration (PostgreSQL/SQLite)

For detailed information about future phases, see [`project_plan.md`](project_plan.md).

---

## 🎯 Project Principles

### 1. Small, Incremental Development

Build features iteratively, starting with core functionality. Each phase delivers working, usable software.

### 2. Scalable Architecture

Design with future growth in mind. Use modular components that can be extended without major rewrites.

### 3. Separation of Concerns

Clear boundaries between frontend, backend, and data layers. Independent components with well-defined interfaces.

### 4. Best Accounting Practices

- Implement double-entry bookkeeping concepts
- Every transaction affects at least two accounts
- Maintain audit trails (transaction history)
- Ensure data integrity and balance accuracy
- Immutable transaction records (no editing, only corrections)

---

## 📚 Additional Resources

### Documentation

- **[Project Plan](project_plan.md)** - Comprehensive project plan with architecture details
- **[Backend README](backend/README.md)** - Backend-specific documentation and API reference
- **[Frontend README](frontend/README.md)** - Frontend-specific documentation
- **[Frontend Quick Start](frontend/QUICKSTART.md)** - Quick start guide for frontend

### Project Links

- **Backend Server**: http://localhost:8080
- **Frontend App**: http://localhost:5173
- **API Health Check**: http://localhost:8080/health

---

## 🤝 Contributing

This is a personal project, but contributions and suggestions are welcome!

### Guidelines

1. **Follow the architecture**: Maintain separation of concerns
2. **Write clean code**: Follow Go and TypeScript best practices
3. **Test your changes**: Ensure everything works before committing
4. **Document**: Update relevant README files
5. **Commit messages**: Use clear, descriptive commit messages

### Development Setup

1. Fork the repository (if applicable)
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

## 📝 License

This is a personal project for learning and personal use.

---

## 🙏 Acknowledgments

Built with modern tools and best practices:

- Go community for excellent standard library
- React team for the amazing framework
- Vite team for blazing-fast development experience
- Open source community for inspiration

---

## 📞 Support

For issues or questions:

1. Check the documentation in this README
2. Review [`project_plan.md`](project_plan.md) for architecture details
3. Check backend/frontend specific READMEs
4. Review the code - it's well-commented!

---

<div align="center">

**Built with ❤️ using Go and React**

_A modern approach to personal finance management_

</div>
