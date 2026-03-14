package service

import (
	"sort"
	"strings"

	"geode/internal/domain"
	"geode/internal/storage"
)

// AccountService handles business logic for accounts
type AccountService struct {
	repo storage.Repository
}

// NewAccountService creates a new account service
func NewAccountService(repo storage.Repository) *AccountService {
	return &AccountService{
		repo: repo,
	}
}

// GetAllAccounts retrieves all unique account paths from transactions
func (s *AccountService) GetAllAccounts() ([]string, error) {
	transactions, err := s.repo.GetAll()
	if err != nil {
		return nil, err
	}

	// Use a map to collect unique account paths
	accountMap := make(map[string]bool)
	for _, tx := range transactions {
		accountMap[tx.Source] = true
		accountMap[tx.Destination] = true
	}

	// Convert to sorted slice
	var accounts []string
	for account := range accountMap {
		accounts = append(accounts, account)
	}
	sort.Strings(accounts)

	return accounts, nil
}

// GetAccountsByCategory retrieves all accounts in a specific category
func (s *AccountService) GetAccountsByCategory(category string) ([]string, error) {
	allAccounts, err := s.GetAllAccounts()
	if err != nil {
		return nil, err
	}

	var filtered []string
	for _, account := range allAccounts {
		if strings.HasPrefix(account, category+":") {
			filtered = append(filtered, account)
		}
	}

	return filtered, nil
}

// GetAccountHierarchy returns accounts organized by hierarchy
func (s *AccountService) GetAccountHierarchy() (map[string][]string, error) {
	allAccounts, err := s.GetAllAccounts()
	if err != nil {
		return nil, err
	}

	hierarchy := make(map[string][]string)
	for _, accountPath := range allAccounts {
		account, err := domain.NewAccount(accountPath)
		if err != nil {
			continue // Skip invalid accounts
		}

		category := account.Category
		hierarchy[category] = append(hierarchy[category], accountPath)
	}

	// Sort accounts within each category
	for category := range hierarchy {
		sort.Strings(hierarchy[category])
	}

	return hierarchy, nil
}

// ValidateAccount validates an account path
func (s *AccountService) ValidateAccount(accountPath string) error {
	_, err := domain.NewAccount(accountPath)
	return err
}

// GetAccountTransactions retrieves all transactions for a specific account
func (s *AccountService) GetAccountTransactions(accountPath string) ([]*domain.Transaction, error) {
	// Validate account path
	if err := s.ValidateAccount(accountPath); err != nil {
		return nil, err
	}

	// Get all transactions
	allTransactions, err := s.repo.GetAll()
	if err != nil {
		return nil, err
	}

	// Filter transactions for this account
	var accountTransactions []*domain.Transaction
	for _, tx := range allTransactions {
		if tx.Source == accountPath || tx.Destination == accountPath {
			accountTransactions = append(accountTransactions, tx)
		}
	}

	return accountTransactions, nil
}
