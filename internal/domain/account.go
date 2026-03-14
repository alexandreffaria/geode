package domain

import (
	"strings"

	"geode/internal/errors"
)

// Account represents a financial account in the system
type Account struct {
	Path     string   // Full path like "Assets:Liquid:PagBank"
	Category string   // Top-level category like "Assets"
	Parts    []string // All parts of the path
}

// NewAccount creates a new account from a path string
func NewAccount(path string) (*Account, error) {
	if err := ValidateAccountPath(path); err != nil {
		return nil, err
	}

	parts := strings.Split(path, ":")
	category := parts[0]

	return &Account{
		Path:     path,
		Category: category,
		Parts:    parts,
	}, nil
}

// ValidateAccountPath validates an account path
func ValidateAccountPath(path string) error {
	if path == "" {
		return errors.NewValidationError("account_path", "account path cannot be empty")
	}

	parts := strings.Split(path, ":")
	if len(parts) < 2 {
		return errors.NewValidationError("account_path", "account path must have at least 2 parts (e.g., Assets:Cash)")
	}

	// Each part should not be empty
	for i, part := range parts {
		if strings.TrimSpace(part) == "" {
			return errors.NewValidationError("account_path", "account path parts cannot be empty")
		}

		// First part should be a valid category
		if i == 0 && !isValidCategory(part) {
			return errors.NewValidationError("account_path", "account must start with a valid category (Assets, Liabilities, Equity, Income, Expenses)")
		}
	}

	return nil
}

// IsAsset returns true if the account is an asset account
func (a *Account) IsAsset() bool {
	return a.Category == "Assets"
}

// IsLiability returns true if the account is a liability account
func (a *Account) IsLiability() bool {
	return a.Category == "Liabilities"
}

// IsEquity returns true if the account is an equity account
func (a *Account) IsEquity() bool {
	return a.Category == "Equity"
}

// IsIncome returns true if the account is an income account
func (a *Account) IsIncome() bool {
	return a.Category == "Income"
}

// IsExpense returns true if the account is an expense account
func (a *Account) IsExpense() bool {
	return a.Category == "Expenses"
}

// GetParentPath returns the parent account path, or empty string if at root
func (a *Account) GetParentPath() string {
	if len(a.Parts) <= 1 {
		return ""
	}
	return strings.Join(a.Parts[:len(a.Parts)-1], ":")
}

// GetName returns the account name (last part of the path)
func (a *Account) GetName() string {
	if len(a.Parts) == 0 {
		return ""
	}
	return a.Parts[len(a.Parts)-1]
}

// Helper functions

func isValidCategory(category string) bool {
	validCategories := map[string]bool{
		"Assets":      true,
		"Liabilities": true,
		"Equity":      true,
		"Income":      true,
		"Expenses":    true,
	}
	return validCategories[category]
}
