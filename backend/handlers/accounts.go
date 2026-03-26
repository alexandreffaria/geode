package handlers

import (
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
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	accounts, err := h.ledger.GetAllAccounts()
	if err != nil {
		log.Printf("Error getting accounts: %v", err)
		WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	WriteJSON(w, http.StatusOK, accounts)
	log.Printf("Retrieved %d accounts", len(accounts))
}

// GetAccountByName handles GET /api/accounts/:name
func (h *AccountHandler) GetAccountByName(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Extract name from URL path (simple implementation)
	name := r.URL.Path[len("/api/accounts/"):]
	if name == "" {
		WriteError(w, http.StatusBadRequest, "Account name required")
		return
	}

	account, err := h.ledger.GetAccountByName(name)
	if err != nil {
		log.Printf("Error getting account: %v", err)
		WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	if account == nil {
		WriteError(w, http.StatusNotFound, "Account not found")
		return
	}

	WriteJSON(w, http.StatusOK, account)
}
