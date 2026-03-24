# Personal Finance Manager - Frontend

A modern, dark-themed React frontend for managing personal finances, built with Vite and TypeScript.

## Features

- 💰 **Account Management**: View all accounts with real-time balances
- 📊 **Transaction Tracking**: Add and view transactions (purchases, earnings, transfers)
- 🌙 **Dark Mode**: Beautiful dark theme optimized for extended use
- ⚡ **Fast Development**: Built with Vite for lightning-fast HMR
- 🔒 **Type Safety**: Full TypeScript support for robust code

## Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Next-generation frontend tooling
- **CSS3** - Custom dark mode styling

## Prerequisites

- Node.js 18+ and npm
- Backend server running on port 8080

## Installation

```bash
# Install dependencies
npm install
```

## Development

```bash
# Start development server (runs on port 5173)
npm run dev
```

The development server will start at `http://localhost:5173` and automatically proxy API requests to the backend at `http://localhost:8080`.

## Building for Production

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
frontend/
├── src/
│   ├── components/          # React components
│   │   ├── AccountList.tsx      # Display accounts with balances
│   │   ├── AccountList.css
│   │   ├── TransactionForm.tsx  # Form to add transactions
│   │   ├── TransactionForm.css
│   │   ├── TransactionList.tsx  # Display transaction history
│   │   └── TransactionList.css
│   ├── services/            # API service layer
│   │   └── api.ts              # Backend API communication
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts            # Shared types
│   ├── App.tsx              # Main application component
│   ├── App.css              # App-level styles
│   ├── index.css            # Global dark mode styles
│   └── main.tsx             # Application entry point
├── vite.config.ts           # Vite configuration with proxy
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies and scripts
```

## API Integration

The frontend communicates with the backend API through the following endpoints:

- `GET /api/accounts` - Fetch all accounts
- `GET /api/transactions` - Fetch all transactions
- `POST /api/transactions` - Add a new transaction

API requests are automatically proxied to `http://localhost:8080` during development.

## Components

### AccountList

Displays all accounts with their current balances and a total balance summary.

### TransactionForm

Form for adding new transactions with validation:

- Transaction type (purchase/earning/transfer)
- Amount (positive decimal)
- From/To accounts (dropdown selection)
- Description

### TransactionList

Table view of all transactions with:

- Date and time
- Transaction type badge
- Description
- From/To accounts
- Amount (color-coded: green for earnings, red for purchases/transfers)

## Styling

The app uses a custom dark mode theme with:

- Dark backgrounds (#121212, #1e1e1e, #2a2a2a)
- Light text (#e0e0e0, #b0b0b0)
- Accent colors (blue, green, red)
- Responsive design for mobile and desktop
- Smooth transitions and hover effects

## Development Notes

- The app uses functional components with React hooks
- All API calls include error handling and loading states
- TypeScript ensures type safety across the application
- CSS is modular with component-specific stylesheets
- The proxy configuration in Vite handles CORS during development

## Troubleshooting

**Backend connection issues:**

- Ensure the backend server is running on port 8080
- Check that CORS is properly configured in the backend

**TypeScript errors:**

- Run `npm install` to ensure all dependencies are installed
- Check that `tsconfig.json` is properly configured

**Build errors:**

- Clear the `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

## License

Part of the Personal Finance Manager project.
