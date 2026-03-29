# Geode 💰

A simple, personal finance tracker built with a Go backend and a React/TypeScript frontend. It uses local JSON files for storage, so there is no database setup required.

## Prerequisites

- **Go** (1.21+)
- **Node.js** (18+)
- **npm**

## Quick Start

You will need to run the backend and frontend in separate terminal windows.

### 1. Start the Backend

The backend runs on port 8080 and automatically creates the necessary JSON data files (`transactions.json` and `accounts.json`) in the `backend/data/` directory.

```bash
cd backend
go mod tidy
go run main.go
```
