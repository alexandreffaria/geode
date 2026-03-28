package storage

import "github.com/meulindo/geode/backend/models"

// Storage defines the interface for data persistence
type Storage interface {
	// Transaction operations
	SaveTransaction(transaction *models.Transaction) error
	GetAllTransactions() ([]*models.Transaction, error)
	GetTransactionByID(id string) (*models.Transaction, error)
	UpdateTransaction(transaction *models.Transaction) error
	DeleteTransaction(id string) error

	// Account operations
	SaveAccount(account *models.Account) error
	GetAllAccounts() ([]*models.Account, error)
	GetAccountByName(name string) (*models.Account, error)
	UpdateAccount(account *models.Account) error
	DeleteAccount(name string) error

	// Category operations
	SaveCategory(category *models.Category) error
	GetAllCategories() ([]*models.Category, error)
	GetCategoryByName(name string) (*models.Category, error)
	UpdateCategory(category *models.Category) error
	DeleteCategory(name string) error
}
