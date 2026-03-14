package domain

import (
	"sort"
)

// Balance represents the balance of an account
type Balance struct {
	AccountPath string
	Amount      float64
	Currency    string
}

// AccountBalance represents a collection of balances for an account
type AccountBalance struct {
	Account  *Account
	Balances map[string]float64 // Currency -> Amount
}

// NewAccountBalance creates a new account balance
func NewAccountBalance(account *Account) *AccountBalance {
	return &AccountBalance{
		Account:  account,
		Balances: make(map[string]float64),
	}
}

// AddAmount adds an amount to the balance for a specific currency
func (ab *AccountBalance) AddAmount(currency string, amount float64) {
	ab.Balances[currency] += amount
}

// SubtractAmount subtracts an amount from the balance for a specific currency
func (ab *AccountBalance) SubtractAmount(currency string, amount float64) {
	ab.Balances[currency] -= amount
}

// GetBalance returns the balance for a specific currency
func (ab *AccountBalance) GetBalance(currency string) float64 {
	return ab.Balances[currency]
}

// GetAllBalances returns all balances as a slice
func (ab *AccountBalance) GetAllBalances() []Balance {
	var balances []Balance
	for currency, amount := range ab.Balances {
		balances = append(balances, Balance{
			AccountPath: ab.Account.Path,
			Amount:      amount,
			Currency:    currency,
		})
	}

	// Sort by currency for consistent output
	sort.Slice(balances, func(i, j int) bool {
		return balances[i].Currency < balances[j].Currency
	})

	return balances
}

// BalanceSheet represents a collection of account balances
type BalanceSheet struct {
	Accounts map[string]*AccountBalance // AccountPath -> AccountBalance
}

// NewBalanceSheet creates a new balance sheet
func NewBalanceSheet() *BalanceSheet {
	return &BalanceSheet{
		Accounts: make(map[string]*AccountBalance),
	}
}

// GetOrCreateAccount gets or creates an account balance
func (bs *BalanceSheet) GetOrCreateAccount(accountPath string) (*AccountBalance, error) {
	if ab, exists := bs.Accounts[accountPath]; exists {
		return ab, nil
	}

	account, err := NewAccount(accountPath)
	if err != nil {
		return nil, err
	}

	ab := NewAccountBalance(account)
	bs.Accounts[accountPath] = ab
	return ab, nil
}

// ProcessTransaction processes a transaction and updates balances
func (bs *BalanceSheet) ProcessTransaction(tx *Transaction) error {
	// Get or create source account
	sourceAccount, err := bs.GetOrCreateAccount(tx.Source)
	if err != nil {
		return err
	}

	// Get or create destination account
	destAccount, err := bs.GetOrCreateAccount(tx.Destination)
	if err != nil {
		return err
	}

	// Update balances
	sourceAccount.SubtractAmount(tx.Currency, tx.Amount)
	destAccount.AddAmount(tx.Currency, tx.Amount)

	return nil
}

// GetAccountBalance returns the balance for a specific account and currency
func (bs *BalanceSheet) GetAccountBalance(accountPath, currency string) float64 {
	if ab, exists := bs.Accounts[accountPath]; exists {
		return ab.GetBalance(currency)
	}
	return 0
}

// GetAllBalances returns all balances as a slice
func (bs *BalanceSheet) GetAllBalances() []Balance {
	var allBalances []Balance

	// Get all account paths and sort them
	var accountPaths []string
	for path := range bs.Accounts {
		accountPaths = append(accountPaths, path)
	}
	sort.Strings(accountPaths)

	// Collect balances in sorted order
	for _, path := range accountPaths {
		ab := bs.Accounts[path]
		allBalances = append(allBalances, ab.GetAllBalances()...)
	}

	return allBalances
}
