package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strings"

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
	id := pathParam(r, "/api/transactions/")
	if id == "" {
		WriteError(w, http.StatusBadRequest, "Transaction ID required")
		return
	}

	transaction, err := h.ledger.GetTransactionByID(id)
	if err != nil {
		log.Printf("Error getting transaction: %v", err)
		WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	if transaction == nil {
		WriteError(w, http.StatusNotFound, "Transaction not found")
		return
	}

	WriteJSON(w, http.StatusOK, transaction)
}

// UpdateRecurringGroup handles PUT /api/transactions/group/:group_id
// It updates all transactions that share the given recurrence_group_id.
func (h *TransactionHandler) UpdateRecurringGroup(w http.ResponseWriter, r *http.Request) {
	// Extract group_id from URL: /api/transactions/group/<group_id>
	const prefix = "/api/transactions/group/"
	groupID := pathParam(r, prefix)
	if groupID == "" {
		WriteError(w, http.StatusBadRequest, "Group ID required")
		return
	}

	var updatedTransaction models.Transaction
	if err := json.NewDecoder(r.Body).Decode(&updatedTransaction); err != nil {
		log.Printf("Error decoding transaction: %v", err)
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	results, err := h.ledger.UpdateRecurringGroup(groupID, &updatedTransaction)
	if err != nil {
		log.Printf("Error updating recurring group %s: %v", groupID, err)
		if err.Error() == "no transactions found for group: "+groupID {
			WriteError(w, http.StatusNotFound, err.Error())
		} else {
			WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	WriteJSON(w, http.StatusOK, results)
	log.Printf("Recurring group updated: %s (%d transactions)", groupID, len(results))
}

// UpdateTransaction handles PUT /api/transactions/:id
func (h *TransactionHandler) UpdateTransaction(w http.ResponseWriter, r *http.Request) {
	id := pathParam(r, "/api/transactions/")
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
		if errors.Is(err, services.ErrTransactionNotFound) {
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
	id := pathParam(r, "/api/transactions/")
	if id == "" {
		WriteError(w, http.StatusBadRequest, "Transaction ID required")
		return
	}

	err := h.ledger.DeleteTransaction(id)
	if err != nil {
		log.Printf("Error deleting transaction: %v", err)
		if errors.Is(err, services.ErrTransactionNotFound) {
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

// RealizeTransaction handles POST /api/transactions/:id/realize
// It converts a virtual (projected) transaction into a real one, applying its balance effect.
func (h *TransactionHandler) RealizeTransaction(w http.ResponseWriter, r *http.Request) {
	// Extract ID from path: /api/transactions/<id>/realize
	path := r.URL.Path[len("/api/transactions/"):]
	id := strings.TrimSuffix(path, "/realize")
	if id == "" || id == path {
		WriteError(w, http.StatusBadRequest, "Transaction ID required")
		return
	}

	result, err := h.ledger.RealizeTransaction(id)
	if err != nil {
		log.Printf("Error realizing transaction %s: %v", id, err)
		if errors.Is(err, services.ErrTransactionNotFound) {
			WriteError(w, http.StatusNotFound, err.Error())
		} else {
			WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	WriteJSON(w, http.StatusOK, result)
	log.Printf("Transaction realized: %s", id)
}

// UnrealizeTransaction handles POST /api/transactions/:id/unrealize
// It converts a real transaction back to virtual (projected), reversing its balance effect.
func (h *TransactionHandler) UnrealizeTransaction(w http.ResponseWriter, r *http.Request) {
	// Extract ID from path: /api/transactions/<id>/unrealize
	path := r.URL.Path[len("/api/transactions/"):]
	id := strings.TrimSuffix(path, "/unrealize")
	if id == "" || id == path {
		WriteError(w, http.StatusBadRequest, "Transaction ID required")
		return
	}

	result, err := h.ledger.UnrealizeTransaction(id)
	if err != nil {
		log.Printf("Error unrealizing transaction %s: %v", id, err)
		if errors.Is(err, services.ErrTransactionNotFound) {
			WriteError(w, http.StatusNotFound, err.Error())
		} else {
			WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	WriteJSON(w, http.StatusOK, result)
	log.Printf("Transaction unrealized: %s", id)
}
