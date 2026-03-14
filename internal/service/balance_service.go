package service

import (
	"geode/internal/domain"
	"geode/internal/storage"
)

// BalanceService handles business logic for balance calculations
type BalanceService struct {
	repo storage.Repository
}

// NewBalanceService creates a new balance service
func NewBalanceService(repo storage.Repository) *BalanceService {
	return &BalanceService{
		repo: repo,
	}
}

// CalculateBalances calculates balances for all accounts
func (s *BalanceService) CalculateBalances() (*domain.BalanceSheet, error) {
	transactions, err := s.repo.GetAll()
	if err != nil {
		return nil, err
	}

	balanceSheet := domain.NewBalanceSheet()

	// Process each transaction
	for _, tx := range transactions {
		if err := balanceSheet.ProcessTransaction(tx); err != nil {
			// Log error but continue processing
			continue
		}
	}

	return balanceSheet, nil
}

// GetAccountBalance calculates the balance for a specific account
func (s *BalanceService) GetAccountBalance(accountPath, currency string) (float64, error) {
	balanceSheet, err := s.CalculateBalances()
	if err != nil {
		return 0, err
	}

	return balanceSheet.GetAccountBalance(accountPath, currency), nil
}

// GetAllBalances returns all account balances
func (s *BalanceService) GetAllBalances() ([]domain.Balance, error) {
	balanceSheet, err := s.CalculateBalances()
	if err != nil {
		return nil, err
	}

	return balanceSheet.GetAllBalances(), nil
}

// GetBalancesByCategory returns balances grouped by account category
func (s *BalanceService) GetBalancesByCategory() (map[string][]domain.Balance, error) {
	balanceSheet, err := s.CalculateBalances()
	if err != nil {
		return nil, err
	}

	categoryBalances := make(map[string][]domain.Balance)

	for _, accountBalance := range balanceSheet.Accounts {
		category := accountBalance.Account.Category
		balances := accountBalance.GetAllBalances()
		categoryBalances[category] = append(categoryBalances[category], balances...)
	}

	return categoryBalances, nil
}

// GetNetWorth calculates net worth (Assets - Liabilities)
func (s *BalanceService) GetNetWorth(currency string) (float64, error) {
	balanceSheet, err := s.CalculateBalances()
	if err != nil {
		return 0, err
	}

	var netWorth float64

	for _, accountBalance := range balanceSheet.Accounts {
		balance := accountBalance.GetBalance(currency)

		if accountBalance.Account.IsAsset() {
			netWorth += balance
		} else if accountBalance.Account.IsLiability() {
			netWorth -= balance
		}
	}

	return netWorth, nil
}
