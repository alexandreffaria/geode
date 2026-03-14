package main

import (
	"context"
	"fmt"

	"geode/internal/domain"
	"geode/internal/service"
	"geode/internal/storage"
)

// App struct
type App struct {
	ctx                context.Context
	transactionService *service.TransactionService
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// Initialize repository
	repo, err := storage.NewCSVRepository("vault/geode.csv")
	if err != nil {
		fmt.Printf("Error initializing repository: %v\n", err)
		return
	}

	// Initialize services
	a.transactionService = service.NewTransactionService(repo)
}

// Transaction represents a financial transaction (exposed to frontend)
type Transaction struct {
	ID          string  `json:"id"`
	Date        string  `json:"date"`
	Source      string  `json:"source"`
	Destination string  `json:"destination"`
	Amount      float64 `json:"amount"`
	Currency    string  `json:"currency"`
	Description string  `json:"description"`
	Status      string  `json:"status"`
	Tags        string  `json:"tags"`
}

// AddTransaction adds a new transaction
func (a *App) AddTransaction(tx Transaction) bool {
	// Convert frontend Transaction to domain Transaction
	domainTx := &domain.Transaction{
		ID:          tx.ID,
		Date:        tx.Date,
		Source:      tx.Source,
		Destination: tx.Destination,
		Amount:      tx.Amount,
		Currency:    tx.Currency,
		Description: tx.Description,
		Status:      tx.Status,
		Tags:        tx.Tags,
	}

	// Create transaction using service
	if err := a.transactionService.Create(domainTx); err != nil {
		fmt.Printf("Error adding transaction: %v\n", err)
		return false
	}

	return true
}

// UpdateTransaction updates an existing transaction
func (a *App) UpdateTransaction(tx Transaction) bool {
	// Convert frontend Transaction to domain Transaction
	domainTx := &domain.Transaction{
		ID:          tx.ID,
		Date:        tx.Date,
		Source:      tx.Source,
		Destination: tx.Destination,
		Amount:      tx.Amount,
		Currency:    tx.Currency,
		Description: tx.Description,
		Status:      tx.Status,
		Tags:        tx.Tags,
	}

	// Update transaction using service
	if err := a.transactionService.Update(domainTx); err != nil {
		fmt.Printf("Error updating transaction: %v\n", err)
		return false
	}

	return true
}

// DeleteTransaction deletes a transaction by ID
func (a *App) DeleteTransaction(id string) bool {
	// Delete transaction using service
	if err := a.transactionService.Delete(id); err != nil {
		fmt.Printf("Error deleting transaction: %v\n", err)
		return false
	}

	return true
}

// GetTransactions retrieves all transactions
func (a *App) GetTransactions() []Transaction {
	// Get transactions from service
	domainTxs, err := a.transactionService.GetAll()
	if err != nil {
		fmt.Printf("Error getting transactions: %v\n", err)
		return []Transaction{}
	}

	// Convert domain transactions to frontend transactions
	var transactions []Transaction
	for _, dtx := range domainTxs {
		transactions = append(transactions, Transaction{
			ID:          dtx.ID,
			Date:        dtx.Date,
			Source:      dtx.Source,
			Destination: dtx.Destination,
			Amount:      dtx.Amount,
			Currency:    dtx.Currency,
			Description: dtx.Description,
			Status:      dtx.Status,
			Tags:        dtx.Tags,
		})
	}

	return transactions
}