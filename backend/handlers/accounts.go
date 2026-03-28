package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/meulindo/geode/backend/models"
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

// createAccountRequest is the request body for POST /api/accounts
type createAccountRequest struct {
	Name           string  `json:"name"`
	InitialBalance float64 `json:"initialBalance"`
	Currency       string  `json:"currency"`
	ImageURL       string  `json:"imageURL"`
	GradientStart  string  `json:"gradientStart"`
	GradientEnd    string  `json:"gradientEnd"`
}

// CreateAccount handles POST /api/accounts
func (h *AccountHandler) CreateAccount(w http.ResponseWriter, r *http.Request) {
	var req createAccountRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding create account request: %v", err)
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Name == "" {
		WriteError(w, http.StatusBadRequest, "Account name is required")
		return
	}

	account, err := h.ledger.CreateAccount(req.Name, req.InitialBalance, req.Currency, req.ImageURL, req.GradientStart, req.GradientEnd)
	if err != nil {
		log.Printf("Error creating account: %v", err)
		if err.Error() == "account already exists" {
			WriteError(w, http.StatusConflict, err.Error())
		} else {
			WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	WriteJSON(w, http.StatusCreated, account)
	log.Printf("Account created: %s (currency: %s, initialBalance: %.2f)", account.Name, account.Currency, account.InitialBalance)
}

// UpdateAccount handles PUT /api/accounts/:name
func (h *AccountHandler) UpdateAccount(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Path[len("/api/accounts/"):]
	if name == "" {
		WriteError(w, http.StatusBadRequest, "Account name required")
		return
	}

	var req models.AccountUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding update account request: %v", err)
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	account, err := h.ledger.UpdateAccount(name, &req)
	if err != nil {
		log.Printf("Error updating account %s: %v", name, err)
		if err.Error() == "account not found" {
			WriteError(w, http.StatusNotFound, err.Error())
		} else if err.Error() == "an account with that name already exists" {
			WriteError(w, http.StatusConflict, err.Error())
		} else {
			WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	WriteJSON(w, http.StatusOK, account)
	log.Printf("Account updated: %s", account.Name)
}

// DeleteAccount handles DELETE /api/accounts/:name
func (h *AccountHandler) DeleteAccount(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Path[len("/api/accounts/"):]
	if name == "" {
		WriteError(w, http.StatusBadRequest, "Account name required")
		return
	}

	if err := h.ledger.DeleteAccount(name); err != nil {
		log.Printf("Error deleting account %s: %v", name, err)
		if err.Error() == "account not found" {
			WriteError(w, http.StatusNotFound, err.Error())
		} else {
			WriteError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
	log.Printf("Account deleted: %s", name)
}
