package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/meulindo/geode/backend/services"
)

// AccountHandler handles account-related HTTP requests
type AccountHandler struct {
	ledger *services.LedgerService
}

// NewAccountHandler creates a new account handler
func NewAccountHandler(ledger *services.LedgerService) *AccountHandler {
	return &AccountHandler{
		ledger: ledger,
	}
}

// GetAllAccounts handles GET /api/accounts
func (h *AccountHandler) GetAllAccounts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	accounts, err := h.ledger.GetAllAccounts()
	if err != nil {
		log.Printf("Error getting accounts: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(accounts)
	log.Printf("Retrieved %d accounts", len(accounts))
}

// GetAccountByName handles GET /api/accounts/:name
func (h *AccountHandler) GetAccountByName(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract name from URL path (simple implementation)
	name := r.URL.Path[len("/api/accounts/"):]
	if name == "" {
		http.Error(w, "Account name required", http.StatusBadRequest)
		return
	}

	account, err := h.ledger.GetAccountByName(name)
	if err != nil {
		log.Printf("Error getting account: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	if account == nil {
		http.Error(w, "Account not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(account)
}
