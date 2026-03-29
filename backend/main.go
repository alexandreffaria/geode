package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"github.com/meulindo/geode/backend/handlers"
	"github.com/meulindo/geode/backend/middleware"
	"github.com/meulindo/geode/backend/services"
	"github.com/meulindo/geode/backend/storage"
)

// Handlers groups all HTTP handler types for route registration
type Handlers struct {
	accounts      *handlers.AccountHandler
	categories    *handlers.CategoryHandler
	transactions  *handlers.TransactionHandler
	exchangeRates *handlers.ExchangeRateHandler
}

func main() {
	// Resolve data directory from env or default
	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = filepath.Join(".", "data")
	}

	// Initialize storage
	store, err := storage.NewJSONStorage(dataDir)
	if err != nil {
		log.Fatalf("Failed to initialize storage: %v", err)
	}
	log.Printf("Storage initialized in directory: %s", dataDir)

	// Initialize services
	ledger := services.NewLedgerService(store)
	log.Println("Ledger service initialized")

	exchangeRateService := services.NewExchangeRateService(store)
	log.Println("Exchange rate service initialized")

	// Start daily cron for exchange rate fetching (StartDailyCron spawns its own goroutine)
	ctx := context.Background()
	exchangeRateService.StartDailyCron(ctx)

	// Initialize handlers
	h := &Handlers{
		transactions:  handlers.NewTransactionHandler(ledger),
		accounts:      handlers.NewAccountHandler(ledger),
		categories:    handlers.NewCategoryHandler(ledger),
		exchangeRates: handlers.NewExchangeRateHandler(exchangeRateService),
	}

	// Set up routes
	mux := http.NewServeMux()
	registerRoutes(mux, h)

	// Resolve port from env or default
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	addr := ":" + port

	srv := &http.Server{
		Addr:    addr,
		Handler: mux,
	}

	// Start server in goroutine
	go func() {
		log.Printf("Server listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Server shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Server stopped")
}

