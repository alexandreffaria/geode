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

## Docker Deployment

Run the entire stack (backend + frontend) with a single command using Docker Compose.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v24+)
- [Docker Compose](https://docs.docker.com/compose/install/) (v2.20+ — ships with Docker Desktop)

### Build and Run

```bash
docker compose up --build
```

This will:

1. Build the Go backend into a minimal Alpine image
2. Build the React/Vite frontend and serve it via nginx
3. Start both containers and wire them together

### Access the Application

| Service     | URL                     |
| ----------- | ----------------------- |
| Frontend UI | <http://localhost:3000> |
| Backend API | <http://localhost:8080> |

### Stop the Application

```bash
docker compose down
```

### Data Persistence

Backend data (JSON files) is stored in `backend/data/` on your host machine and bind-mounted into the container at `/app/data`. Your data survives container restarts and rebuilds — **do not delete `backend/data/`** if you want to keep your records.

To wipe all data and start fresh:

```bash
rm -rf backend/data/*
```

### Rebuild After Code Changes

```bash
docker compose up --build
```

### Run in the Background (Detached)

```bash
docker compose up --build -d
# View logs:
docker compose logs -f
```
