package services

import (
	"errors"
	"fmt"
	"log"
	"sort"
	"time"

	"github.com/google/uuid"
	"github.com/meulindo/geode/backend/models"
	"github.com/meulindo/geode/backend/storage"
)

// Sentinel errors for the services package.
var (
	ErrAccountNotFound      = errors.New("account not found")
	ErrAccountAlreadyExists = errors.New("account already exists")
	ErrCategoryNotFound     = errors.New("category not found")
	ErrTransactionNotFound  = errors.New("transaction not found")
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

	// Auto-generate 10 years of virtual transactions for recurring series (best-effort)
	if transaction.RecurrenceMonths != nil && transaction.InstallmentTotal == nil {
		if err := s.generateVirtualRecurring(saved); err != nil {
			log.Printf("WARN: failed to generate virtual recurring for %s: %v", saved.ID, err)
		}
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
		current := i // capture loop variable (Go 1.21)

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

// isUnpaid returns true if the transaction has Paid explicitly set to false.
// Transactions with Paid == nil or Paid == true are considered settled and affect balances.
func isUnpaid(transaction *models.Transaction) bool {
	return transaction.Paid != nil && !*transaction.Paid
}

// isVirtual returns true if the transaction has IsVirtual explicitly set to true.
// Virtual transactions are projected/forecast entries that do not affect account balances.
func isVirtual(transaction *models.Transaction) bool {
	return transaction.IsVirtual != nil && *transaction.IsVirtual
}

// updateAccountBalances updates the balances of accounts affected by a transaction.
// Transactions with Paid == false (unpaid/pending) are skipped — they do not affect balances.
func (s *LedgerService) updateAccountBalances(transaction *models.Transaction) error {
	// Unpaid transactions do not affect balances
	if isUnpaid(transaction) {
		return nil
	}
	// Virtual transactions do not affect account balances
	if isVirtual(transaction) {
		return nil
	}

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
		// Money leaves from_account (always debited by the original amount)
		if transaction.FromAccount != nil {
			if err := s.applyBalanceChange(*transaction.FromAccount, transaction.Amount, false); err != nil {
				return err
			}
		}
		// Money enters to_account (credited by ConvertedAmount if set and > 0, else Amount)
		if transaction.ToAccount != nil {
			creditAmount := transaction.Amount
			if transaction.ConvertedAmount != nil && *transaction.ConvertedAmount > 0 {
				creditAmount = *transaction.ConvertedAmount
			}
			if err := s.applyBalanceChange(*transaction.ToAccount, creditAmount, true); err != nil {
				return err
			}
		}
	}

	return nil
}

// reverseAccountBalances reverses the effect of a transaction on account balances.
// Unpaid transactions (Paid == false) had no effect on balances, so nothing to reverse.
func (s *LedgerService) reverseAccountBalances(transaction *models.Transaction) error {
	// Unpaid transactions never affected balances, so nothing to reverse
	if isUnpaid(transaction) {
		return nil
	}
	// Virtual transactions never affected balances, so nothing to reverse
	if isVirtual(transaction) {
		return nil
	}

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
		// Reverse: add back to from_account (original amount), remove from to_account (ConvertedAmount if set)
		if transaction.FromAccount != nil {
			if err := s.applyBalanceChange(*transaction.FromAccount, transaction.Amount, true); err != nil {
				return err
			}
		}
		if transaction.ToAccount != nil {
			debitAmount := transaction.Amount
			if transaction.ConvertedAmount != nil && *transaction.ConvertedAmount > 0 {
				debitAmount = *transaction.ConvertedAmount
			}
			if err := s.applyBalanceChange(*transaction.ToAccount, debitAmount, false); err != nil {
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
		return nil, ErrTransactionNotFound
	}

	// Preserve fields from the original that should never be overwritten by the request body
	updated.RecurrenceGroupID = original.RecurrenceGroupID

	// Reverse the original transaction's effect on account balances
	if err := s.reverseAccountBalances(original); err != nil {
		return nil, err
	}

	// Apply the updated transaction's effect on account balances
	if err := s.updateAccountBalances(updated); err != nil {
		// If this fails, try to restore original state
		if rbErr := s.updateAccountBalances(original); rbErr != nil {
			log.Printf("CRITICAL: rollback failed for transaction %s: %v", updated.ID, rbErr)
		}
		return nil, err
	}

	// Update the transaction in storage
	if err := s.storage.UpdateTransaction(updated); err != nil {
		// Rollback balance changes
		if rbErr := s.reverseAccountBalances(updated); rbErr != nil {
			log.Printf("CRITICAL: rollback failed for transaction %s: %v", updated.ID, rbErr)
		}
		if rbErr := s.updateAccountBalances(original); rbErr != nil {
			log.Printf("CRITICAL: rollback failed for transaction %s: %v", updated.ID, rbErr)
		}
		return nil, err
	}

	return updated, nil
}

// UpdateRecurringGroup updates all transactions that share the given recurrence_group_id.
// For each member of the group the original balance impact is reversed, the new values
// (from `updated`) are applied while preserving per-transaction identity fields (ID, Date,
// RecurrenceGroupID, InstallmentCurrent, InstallmentTotal), and the record is persisted.
// Returns the full list of updated transactions.
func (s *LedgerService) UpdateRecurringGroup(groupID string, updated *models.Transaction) ([]*models.Transaction, error) {
	// Validate the template transaction
	if err := updated.Validate(); err != nil {
		return nil, err
	}

	// Fetch all transactions in the group
	group, err := s.storage.GetTransactionsByGroupID(groupID)
	if err != nil {
		return nil, err
	}
	if len(group) == 0 {
		return nil, errors.New("no transactions found for group: " + groupID)
	}

	results := make([]*models.Transaction, 0, len(group))

	for _, original := range group {
		// Build the updated record, preserving per-transaction identity fields
		t := &models.Transaction{
			// Identity — must not change
			ID:                original.ID,
			Date:              original.Date,
			RecurrenceGroupID: original.RecurrenceGroupID,

			// Preserve virtual flag from original — do NOT overwrite virtual entries
			IsVirtual: original.IsVirtual,

			// Installment metadata — preserve if present on the original
			InstallmentTotal:   original.InstallmentTotal,
			InstallmentCurrent: original.InstallmentCurrent,
			InstallmentGroupID: original.InstallmentGroupID,

			// All other fields come from the template
			Type:        updated.Type,
			Amount:      updated.Amount,
			Description: updated.Description,
			Account:     updated.Account,
			Category:    updated.Category,
			FromAccount: updated.FromAccount,
			ToAccount:   updated.ToAccount,

			// Recurrence metadata from template (months / unit stay consistent across group)
			RecurrenceMonths: updated.RecurrenceMonths,
			RecurrenceUnit:   updated.RecurrenceUnit,

			// Payment state from template
			Paid:                updated.Paid,
			CreditCardBillMonth: updated.CreditCardBillMonth,
		}

		// Reverse the original balance impact
		if err := s.reverseAccountBalances(original); err != nil {
			return nil, fmt.Errorf("failed to reverse balances for transaction %s: %w", original.ID, err)
		}

		// Apply the new balance impact
		if err := s.updateAccountBalances(t); err != nil {
			// Best-effort rollback of this transaction's reversal
			if rbErr := s.updateAccountBalances(original); rbErr != nil {
				log.Printf("CRITICAL: rollback failed for transaction %s: %v", t.ID, rbErr)
			}
			return nil, fmt.Errorf("failed to apply balances for transaction %s: %w", t.ID, err)
		}

		// Persist the updated record
		if err := s.storage.UpdateTransaction(t); err != nil {
			// Best-effort rollback
			if rbErr := s.reverseAccountBalances(t); rbErr != nil {
				log.Printf("CRITICAL: rollback failed for transaction %s: %v", t.ID, rbErr)
			}
			if rbErr := s.updateAccountBalances(original); rbErr != nil {
				log.Printf("CRITICAL: rollback failed for transaction %s: %v", t.ID, rbErr)
			}
			return nil, fmt.Errorf("failed to save transaction %s: %w", t.ID, err)
		}

		results = append(results, t)
	}

	return results, nil
}

// DeleteTransaction deletes a transaction and reverses its effects on account balances
func (s *LedgerService) DeleteTransaction(id string) error {
	// Get the transaction to delete
	transaction, err := s.storage.GetTransactionByID(id)
	if err != nil {
		return err
	}
	if transaction == nil {
		return ErrTransactionNotFound
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

// generateVirtualRecurring creates virtual future instances of a recurring transaction
// for a 10-year horizon. The anchor transaction (already saved) is the first real entry.
// Virtual transactions share the same RecurrenceGroupID and have IsVirtual = true.
func (s *LedgerService) generateVirtualRecurring(anchor *models.Transaction) error {
	if anchor.RecurrenceGroupID == nil || anchor.RecurrenceMonths == nil {
		return nil
	}

	isVirtualTrue := true
	interval := *anchor.RecurrenceMonths
	recurrenceUnit := "month"
	if anchor.RecurrenceUnit != nil {
		recurrenceUnit = *anchor.RecurrenceUnit
	}

	// 10-year horizon from the anchor date
	horizon := anchor.Date.Time.AddDate(10, 0, 0)
	current := anchor.Date.Time

	for {
		// Advance by the recurrence interval
		switch recurrenceUnit {
		case "day":
			current = current.AddDate(0, 0, interval)
		case "week":
			current = current.AddDate(0, 0, interval*7)
		default: // "month"
			current = current.AddDate(0, interval, 0)
		}
		if current.After(horizon) {
			break
		}

		t := &models.Transaction{
			ID:   uuid.New().String(),
			Date: models.Date{Time: current},

			Type:        anchor.Type,
			Amount:      anchor.Amount,
			Description: anchor.Description,
			Account:     anchor.Account,
			Category:    anchor.Category,
			FromAccount: anchor.FromAccount,
			ToAccount:   anchor.ToAccount,

			RecurrenceMonths:  anchor.RecurrenceMonths,
			RecurrenceUnit:    anchor.RecurrenceUnit,
			RecurrenceGroupID: anchor.RecurrenceGroupID,

			IsVirtual: &isVirtualTrue,
		}

		// saveSingleTransaction skips balance updates for virtual (via isVirtual guard)
		if _, err := s.saveSingleTransaction(t); err != nil {
			return fmt.Errorf("failed to save virtual transaction at %s: %w",
				current.Format("2006-01-02"), err)
		}
	}
	return nil
}

// RealizeTransaction converts a virtual transaction into a real one.
// It clears IsVirtual, then applies the balance change that was previously skipped.
// Returns the updated transaction.
func (s *LedgerService) RealizeTransaction(id string) (*models.Transaction, error) {
	t, err := s.storage.GetTransactionByID(id)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, ErrTransactionNotFound
	}
	if !isVirtual(t) {
		return nil, errors.New("transaction is not virtual")
	}

	// Clear the virtual flag — transaction becomes real
	t.IsVirtual = nil

	// Now apply balance changes (previously skipped because it was virtual)
	if err := s.updateAccountBalances(t); err != nil {
		return nil, fmt.Errorf("failed to apply balances on realize: %w", err)
	}

	// Persist the realized transaction
	if err := s.storage.UpdateTransaction(t); err != nil {
		// Rollback balance change
		if rbErr := s.reverseAccountBalances(t); rbErr != nil {
			log.Printf("CRITICAL: rollback failed for realize %s: %v", id, rbErr)
		}
		return nil, err
	}

	return t, nil
}

// UnrealizeTransaction converts a real transaction back to virtual.
// It sets IsVirtual = true, then reverses the balance change that was previously applied.
// Returns the updated transaction.
func (s *LedgerService) UnrealizeTransaction(id string) (*models.Transaction, error) {
	t, err := s.storage.GetTransactionByID(id)
	if err != nil {
		return nil, err
	}
	if t == nil {
		return nil, ErrTransactionNotFound
	}
	if isVirtual(t) {
		return nil, errors.New("transaction is already virtual")
	}

	// Reverse the balance changes that were applied when this transaction was real
	if err := s.reverseAccountBalances(t); err != nil {
		return nil, fmt.Errorf("failed to reverse balances on unrealize: %w", err)
	}

	// Mark as virtual
	isVirtualTrue := true
	t.IsVirtual = &isVirtualTrue

	// Persist the unrealized transaction
	if err := s.storage.UpdateTransaction(t); err != nil {
		// Rollback: re-apply the balance change
		t.IsVirtual = nil
		if rbErr := s.updateAccountBalances(t); rbErr != nil {
			log.Printf("CRITICAL: rollback failed for unrealize %s: %v", id, rbErr)
		}
		return nil, err
	}

	return t, nil
}

// adjustAccountBalance adjusts an account's balance by the given amount
func (s *LedgerService) adjustAccountBalance(accountName string, amount float64) error {
	account, err := s.storage.GetAccountByName(accountName)
	if err != nil {
		return err
	}

	if account == nil {
		return ErrAccountNotFound
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
// accountType defaults to "checking" if empty.
func (s *LedgerService) CreateAccount(name string, initialBalance float64, currency, imageURL, gradientStart, gradientEnd, accountType string, creditLimit *float64) (*models.Account, error) {
	if name == "" {
		return nil, errors.New("account name is required")
	}

	// Check for duplicate
	existing, err := s.storage.GetAccountByName(name)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return nil, ErrAccountAlreadyExists
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
	if accountType != "" {
		account.Type = accountType
	}
	if creditLimit != nil {
		account.CreditLimit = creditLimit
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
		return nil, ErrAccountNotFound
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
	if req.Type != nil {
		account.Type = *req.Type
	}
	if req.CreditLimit != nil {
		account.CreditLimit = req.CreditLimit
	}
	if req.IsMain != nil {
		if *req.IsMain {
			// Enforce single-main constraint: clear flag from all other accounts first
			if err := s.storage.SetMainAccount(account.Name); err != nil {
				return nil, err
			}
		}
		account.IsMain = *req.IsMain
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

// SetMainAccount designates the named account as the main account.
// Validates the account exists, then delegates to storage to clear all others.
func (s *LedgerService) SetMainAccount(name string) error {
	account, err := s.storage.GetAccountByName(name)
	if err != nil {
		return err
	}
	if account == nil {
		return ErrAccountNotFound
	}
	return s.storage.SetMainAccount(name)
}

// GetMainAccount returns the account marked as main, or nil if none is set.
func (s *LedgerService) GetMainAccount() (*models.Account, error) {
	return s.storage.GetMainAccount()
}

// DeleteAccount deletes an account by name
func (s *LedgerService) DeleteAccount(name string) error {
	account, err := s.storage.GetAccountByName(name)
	if err != nil {
		return err
	}
	if account == nil {
		return ErrAccountNotFound
	}
	return s.storage.DeleteAccount(name)
}

// GetAllCategories retrieves all categories with ParentName populated.
func (s *LedgerService) GetAllCategories() ([]*models.Category, error) {
	return s.storage.GetAllCategories()
}

// GetCategoryByID retrieves a category by its UUID.
func (s *LedgerService) GetCategoryByID(id string) (*models.Category, error) {
	return s.storage.GetCategoryByID(id)
}

// GetCategoryByName retrieves a category by name (kept for internal use).
func (s *LedgerService) GetCategoryByName(name string) (*models.Category, error) {
	return s.storage.GetCategoryByName(name)
}

// CreateCategory creates a new category with the given parameters.
// If gradientStart or gradientEnd are empty, random ones are generated via NewCategory.
// If parentID is set, the parent category must exist.
// Uniqueness is enforced by (name, type, parent_id) scope.
func (s *LedgerService) CreateCategory(name string, categoryType string, parentID *string, gradientStart, gradientEnd, imageURL string) (*models.Category, error) {
	if name == "" {
		return nil, errors.New("category name is required")
	}

	if categoryType != "income" && categoryType != "expense" {
		return nil, errors.New("type must be 'income' or 'expense'")
	}

	// If parentID is set, verify parent exists
	if parentID != nil && *parentID != "" {
		parent, err := s.storage.GetCategoryByID(*parentID)
		if err != nil {
			return nil, err
		}
		if parent == nil {
			return nil, ErrCategoryNotFound
		}
	}

	category := models.NewCategory(name, categoryType, parentID)
	category.ID = uuid.New().String()

	if gradientStart != "" {
		category.GradientStart = gradientStart
	}
	if gradientEnd != "" {
		category.GradientEnd = gradientEnd
	}
	if imageURL != "" {
		category.ImageURL = imageURL
	}

	// SaveCategory enforces (name, type, parent_id) uniqueness and generates UUID if needed
	if err := s.storage.SaveCategory(category); err != nil {
		return nil, err
	}
	return category, nil
}

// UpdateCategory updates an existing category's fields by ID.
// When req.Name is set and different, the category is renamed.
// When req.ParentID is set to empty string "", the parent is cleared (top-level).
// Uniqueness is enforced by (name, type, parent_id) scope.
func (s *LedgerService) UpdateCategory(id string, req models.CategoryUpdateRequest) (*models.Category, error) {
	category, err := s.storage.GetCategoryByID(id)
	if err != nil {
		return nil, err
	}
	if category == nil {
		return nil, ErrCategoryNotFound
	}

	// Apply name update
	if req.Name != nil && *req.Name != "" {
		category.Name = *req.Name
	}

	// Apply type update
	if req.Type != nil {
		if *req.Type != "income" && *req.Type != "expense" {
			return nil, errors.New("type must be 'income' or 'expense'")
		}
		category.Type = *req.Type
	}

	// Update parent: nil pointer = not provided; non-nil pointer = update
	// empty string "" = clear parent (make top-level)
	if req.ParentID != nil {
		if *req.ParentID == "" {
			category.ParentID = nil
		} else {
			// Verify new parent exists
			parent, err := s.storage.GetCategoryByID(*req.ParentID)
			if err != nil {
				return nil, err
			}
			if parent == nil {
				return nil, ErrCategoryNotFound
			}
			category.ParentID = req.ParentID
		}
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

	updated, err := s.storage.UpdateCategory(id, category)
	if err != nil {
		return nil, err
	}

	return updated, nil
}

// DeleteCategory deletes a category by ID.
func (s *LedgerService) DeleteCategory(id string) error {
	category, err := s.storage.GetCategoryByID(id)
	if err != nil {
		return err
	}
	if category == nil {
		return ErrCategoryNotFound
	}
	return s.storage.DeleteCategory(id)
}

// GetCreditCardBills returns the monthly bill summary for a credit card account.
// It groups purchase transactions by CreditCardBillMonth (or transaction month if nil),
// and matches bill payment transfers (ToAccount == accountName, Paid == true) per month.
func (s *LedgerService) GetCreditCardBills(accountName string) ([]*models.CreditCardBillSummary, error) {
	account, err := s.storage.GetAccountByName(accountName)
	if err != nil {
		return nil, err
	}
	if account == nil {
		return nil, ErrAccountNotFound
	}

	allTransactions, err := s.storage.GetAllTransactions()
	if err != nil {
		return nil, err
	}

	// monthTotals accumulates purchase amounts per billing month
	monthTotals := map[string]float64{}
	// monthPaid accumulates paid bill payment amounts per billing month
	monthPaid := map[string]float64{}

	for _, t := range allTransactions {
		// Skip virtual transactions — they don't affect real balances
		if isVirtual(t) {
			continue
		}

		// Purchase transactions on this credit card account
		if t.Type == models.TransactionTypePurchase && t.Account != nil && *t.Account == accountName {
			month := billMonth(t)
			monthTotals[month] += t.Amount
		}

		// Bill payment transfers: transfer TO this credit card account with Paid set
		if t.Type == models.TransactionTypeTransfer && t.ToAccount != nil && *t.ToAccount == accountName {
			if t.Paid != nil && *t.Paid {
				// Paid bill payment — credit against the billing month
				month := ""
				if t.CreditCardBillMonth != nil && *t.CreditCardBillMonth != "" {
					month = *t.CreditCardBillMonth
				} else {
					month = t.Date.Time.Format("2006-01")
				}
				monthPaid[month] += t.Amount
			}
		}
	}

	// Build sorted list of all months that appear in either map
	monthSet := map[string]struct{}{}
	for m := range monthTotals {
		monthSet[m] = struct{}{}
	}
	for m := range monthPaid {
		monthSet[m] = struct{}{}
	}

	months := make([]string, 0, len(monthSet))
	for m := range monthSet {
		months = append(months, m)
	}
	sort.Strings(months)

	summaries := make([]*models.CreditCardBillSummary, 0, len(months))
	for _, m := range months {
		total := monthTotals[m]
		paid := monthPaid[m]
		unpaid := total - paid
		summaries = append(summaries, &models.CreditCardBillSummary{
			Month:        m,
			TotalAmount:  total,
			PaidAmount:   paid,
			UnpaidAmount: unpaid,
			IsFullyPaid:  unpaid <= 0,
		})
	}

	return summaries, nil
}

// billMonth returns the billing month string ("YYYY-MM") for a transaction.
// Uses CreditCardBillMonth if set, otherwise falls back to the transaction's own month.
func billMonth(t *models.Transaction) string {
	if t.CreditCardBillMonth != nil && *t.CreditCardBillMonth != "" {
		return *t.CreditCardBillMonth
	}
	return t.Date.Time.Format("2006-01")
}

// PayCreditCardBill creates a bill payment transfer transaction for a credit card account.
// The payment reduces the credit card's balance (debt) and reduces the checking account's balance.
func (s *LedgerService) PayCreditCardBill(creditCardAccountName string, req *models.PayBillRequest) (*models.Transaction, error) {
	if req.FromAccount == "" {
		return nil, errors.New("from_account is required")
	}
	if req.Amount <= 0 {
		return nil, errors.New("amount must be greater than 0")
	}
	if req.BillMonth == "" {
		return nil, errors.New("bill_month is required")
	}

	// Verify credit card account exists
	ccAccount, err := s.storage.GetAccountByName(creditCardAccountName)
	if err != nil {
		return nil, err
	}
	if ccAccount == nil {
		return nil, errors.New("credit card account not found")
	}

	// Verify source account exists
	fromAccount, err := s.storage.GetAccountByName(req.FromAccount)
	if err != nil {
		return nil, err
	}
	if fromAccount == nil {
		return nil, errors.New("from_account not found: " + req.FromAccount)
	}

	description := req.Description
	if description == "" {
		description = fmt.Sprintf("Credit card payment - %s", req.BillMonth)
	}

	paid := true
	t := &models.Transaction{
		Type:                models.TransactionTypeTransfer,
		Date:                models.Date{Time: time.Now()},
		Amount:              req.Amount,
		Description:         description,
		FromAccount:         &req.FromAccount,
		ToAccount:           &creditCardAccountName,
		Paid:                &paid,
		CreditCardBillMonth: &req.BillMonth,
	}

	saved, err := s.saveSingleTransaction(t)
	if err != nil {
		return nil, err
	}
	return saved, nil
}
