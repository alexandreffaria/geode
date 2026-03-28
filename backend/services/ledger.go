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

// CreateTransaction creates a new transaction (or multiple for installments) and updates account balances.
// Returns a slice of created transactions — one for regular/recurring, N for installments.
func (s *LedgerService) CreateTransaction(transaction *models.Transaction) ([]*models.Transaction, error) {
	// Validate transaction
	if err := transaction.Validate(); err != nil {
		return nil, err
	}

	// Set default date if not provided
	if transaction.Date.IsZero() {
		transaction.Date = models.Date{Time: time.Now()}
	}

	// Case A: Installments
	if transaction.InstallmentTotal != nil && *transaction.InstallmentTotal >= 2 {
		return s.createInstallments(transaction)
	}

	// Case B: Recurring — attach a group ID and save as a single transaction
	if transaction.RecurrenceMonths != nil {
		groupID := uuid.New().String()
		transaction.RecurrenceGroupID = &groupID
	}

	// Default: single transaction
	saved, err := s.saveSingleTransaction(transaction)
	if err != nil {
		return nil, err
	}
	return []*models.Transaction{saved}, nil
}

// createInstallments generates N installment records from a template transaction.
func (s *LedgerService) createInstallments(template *models.Transaction) ([]*models.Transaction, error) {
	n := *template.InstallmentTotal
	groupID := uuid.New().String()
	installmentAmount := template.Amount / float64(n)

	created := make([]*models.Transaction, 0, n)

	for i := 1; i <= n; i++ {
		current := i // capture loop variable

		// Compute date: original date + (i-1) months
		installmentDate := models.Date{
			Time: template.Date.Time.AddDate(0, i-1, 0),
		}

		t := &models.Transaction{
			// Identity
			ID:   uuid.New().String(),
			Date: installmentDate,

			// Core fields copied from template
			Type:        template.Type,
			Amount:      installmentAmount,
			Description: template.Description,
			Account:     template.Account,
			Category:    template.Category,
			FromAccount: template.FromAccount,
			ToAccount:   template.ToAccount,

			// Installment metadata
			InstallmentTotal:   &n,
			InstallmentCurrent: &current,
			InstallmentGroupID: &groupID,
		}

		saved, err := s.saveSingleTransaction(t)
		if err != nil {
			return nil, err
		}
		created = append(created, saved)
	}

	return created, nil
}

// saveSingleTransaction ensures accounts exist, applies balance changes, and persists the transaction.
func (s *LedgerService) saveSingleTransaction(transaction *models.Transaction) (*models.Transaction, error) {
	// Generate ID if not already set
	if transaction.ID == "" {
		transaction.ID = uuid.New().String()
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

// CreateAccount creates a new account with the given parameters.
// If gradientStart or gradientEnd are empty, random ones are generated via NewAccount.
func (s *LedgerService) CreateAccount(name string, initialBalance float64, currency, imageURL, gradientStart, gradientEnd string) (*models.Account, error) {
	if name == "" {
		return nil, errors.New("account name is required")
	}

	// Check for duplicate
	existing, err := s.storage.GetAccountByName(name)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("account already exists")
	}

	account := models.NewAccount(name, initialBalance)

	if currency != "" {
		account.Currency = currency
	}
	if imageURL != "" {
		account.ImageURL = imageURL
	}
	if gradientStart != "" {
		account.GradientStart = gradientStart
	}
	if gradientEnd != "" {
		account.GradientEnd = gradientEnd
	}

	if err := s.storage.SaveAccount(account); err != nil {
		return nil, err
	}
	return account, nil
}

// UpdateAccount updates an existing account's metadata fields.
// When initialBalance changes, Balance is adjusted by the delta.
func (s *LedgerService) UpdateAccount(name string, req *models.AccountUpdateRequest) (*models.Account, error) {
	account, err := s.storage.GetAccountByName(name)
	if err != nil {
		return nil, err
	}
	if account == nil {
		return nil, errors.New("account not found")
	}

	// Handle rename: check new name is not taken
	if req.Name != nil && *req.Name != "" && *req.Name != account.Name {
		existing, err := s.storage.GetAccountByName(*req.Name)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return nil, errors.New("an account with that name already exists")
		}
		// Delete old record, will save under new name below
		if err := s.storage.DeleteAccount(account.Name); err != nil {
			return nil, err
		}
		account.Name = *req.Name
	}

	if req.Currency != nil {
		account.Currency = *req.Currency
	}
	if req.ImageURL != nil {
		account.ImageURL = *req.ImageURL
	}
	if req.GradientStart != nil {
		account.GradientStart = *req.GradientStart
	}
	if req.GradientEnd != nil {
		account.GradientEnd = *req.GradientEnd
	}
	if req.Archived != nil {
		account.Archived = *req.Archived
	}
	if req.InitialBalance != nil {
		delta := *req.InitialBalance - account.InitialBalance
		account.Balance += delta
		account.InitialBalance = *req.InitialBalance
	}

	account.LastUpdated = time.Now()

	// If we renamed, the old record was deleted; save as new
	if req.Name != nil && *req.Name != "" && *req.Name != name {
		if err := s.storage.SaveAccount(account); err != nil {
			return nil, err
		}
	} else {
		if err := s.storage.UpdateAccount(account); err != nil {
			return nil, err
		}
	}

	return account, nil
}

