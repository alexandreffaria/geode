package handlers

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

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
	Name           string   `json:"name"`
	InitialBalance float64  `json:"initialBalance"`
	Currency       string   `json:"currency"`
	ImageURL       string   `json:"imageURL"`
	GradientStart  string   `json:"gradientStart"`
	GradientEnd    string   `json:"gradientEnd"`
	Type           string   `json:"type"`         // "checking" | "credit_card"
	CreditLimit    *float64 `json:"credit_limit"` // optional, for credit_card accounts
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

	account, err := h.ledger.CreateAccount(req.Name, req.InitialBalance, req.Currency, req.ImageURL, req.GradientStart, req.GradientEnd, req.Type, req.CreditLimit)
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
	log.Printf("Account created: %s (type: %s, currency: %s, initialBalance: %.2f)", account.Name, account.Type, account.Currency, account.InitialBalance)
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

// SetMainAccount handles PUT /api/accounts/:name/main
func (h *AccountHandler) SetMainAccount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	path := r.URL.Path[len("/api/accounts/"):]
	name := strings.TrimSuffix(path, "/main")
	if name == "" {
		WriteError(w, http.StatusBadRequest, "Account name required")
		return
	}

	if err := h.ledger.SetMainAccount(name); err != nil {
		log.Printf("Error setting main account %s: %v", name, err)
		if err.Error() == "account not found" {
			WriteError(w, http.StatusNotFound, err.Error())
		} else {
			WriteError(w, http.StatusInternalServerError, "Internal server error")
		}
		return
	}

	accounts, err := h.ledger.GetAllAccounts()
	if err != nil {
		log.Printf("Error getting accounts after setting main: %v", err)
		WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	WriteJSON(w, http.StatusOK, accounts)
	log.Printf("Main account set to: %s", name)
}

// GetMainAccount handles GET /api/accounts/main
func (h *AccountHandler) GetMainAccount(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	account, err := h.ledger.GetMainAccount()
	if err != nil {
		log.Printf("Error getting main account: %v", err)
		WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	if account == nil {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	WriteJSON(w, http.StatusOK, account)
}

// GetCreditCardBills handles GET /api/accounts/:name/credit-card-bills
func (h *AccountHandler) GetCreditCardBills(w http.ResponseWriter, r *http.Request) {
	// Extract account name from path: /api/accounts/:name/credit-card-bills
	path := r.URL.Path[len("/api/accounts/"):]
	name := strings.TrimSuffix(path, "/credit-card-bills")
	if name == "" {
		WriteError(w, http.StatusBadRequest, "Account name required")
		return
	}

	summaries, err := h.ledger.GetCreditCardBills(name)
	if err != nil {
		log.Printf("Error getting credit card bills for %s: %v", name, err)
		if err.Error() == "account not found" {
			WriteError(w, http.StatusNotFound, err.Error())
		} else {
			WriteError(w, http.StatusInternalServerError, "Internal server error")
		}
		return
	}

	WriteJSON(w, http.StatusOK, summaries)
	log.Printf("Retrieved %d credit card bill months for account: %s", len(summaries), name)
}

// PayBill handles POST /api/accounts/:name/pay-bill
func (h *AccountHandler) PayBill(w http.ResponseWriter, r *http.Request) {
	// Extract account name from path: /api/accounts/:name/pay-bill
	path := r.URL.Path[len("/api/accounts/"):]
	name := strings.TrimSuffix(path, "/pay-bill")
	if name == "" {
		WriteError(w, http.StatusBadRequest, "Account name required")
		return
	}

	var req services.PayBillRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding pay bill request: %v", err)
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	transaction, err := h.ledger.PayCreditCardBill(name, &req)
	if err != nil {
		log.Printf("Error paying credit card bill for %s: %v", name, err)
		if err.Error() == "credit card account not found" || err.Error() == "account not found" {
			WriteError(w, http.StatusNotFound, err.Error())
		} else {
			WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	WriteJSON(w, http.StatusCreated, transaction)
	log.Printf("Credit card bill payment created for account %s: amount=%.2f, month=%s", name, transaction.Amount, *transaction.CreditCardBillMonth)
}
