# Quick Start Guide

## Running the Frontend

### 1. Install Dependencies (First Time Only)

```bash
cd frontend
npm install
```

### 2. Start the Development Server

```bash
npm run dev
```

The frontend will start at **http://localhost:5173**

### 3. Ensure Backend is Running

Make sure the backend server is running on port 8080:

```bash
cd ../backend
go run main.go
```

## What You'll See

1. **Account List** - Shows all your accounts with balances
2. **Transaction Form** - Add new transactions (purchases, earnings, transfers)
3. **Transaction History** - View all past transactions in a table

## Adding Your First Transaction

1. Select transaction type (Purchase, Earning, or Transfer)
2. Enter the amount
3. Choose "From Account" (where money comes from)
4. Choose "To Account" (where money goes to)
5. Add a description
6. Click "Add Transaction"

The accounts and transaction list will update automatically!

## Tips

- **Purchases**: Money leaves an account (e.g., from Checking to Expenses)
- **Earnings**: Money enters an account (e.g., from Income to Checking)
- **Transfers**: Move money between accounts (e.g., from Checking to Savings)

## Troubleshooting

**Can't connect to backend?**

- Check that the backend is running on port 8080
- Look for errors in the browser console (F12)

**Page won't load?**

- Make sure you ran `npm install` first
- Try clearing the browser cache

**Changes not showing?**

- Vite has hot module replacement - changes should appear instantly
- If not, try refreshing the page (F5)

## Building for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

To preview the production build:

```bash
npm run preview
```