// registerRoutes sets up all HTTP routes with appropriate middleware
func registerRoutes(mux *http.ServeMux, h *Handlers) {
	// Shared middleware applied to all routes
	mw := []func(http.HandlerFunc) http.HandlerFunc{middleware.CORS, middleware.Logger}

	// POST /api/transactions/import — must be registered BEFORE /api/transactions/group/ and
	// /api/transactions/ to prevent the trailing-slash catch-all from shadowing this exact path.
	mux.HandleFunc("/api/transactions/import", middleware.Chain(
		func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodPost {
				h.transactions.ImportTransactions(w, r)
			} else {
				handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		},
		mw...,
	))

	// Transaction routes
	mux.HandleFunc("/api/transactions", middleware.Chain(
		func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodPost {
				h.transactions.CreateTransaction(w, r)
			} else if r.Method == http.MethodGet {
				h.transactions.GetAllTransactions(w, r)
			} else {
				handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		},
		mw...,
	))

	// PUT/DELETE /api/transactions/group/:group_id — must be registered BEFORE /api/transactions/
	// so that Go's prefix-matching ServeMux routes it to the more specific handler.
	mux.HandleFunc("/api/transactions/group/", middleware.Chain(
		func(w http.ResponseWriter, r *http.Request) {
			groupID := r.URL.Path[len("/api/transactions/group/"):]
			if groupID == "" {
				handlers.WriteError(w, http.StatusBadRequest, "Group ID required")
				return
			}
			switch r.Method {
			case http.MethodPut:
				h.transactions.UpdateRecurringGroup(w, r)
			case http.MethodDelete:
				h.transactions.DeleteRecurringGroup(w, r)
			default:
				handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		},
		mw...,
	))

	mux.HandleFunc("/api/transactions/", middleware.Chain(
		func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Path[len("/api/transactions/"):]
			if path == "" {
				handlers.WriteError(w, http.StatusBadRequest, "Transaction ID required")
				return
			}

			// Route: DELETE/PUT /api/transactions/:id/future
			if strings.HasSuffix(path, "/future") {
				id := strings.TrimSuffix(path, "/future")
				if id == "" {
					handlers.WriteError(w, http.StatusBadRequest, "Transaction ID required")
					return
				}
				switch r.Method {
				case http.MethodDelete:
					h.transactions.DeleteFutureRecurring(w, r)
				case http.MethodPut:
					h.transactions.UpdateFutureRecurring(w, r)
				default:
					handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
				}
				return
			}

			// Route: POST /api/transactions/:id/realize
			if strings.HasSuffix(path, "/realize") {
				id := strings.TrimSuffix(path, "/realize")
				if id == "" {
					handlers.WriteError(w, http.StatusBadRequest, "Transaction ID required")
					return
				}
				if r.Method == http.MethodPost {
					h.transactions.RealizeTransaction(w, r)
				} else {
					handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
				}
				return
			}

			// Route: POST /api/transactions/:id/unrealize
			if strings.HasSuffix(path, "/unrealize") {
				id := strings.TrimSuffix(path, "/unrealize")
				if id == "" {
					handlers.WriteError(w, http.StatusBadRequest, "Transaction ID required")
					return
				}
				if r.Method == http.MethodPost {
					h.transactions.UnrealizeTransaction(w, r)
				} else {
					handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
				}
				return
			}

			// Routes for a specific transaction by ID (GET, PUT, DELETE)
			switch r.Method {
			case http.MethodGet:
				h.transactions.GetTransactionByID(w, r)
			case http.MethodPut:
				h.transactions.UpdateTransaction(w, r)
			case http.MethodDelete:
				h.transactions.DeleteTransaction(w, r)
			default:
				handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		},
		mw...,
	))

	// Account routes
	mux.HandleFunc("/api/accounts", middleware.Chain(
		func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet:
				h.accounts.GetAllAccounts(w, r)
			case http.MethodPost:
				h.accounts.CreateAccount(w, r)
			default:
				handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		},
		mw...,
	))

	// GET /api/accounts/main — must be registered BEFORE the generic /api/accounts/ handler
	// to avoid the "main" literal being treated as an account name.
	mux.HandleFunc("/api/accounts/main", middleware.Chain(
		func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet {
				h.accounts.GetMainAccount(w, r)
			} else {
				handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		},
		mw...,
	))

	mux.HandleFunc("/api/accounts/", middleware.Chain(
		func(w http.ResponseWriter, r *http.Request) {
			path := r.URL.Path[len("/api/accounts/"):]
			if path == "" {
				handlers.WriteError(w, http.StatusBadRequest, "Account name required")
				return
			}

			// Route: GET /api/accounts/:name/credit-card-bills
			if strings.HasSuffix(path, "/credit-card-bills") {
				if r.Method == http.MethodGet {
					h.accounts.GetCreditCardBills(w, r)
				} else {
					handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
				}
				return
			}

			// Route: POST /api/accounts/:name/pay-bill
			if strings.HasSuffix(path, "/pay-bill") {
				if r.Method == http.MethodPost {
					h.accounts.PayBill(w, r)
				} else {
					handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
				}
				return
			}

			// Route: PUT /api/accounts/:name/main
			if strings.HasSuffix(path, "/main") {
				if r.Method == http.MethodPut {
					h.accounts.SetMainAccount(w, r)
				} else {
					handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
				}
				return
			}

			// Routes for a specific account by name
			switch r.Method {
			case http.MethodGet:
				h.accounts.GetAccountByName(w, r)
			case http.MethodPut:
				h.accounts.UpdateAccount(w, r)
			case http.MethodDelete:
				h.accounts.DeleteAccount(w, r)
			default:
				handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		},
		mw...,
	))

	// Category routes
	mux.HandleFunc("/api/categories", middleware.Chain(
		func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet:
				h.categories.GetAllCategories(w, r)
			case http.MethodPost:
				h.categories.CreateCategory(w, r)
			default:
				handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		},
		mw...,
	))

	mux.HandleFunc("/api/categories/", middleware.Chain(
		func(w http.ResponseWriter, r *http.Request) {
			id := r.URL.Path[len("/api/categories/"):]
			if id == "" {
				handlers.WriteError(w, http.StatusBadRequest, "Category ID required")
				return
			}
			switch r.Method {
			case http.MethodGet:
				h.categories.GetCategoryByID(w, r)
			case http.MethodPut:
				h.categories.UpdateCategory(w, r)
			case http.MethodDelete:
				h.categories.DeleteCategory(w, r)
			default:
				handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		},
		mw...,
	))

	// Exchange rate routes
	mux.HandleFunc("/api/exchange-rates/latest", middleware.Chain(
		func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodGet {
				h.exchangeRates.GetLatest(w, r)
			} else {
				handlers.WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
			}
		},
		mw...,
	))

	// Health check endpoint
	mux.HandleFunc("/health", middleware.Chain(
		func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
			w.Write([]byte("OK"))
		},
		mw...,
	))
}
