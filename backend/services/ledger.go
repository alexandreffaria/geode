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
		transaction.Date = models.Date{Time: time.Now()}
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

// applyBalanceChange applies a balance change to an account
// If isCredit is true, the amount is added; if false, it's subtracted
func (s *LedgerService) applyBalanceChange(accountID string, amount float64, isCredit bool) error {
	if accountID == "" {
		return nil
	}
	
	adjustment := amount
	if !isCredit {
		adjustment = -amount
	}
	
	return s.adjustAccountBalance(accountID, adjustment)
}

// updateAccountBalances updates the balances of accounts affected by a transaction
func (s *LedgerService) updateAccountBalances(transaction *models.Transaction) error {
	switch transaction.Type {
	case models.TransactionTypePurchase:
		// Money leaves the account (category is just metadata, no balance tracking)
		if transaction.Account != nil {
			if err := s.applyBalanceChange(*transaction.Account, transaction.Amount, false); err != nil {
				return err
			}
		}

	case models.TransactionTypeEarning:
		// Money enters the account (category is just metadata, no balance tracking)
		if transaction.Account != nil {
			if err := s.applyBalanceChange(*transaction.Account, transaction.Amount, true); err != nil {
				return err
			}
		}

	case models.TransactionTypeTransfer:
		// Money leaves from_account
		if transaction.FromAccount != nil {
			if err := s.applyBalanceChange(*transaction.FromAccount, transaction.Amount, false); err != nil {
				return err
			}
		}
		// Money enters to_account
		if transaction.ToAccount != nil {
			if err := s.applyBalanceChange(*transaction.ToAccount, transaction.Amount, true); err != nil {
				return err
			}
		}
	}

	return nil
}

// reverseAccountBalances reverses the effect of a transaction on account balances
func (s *LedgerService) reverseAccountBalances(transaction *models.Transaction) error {
	switch transaction.Type {
	case models.TransactionTypePurchase:
		// Reverse: add money back to account
		if transaction.Account != nil {
			if err := s.applyBalanceChange(*transaction.Account, transaction.Amount, true); err != nil {
				return err
			}
		}

	case models.TransactionTypeEarning:
		// Reverse: remove money from account
		if transaction.Account != nil {
			if err := s.applyBalanceChange(*transaction.Account, transaction.Amount, false); err != nil {
				return err
			}
		}

	case models.TransactionTypeTransfer:
		// Reverse: add back to from_account, remove from to_account
		if transaction.FromAccount != nil {
			if err := s.applyBalanceChange(*transaction.FromAccount, transaction.Amount, true); err != nil {
				return err
			}
		}
		if transaction.ToAccount != nil {
			if err := s.applyBalanceChange(*transaction.ToAccount, transaction.Amount, false); err != nil {
				return err
			}
		}
	}

	return nil
}

// UpdateTransaction updates an existing transaction
func (s *LedgerService) UpdateTransaction(updated *models.Transaction) (*models.Transaction, error) {
	// Validate the updated transaction
	if err := updated.Validate(); err != nil {
		return nil, err
	}

	// Get the original transaction
	original, err := s.storage.GetTransactionByID(updated.ID)
	if err != nil {
		return nil, err
	}
	if original == nil {
		return nil, errors.New("transaction not found")
	}

	// Reverse the original transaction's effect on account balances
	if err := s.reverseAccountBalances(original); err != nil {
		return nil, err
	}

	// Apply the updated transaction's effect on account balances
	if err := s.updateAccountBalances(updated); err != nil {
		// If this fails, try to restore original state
		s.updateAccountBalances(original)
		return nil, err
	}

	// Update the transaction in storage
	if err := s.storage.UpdateTransaction(updated); err != nil {
		// Rollback balance changes
		s.reverseAccountBalances(updated)
		s.updateAccountBalances(original)
		return nil, err
	}

	return updated, nil
}

// DeleteTransaction deletes a transaction and reverses its effects on account balances
func (s *LedgerService) DeleteTransaction(id string) error {
	// Get the transaction to delete
	transaction, err := s.storage.GetTransactionByID(id)
	if err != nil {
		return err
	}
	if transaction == nil {
		return errors.New("transaction not found")
	}

	// Reverse the transaction's effect on account balances
	if err := s.reverseAccountBalances(transaction); err != nil {
		return err
	}

	// Delete the transaction from storage
	if err := s.storage.DeleteTransaction(id); err != nil {
		// If deletion fails, try to restore the account balances
		s.updateAccountBalances(transaction)
		return err
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
