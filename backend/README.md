# Personal Finances Backend

Go backend server for the personal finances application.

## Features

- RESTful API for managing financial transactions and accounts
- JSON file-based storage (transactions.json and accounts.json)
- Auto-creation of accounts when referenced in transactions
- Double-entry bookkeeping principles
- CORS enabled for React frontend integration

## Project Structure

```
backend/
├── main.go                 # Entry point and HTTP server setup
├── handlers/
│   ├── transactions.go     # Transaction HTTP handlers
│   └── accounts.go         # Account HTTP handlers
├── models/
│   ├── transaction.go      # Transaction data structure and validation
│   └── account.go          # Account data structure
├── storage/
│   ├── storage.go          # Storage interface
│   └── json_storage.go     # JSON file storage implementation
├── services/
│   └── ledger.go           # Business logic for transaction processing
└── data/
    ├── transactions.json   # Transaction data file
    └── accounts.json       # Account data file
```

## Requirements

- Go 1.21 or higher

## Installation

1. Navigate to the backend directory:

   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   go mod tidy
   ```

## Running the Server

From the backend directory, run:

```bash
go run main.go
```

Or build and run the binary:

```bash
go build -o bin/server .
./bin/server
```

The server will start on port 8080.

## API Endpoints

### Transactions

- **POST /api/transactions** - Create a new transaction
  - Request body: Transaction object (without id)
  - Response: Created transaction with generated id
- **GET /api/transactions** - List all transactions
  - Response: Array of all transactions

- **GET /api/transactions/:id** - Get a specific transaction
  - Response: Single transaction object

### Accounts

- **GET /api/accounts** - List all accounts
  - Response: Array of all accounts with current balances

- **GET /api/accounts/:name** - Get a specific account
  - Response: Single account object

### Health Check

- **GET /health** - Health check endpoint
  - Response: "OK"

## Transaction Types

### Purchase

Money leaving an account (e.g., buying groceries)

```json
{
  "type": "purchase",
  "amount": 45.5,
  "from_account": "Checking Account",
  "to_account": "Groceries",
  "description": "Weekly grocery shopping"
}
```

### Earning

Money entering an account (e.g., salary)

```json
{
  "type": "earning",
  "amount": 3000.0,
  "from_account": "Employer",
  "to_account": "Checking Account",
  "description": "Monthly salary"
}
```

### Transfer

Moving money between accounts

```json
{
  "type": "transfer",
  "amount": 500.0,
  "from_account": "Checking Account",
  "to_account": "Savings Account",
  "description": "Monthly savings"
}
```

## Example Usage

### Create a Purchase Transaction

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

### Get All Transactions

```bash
curl http://localhost:8080/api/transactions
```

### Get All Accounts

```bash
curl http://localhost:8080/api/accounts
```

## Data Storage

Data is stored in JSON files in the `data/` directory:

- `transactions.json` - All transaction records
- `accounts.json` - All account information and balances

These files are automatically created when the server starts if they don't exist.

## Development

### Building

```bash
go build -o bin/server .
```

### Testing

```bash
go test ./...
```

## Notes

- Accounts are automatically created when first referenced in a transaction
- Transaction amounts must be positive (direction is determined by transaction type)
- The server uses mutex locks to prevent concurrent write issues with JSON files
- CORS is enabled to allow requests from any origin (suitable for development)
