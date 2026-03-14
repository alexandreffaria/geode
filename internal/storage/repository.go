package storage

import (
	"geode/internal/domain"
)

// Repository defines the interface for transaction storage operations
type Repository interface {
	// Create adds a new transaction to storage
	Create(tx *domain.Transaction) error

	// GetAll retrieves all transactions from storage
	GetAll() ([]*domain.Transaction, error)

	// GetByID retrieves a transaction by its ID
	GetByID(id string) (*domain.Transaction, error)

	// Update updates an existing transaction
	Update(tx *domain.Transaction) error

	// Delete removes a transaction by its ID
	Delete(id string) error

	// Search finds transactions matching the given criteria
	Search(criteria SearchCriteria) ([]*domain.Transaction, error)

	// Backup creates a backup of the storage
	Backup(backupPath string) error

	// Restore restores storage from a backup
	Restore(backupPath string) error
}

// SearchCriteria defines criteria for searching transactions
type SearchCriteria struct {
	DateFrom    string
	DateTo      string
	Source      string
	Destination string
	MinAmount   float64
	MaxAmount   float64
	Currency    string
	Status      string
	Tags        string
}