// DeleteAccount deletes an account by name
func (s *LedgerService) DeleteAccount(name string) error {
	account, err := s.storage.GetAccountByName(name)
	if err != nil {
		return err
	}
	if account == nil {
		return errors.New("account not found")
	}
	return s.storage.DeleteAccount(name)
}

// GetAllCategories retrieves all categories
func (s *LedgerService) GetAllCategories() ([]*models.Category, error) {
	return s.storage.GetAllCategories()
}

// GetCategoryByName retrieves a category by name
func (s *LedgerService) GetCategoryByName(name string) (*models.Category, error) {
	return s.storage.GetCategoryByName(name)
}

// CreateCategory creates a new category with the given parameters.
// If gradientStart or gradientEnd are empty, random ones are generated via NewCategory.
// If parentName is set, the parent category must exist.
func (s *LedgerService) CreateCategory(name string, categoryType string, parentName *string, gradientStart, gradientEnd, imageURL string) (*models.Category, error) {
	if name == "" {
		return nil, errors.New("category name is required")
	}

	if categoryType != "income" && categoryType != "expense" {
		return nil, errors.New("type must be 'income' or 'expense'")
	}

	// Check for duplicate
	existing, err := s.storage.GetCategoryByName(name)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, errors.New("category already exists")
	}

	// If parentName is set, verify parent exists
	if parentName != nil && *parentName != "" {
		parent, err := s.storage.GetCategoryByName(*parentName)
		if err != nil {
			return nil, err
		}
		if parent == nil {
			return nil, errors.New("parent category not found")
		}
	}

	category := models.NewCategory(name, categoryType, parentName)

	if gradientStart != "" {
		category.GradientStart = gradientStart
	}
	if gradientEnd != "" {
		category.GradientEnd = gradientEnd
	}
	if imageURL != "" {
		category.ImageURL = imageURL
	}

	if err := s.storage.SaveCategory(category); err != nil {
		return nil, err
	}
	return category, nil
}

// UpdateCategory updates an existing category's fields.
// When req.Name is set and different, the category is renamed (delete old + save new).
// When req.ParentName is set to empty string "", the parent is cleared (top-level).
func (s *LedgerService) UpdateCategory(name string, req models.CategoryUpdateRequest) (*models.Category, error) {
	category, err := s.storage.GetCategoryByName(name)
	if err != nil {
		return nil, err
	}
	if category == nil {
		return nil, errors.New("category not found")
	}

	// Handle rename: check new name is not taken
	if req.Name != nil && *req.Name != "" && *req.Name != category.Name {
		existing, err := s.storage.GetCategoryByName(*req.Name)
		if err != nil {
			return nil, err
		}
		if existing != nil {
			return nil, errors.New("a category with that name already exists")
		}
		// Delete old record, will save under new name below
		if err := s.storage.DeleteCategory(category.Name); err != nil {
			return nil, err
		}
		category.Name = *req.Name
	}

	// Update parent: nil pointer = not provided; non-nil pointer = update
	// empty string "" = clear parent (make top-level)
	if req.ParentName != nil {
		if *req.ParentName == "" {
			category.ParentName = nil
		} else {
			// Verify new parent exists
			parent, err := s.storage.GetCategoryByName(*req.ParentName)
			if err != nil {
				return nil, err
			}
			if parent == nil {
				return nil, errors.New("parent category not found")
			}
			category.ParentName = req.ParentName
		}
	}

	if req.Type != nil {
		if *req.Type != "income" && *req.Type != "expense" {
			return nil, errors.New("type must be 'income' or 'expense'")
		}
		category.Type = *req.Type
	}

	if req.GradientStart != nil {
		category.GradientStart = *req.GradientStart
	}
	if req.GradientEnd != nil {
		category.GradientEnd = *req.GradientEnd
	}
	if req.ImageURL != nil {
		category.ImageURL = *req.ImageURL
	}

	category.LastUpdated = time.Now()

	// If we renamed, the old record was deleted; save as new
	if req.Name != nil && *req.Name != "" && *req.Name != name {
		if err := s.storage.SaveCategory(category); err != nil {
			return nil, err
		}
	} else {
		if err := s.storage.UpdateCategory(category); err != nil {
			return nil, err
		}
	}

	return category, nil
}

// DeleteCategory deletes a category by name
func (s *LedgerService) DeleteCategory(name string) error {
	category, err := s.storage.GetCategoryByName(name)
	if err != nil {
		return err
	}
	if category == nil {
		return errors.New("category not found")
	}
	return s.storage.DeleteCategory(name)
}
