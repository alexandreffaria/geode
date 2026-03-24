package models

import (
	"errors"
	"time"
)

// TransactionType represents the type of transaction
type TransactionType string

const (
	TransactionTypePurchase TransactionType = "purchase"
	TransactionTypeEarning  TransactionType = "earning"
	TransactionTypeTransfer TransactionType = "transfer"
)

// Transaction represents a financial transaction
type Transaction struct {
	ID          string          `json:"id"`
	Date        time.Time       `json:"date"`
	Type        TransactionType `json:"type"`
	Amount      float64         `json:"amount"`
	FromAccount string          `json:"from_account"`
	ToAccount   string          `json:"to_account"`
	Description string          `json:"description"`
}

// Validate checks if the transaction is valid
func (t *Transaction) Validate() error {
	if t.Amount <= 0 {
		return errors.New("amount must be greater than 0")
	}

	switch t.Type {
	case TransactionTypePurchase:
		if t.FromAccount == "" {
			return errors.New("from_account is required for purchase transactions")
		}
	case TransactionTypeEarning:
		if t.ToAccount == "" {
			return errors.New("to_account is required for earning transactions")
		}
	case TransactionTypeTransfer:
		if t.FromAccount == "" || t.ToAccount == "" {
			return errors.New("both from_account and to_account are required for transfer transactions")
		}
		if t.FromAccount == t.ToAccount {
			return errors.New("from_account and to_account cannot be the same for transfers")
		}
	default:
		return errors.New("invalid transaction type: must be purchase, earning, or transfer")
	}

	return nil
}

// GetAffectedAccounts returns the accounts affected by this transaction
func (t *Transaction) GetAffectedAccounts() []string {
	accounts := []string{}
	if t.FromAccount != "" {
		accounts = append(accounts, t.FromAccount)
	}
	if t.ToAccount != "" {
		accounts = append(accounts, t.ToAccount)
	}
	return accounts
}
