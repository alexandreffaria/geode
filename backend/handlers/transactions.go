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
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var transaction models.Transaction
	if err := json.NewDecoder(r.Body).Decode(&transaction); err != nil {
		log.Printf("Error decoding transaction: %v", err)
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	transactions, err := h.ledger.CreateTransaction(&transaction)
	if err != nil {
		log.Printf("Error creating transaction: %v", err)
		WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	if len(transactions) == 1 {
		WriteJSON(w, http.StatusCreated, transactions[0])
		log.Printf("Transaction created: %s (type: %s, amount: %.2f)", transactions[0].ID, transactions[0].Type, transactions[0].Amount)
	} else {
		WriteJSON(w, http.StatusCreated, transactions)
		log.Printf("%d installment transactions created (group: %s, type: %s)", len(transactions), *transactions[0].InstallmentGroupID, transactions[0].Type)
	}
}

// GetAllTransactions handles GET /api/transactions
func (h *TransactionHandler) GetAllTransactions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	transactions, err := h.ledger.GetAllTransactions()
	if err != nil {
		log.Printf("Error getting transactions: %v", err)
		WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	WriteJSON(w, http.StatusOK, transactions)
	log.Printf("Retrieved %d transactions", len(transactions))
}

// GetTransactionByID handles GET /api/transactions/:id
func (h *TransactionHandler) GetTransactionByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Extract ID from URL path (simple implementation)
	id := r.URL.Path[len("/api/transactions/"):]
	if id == "" {
		WriteError(w, http.StatusBadRequest, "Transaction ID required")
		return
	}

	transaction, err := h.ledger.GetTransactionByID(id)
	if err != nil {
		log.Printf("Error getting transaction: %v", err)
		WriteError(w, http.StatusNotFound, "Transaction not found")
		return
	}

	WriteJSON(w, http.StatusOK, transaction)
}

// UpdateTransaction handles PUT /api/transactions/:id
func (h *TransactionHandler) UpdateTransaction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Extract ID from URL
	id := r.URL.Path[len("/api/transactions/"):]
	if id == "" {
		WriteError(w, http.StatusBadRequest, "Transaction ID required")
		return
	}

	var updatedTransaction models.Transaction
	if err := json.NewDecoder(r.Body).Decode(&updatedTransaction); err != nil {
		log.Printf("Error decoding transaction: %v", err)
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Ensure ID matches URL
	updatedTransaction.ID = id

	result, err := h.ledger.UpdateTransaction(&updatedTransaction)
	if err != nil {
		log.Printf("Error updating transaction: %v", err)
		// Determine appropriate status code
		if err.Error() == "transaction not found" {
			WriteError(w, http.StatusNotFound, err.Error())
		} else {
			WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	WriteJSON(w, http.StatusOK, result)
	log.Printf("Transaction updated: %s (type: %s, amount: %.2f)", result.ID, result.Type, result.Amount)
}

// DeleteTransaction handles DELETE /api/transactions/:id
func (h *TransactionHandler) DeleteTransaction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	// Extract ID from URL
	id := r.URL.Path[len("/api/transactions/"):]
	if id == "" {
		WriteError(w, http.StatusBadRequest, "Transaction ID required")
		return
	}

	// Delete the transaction
	err := h.ledger.DeleteTransaction(id)
	if err != nil {
		log.Printf("Error deleting transaction: %v", err)
		// Determine appropriate status code
		if err.Error() == "transaction not found" {
			WriteError(w, http.StatusNotFound, err.Error())
		} else {
			WriteError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}

	// Return 204 No Content on success
	w.WriteHeader(http.StatusNoContent)
	log.Printf("Transaction deleted: %s", id)
}
