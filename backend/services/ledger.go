package services

import (
	"errors"
	"time"

	"github.com/meulindo/geode/backend/models"
	"github.com/meulindo/geode/backend/storage"
	"github.com/google/uuid"
)

// LedgerService handles business logic for transactions and accounts
type LedgerService struct {
	storage storage.Storage
}

// NewLedgerService creates a new ledger service
func NewLedgerService(storage storage.Storage) *LedgerService {
	return &LedgerService{
		storage: storage,
	}
}

// CreateTransaction creates a new transaction and updates account balances
func (s *LedgerService) CreateTransaction(transaction *models.Transaction) (*models.Transaction, error) {
	// Validate transaction
	if err := transaction.Validate(); err != nil {
		return nil, err
	}

	// Generate ID and set timestamp if not provided
	transaction.ID = uuid.New().String()
	if transaction.Date.IsZero() {
		transaction.Date = time.Now()
	}

	// Get or create affected accounts
	affectedAccounts := transaction.GetAffectedAccounts()
	for _, accountName := range affectedAccounts {
		account, err := s.storage.GetAccountByName(accountName)
		if err != nil {
			return nil, err
		}

		// Create account if it doesn't exist
		if account == nil {
			account = models.NewAccount(accountName)
			if err := s.storage.SaveAccount(account); err != nil {
				return nil, err
			}
		}
	}

	// Update account balances based on transaction type
	if err := s.updateAccountBalances(transaction); err != nil {
		return nil, err
	}

	// Save transaction
	if err := s.storage.SaveTransaction(transaction); err != nil {
		return nil, err
	}

	return transaction, nil
}

// updateAccountBalances updates the balances of accounts affected by a transaction
func (s *LedgerService) updateAccountBalances(transaction *models.Transaction) error {
	switch transaction.Type {
	case models.TransactionTypePurchase:
		// Money leaves the account (category is just metadata, no balance tracking)
		if transaction.Account != nil && *transaction.Account != "" {
			if err := s.adjustAccountBalance(*transaction.Account, -transaction.Amount); err != nil {
				return err
			}
		}

	case models.TransactionTypeEarning:
		// Money enters the account (category is just metadata, no balance tracking)
		if transaction.Account != nil && *transaction.Account != "" {
			if err := s.adjustAccountBalance(*transaction.Account, transaction.Amount); err != nil {
				return err
			}
		}

	case models.TransactionTypeTransfer:
		// Money leaves from_account
		if transaction.FromAccount != nil && *transaction.FromAccount != "" {
			if err := s.adjustAccountBalance(*transaction.FromAccount, -transaction.Amount); err != nil {
				return err
			}
		}
		// Money enters to_account
		if transaction.ToAccount != nil && *transaction.ToAccount != "" {
			if err := s.adjustAccountBalance(*transaction.ToAccount, transaction.Amount); err != nil {
				return err
			}
		}
	}

	return nil
}

// adjustAccountBalance adjusts an account's balance by the given amount
func (s *LedgerService) adjustAccountBalance(accountName string, amount float64) error {
	account, err := s.storage.GetAccountByName(accountName)
	if err != nil {
		return err
	}

	if account == nil {
		return errors.New("account not found: " + accountName)
	}

	account.UpdateBalance(amount)
	return s.storage.UpdateAccount(account)
}

// GetAllTransactions retrieves all transactions
func (s *LedgerService) GetAllTransactions() ([]*models.Transaction, error) {
	return s.storage.GetAllTransactions()
}

// GetTransactionByID retrieves a transaction by ID
func (s *LedgerService) GetTransactionByID(id string) (*models.Transaction, error) {
	return s.storage.GetTransactionByID(id)
}

// GetAllAccounts retrieves all accounts
func (s *LedgerService) GetAllAccounts() ([]*models.Account, error) {
	return s.storage.GetAllAccounts()
}

// GetAccountByName retrieves an account by name
func (s *LedgerService) GetAccountByName(name string) (*models.Account, error) {
	return s.storage.GetAccountByName(name)
}
