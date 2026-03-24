package main

import (
	"log"
	"net/http"
	"path/filepath"

	"github.com/meulindo/geode/backend/handlers"
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

	// Transaction routes
	mux.HandleFunc("/api/transactions", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w, r)
		if r.Method == http.MethodOptions {
			return
		}
		if r.Method == http.MethodPost {
			transactionHandler.CreateTransaction(w, r)
		} else if r.Method == http.MethodGet {
			transactionHandler.GetAllTransactions(w, r)
		} else {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/transactions/", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w, r)
		if r.Method == http.MethodOptions {
			return
		}
		transactionHandler.GetTransactionByID(w, r)
	})

	// Account routes
	mux.HandleFunc("/api/accounts", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w, r)
		if r.Method == http.MethodOptions {
			return
		}
		accountHandler.GetAllAccounts(w, r)
	})

	mux.HandleFunc("/api/accounts/", func(w http.ResponseWriter, r *http.Request) {
		enableCORS(w, r)
		if r.Method == http.MethodOptions {
			return
		}
		accountHandler.GetAccountByName(w, r)
	})

	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	// Start server
	port := ":8080"
	log.Printf("Server starting on port %s", port)
	log.Printf("API endpoints:")
	log.Printf("  POST   /api/transactions - Create transaction")
	log.Printf("  GET    /api/transactions - List all transactions")
	log.Printf("  GET    /api/transactions/:id - Get transaction by ID")
	log.Printf("  GET    /api/accounts - List all accounts")
	log.Printf("  GET    /api/accounts/:name - Get account by name")
	log.Printf("  GET    /health - Health check")

	if err := http.ListenAndServe(port, mux); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

// enableCORS adds CORS headers to allow requests from the React frontend
func enableCORS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}
