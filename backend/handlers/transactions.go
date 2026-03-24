package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/meulindo/geode/backend/models"
	"github.com/meulindo/geode/backend/services"
)

// TransactionHandler handles transaction-related HTTP requests
type TransactionHandler struct {
	ledger *services.LedgerService
}

// NewTransactionHandler creates a new transaction handler
func NewTransactionHandler(ledger *services.LedgerService) *TransactionHandler {
	return &TransactionHandler{
		ledger: ledger,
	}
}

// CreateTransaction handles POST /api/transactions
func (h *TransactionHandler) CreateTransaction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var transaction models.Transaction
	if err := json.NewDecoder(r.Body).Decode(&transaction); err != nil {
		log.Printf("Error decoding transaction: %v", err)
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	createdTransaction, err := h.ledger.CreateTransaction(&transaction)
	if err != nil {
		log.Printf("Error creating transaction: %v", err)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(createdTransaction)
	log.Printf("Transaction created: %s (type: %s, amount: %.2f)", createdTransaction.ID, createdTransaction.Type, createdTransaction.Amount)
}

// GetAllTransactions handles GET /api/transactions
func (h *TransactionHandler) GetAllTransactions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	transactions, err := h.ledger.GetAllTransactions()
	if err != nil {
		log.Printf("Error getting transactions: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transactions)
	log.Printf("Retrieved %d transactions", len(transactions))
}

// GetTransactionByID handles GET /api/transactions/:id
func (h *TransactionHandler) GetTransactionByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Extract ID from URL path (simple implementation)
	id := r.URL.Path[len("/api/transactions/"):]
	if id == "" {
		http.Error(w, "Transaction ID required", http.StatusBadRequest)
		return
	}

	transaction, err := h.ledger.GetTransactionByID(id)
	if err != nil {
		log.Printf("Error getting transaction: %v", err)
		http.Error(w, "Transaction not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(transaction)
}
