package main

import (
	"log"
	"net/http"
	"path/filepath"

	"github.com/meulindo/geode/backend/handlers"
	"github.com/meulindo/geode/backend/middleware"
	"github.com/meulindo/geode/backend/services"
	"github.com/meulindo/geode/backend/storage"
)

func main() {
	// Initialize storage
	dataDir := filepath.Join(".", "data")
	store, err := storage.NewJSONStorage(dataDir)
	if err != nil {
		log.Fatalf("Failed to initialize storage: %v", err)
	}
	log.Printf("Storage initialized in directory: %s", dataDir)

	// Initialize services
	ledger := services.NewLedgerService(store)
	log.Println("Ledger service initialized")

	// Initialize handlers
	transactionHandler := handlers.NewTransactionHandler(ledger)
	accountHandler := handlers.NewAccountHandler(ledger)

	// Set up routes
	mux := http.NewServeMux()
	registerRoutes(mux, transactionHandler, accountHandler)

	// Start server
	port := ":8080"
	log.Printf("Server starting on port %s", port)
	logEndpoints()

	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

// registerRoutes sets up all HTTP routes with appropriate middleware
func registerRoutes(mux *http.ServeMux, transactionHandler *handlers.TransactionHandler, accountHandler *handlers.AccountHandler) {
	// Transaction routes
	mux.HandleFunc("/api/transactions", middleware.Chain(
		func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodPost {
				transactionHandler.CreateTransaction(w, r)
			} else if r.Method == http.MethodGet {
				transactionHandler.GetAllTransactions(w, r)
			} else {
				handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		},
		middleware.CORS,
		middleware.Logger,
	))

	mux.HandleFunc("/api/transactions/", middleware.Chain(
		func(w http.ResponseWriter, r *http.Request) {
			// Check if it's a specific transaction (has ID)
			id := r.URL.Path[len("/api/transactions/"):]
			if id != "" {
				// Routes for specific transaction
				switch r.Method {
				case http.MethodGet:
					transactionHandler.GetTransactionByID(w, r)
				case http.MethodPut:
					transactionHandler.UpdateTransaction(w, r)
				case http.MethodDelete:
					transactionHandler.DeleteTransaction(w, r)
				default:
					handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
				}
			} else {
				handlers.WriteError(w, http.StatusBadRequest, "Transaction ID required")
			}
		},
		middleware.CORS,
		middleware.Logger,
	))

	// Account routes
	mux.HandleFunc("/api/accounts", middleware.Chain(
		accountHandler.GetAllAccounts,
		middleware.CORS,
		middleware.Logger,
	))

	mux.HandleFunc("/api/accounts/", middleware.Chain(
		accountHandler.GetAccountByName,
		middleware.CORS,
		middleware.Logger,
	))

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})
}

// logEndpoints logs all available API endpoints
func logEndpoints() {
	log.Printf("API endpoints:")
	log.Printf("  POST   /api/transactions - Create transaction")
	log.Printf("  GET    /api/transactions - List all transactions")
	log.Printf("  GET    /api/transactions/:id - Get transaction by ID")
	log.Printf("  PUT    /api/transactions/:id - Update transaction")
	log.Printf("  DELETE /api/transactions/:id - Delete transaction")
	log.Printf("  GET    /api/accounts - List all accounts")
	log.Printf("  GET    /api/accounts/:name - Get account by name")
	log.Printf("  GET    /health - Health check")
}
