package service

import (
	"geode/internal/domain"
	"geode/internal/storage"
	"geode/internal/validation"
)

// TransactionService handles business logic for transactions
type TransactionService struct {
	repo storage.Repository
}

// NewTransactionService creates a new transaction service
func NewTransactionService(repo storage.Repository) *TransactionService {
	return &TransactionService{
		repo: repo,
	}
}

// Create creates a new transaction
func (s *TransactionService) Create(tx *domain.Transaction) error {
	// Sanitize inputs
	tx.Description = validation.SanitizeString(tx.Description)
	tx.Tags = validation.SanitizeTags(tx.Tags)
	tx.Source = validation.SanitizeString(tx.Source)
	tx.Destination = validation.SanitizeString(tx.Destination)

	// Set defaults before validation
	tx.SetDefaults()

	// Validate the transaction
	if err := tx.Validate(); err != nil {
		return err
	}

	// Create in repository
	return s.repo.Create(tx)
}

// GetAll retrieves all transactions
func (s *TransactionService) GetAll() ([]*domain.Transaction, error) {
	return s.repo.GetAll()
}

// GetByID retrieves a transaction by ID
func (s *TransactionService) GetByID(id string) (*domain.Transaction, error) {
	if err := validation.ValidateID(id); err != nil {
		return nil, err
	}
	return s.repo.GetByID(id)
}

// Update updates an existing transaction
func (s *TransactionService) Update(tx *domain.Transaction) error {
	// Sanitize inputs
	tx.Description = validation.SanitizeString(tx.Description)
	tx.Tags = validation.SanitizeTags(tx.Tags)
	tx.Source = validation.SanitizeString(tx.Source)
	tx.Destination = validation.SanitizeString(tx.Destination)

	// Validate the transaction
	if err := tx.Validate(); err != nil {
		return err
	}

	// Update in repository
	return s.repo.Update(tx)
}

// Delete deletes a transaction by ID
func (s *TransactionService) Delete(id string) error {
	if err := validation.ValidateID(id); err != nil {
		return err
	}
	return s.repo.Delete(id)
}

// Search searches for transactions matching criteria
func (s *TransactionService) Search(criteria storage.SearchCriteria) ([]*domain.Transaction, error) {
	// Validate search criteria
	if criteria.DateFrom != "" {
		if err := validation.ValidateDate(criteria.DateFrom); err != nil {
			return nil, err
		}
	}
	if criteria.DateTo != "" {
		if err := validation.ValidateDate(criteria.DateTo); err != nil {
			return nil, err
		}
	}
	if criteria.MinAmount > 0 {
		if err := validation.ValidateAmount(criteria.MinAmount); err != nil {
			return nil, err
		}
	}
	if criteria.MaxAmount > 0 {
		if err := validation.ValidateAmount(criteria.MaxAmount); err != nil {
			return nil, err
		}
	}

	return s.repo.Search(criteria)
}
