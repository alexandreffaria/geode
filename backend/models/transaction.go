package models

import (
	"errors"
	"fmt"
	"strings"
	"time"
)

// Date is a custom type that wraps time.Time to handle date-only format (YYYY-MM-DD)
type Date struct {
	time.Time
}

// UnmarshalJSON parses a date string in YYYY-MM-DD format
func (d *Date) UnmarshalJSON(b []byte) error {
	// Remove quotes from JSON string
	s := strings.Trim(string(b), "\"")
	
	// Handle empty string or null
	if s == "" || s == "null" {
		d.Time = time.Time{}
		return nil
	}
	
	// Parse the date in YYYY-MM-DD format
	t, err := time.Parse("2006-01-02", s)
	if err != nil {
		return fmt.Errorf("invalid date format, expected YYYY-MM-DD: %w", err)
	}
	
	// Set to midnight UTC
	d.Time = t.UTC()
	return nil
}

// MarshalJSON outputs the date in YYYY-MM-DD format
func (d Date) MarshalJSON() ([]byte, error) {
	// Handle zero time
	if d.Time.IsZero() {
		return []byte("null"), nil
	}
	
	// Format as YYYY-MM-DD and wrap in quotes
	return []byte(fmt.Sprintf("\"%s\"", d.Time.Format("2006-01-02"))), nil
}

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
	Date        Date            `json:"date"`
	Type        TransactionType `json:"type"`
	Amount      float64         `json:"amount"`
	Description string          `json:"description"`

	// For purchase/earning transactions
	Account  *string `json:"account,omitempty"`
	Category *string `json:"category,omitempty"`

	// For transfer transactions only
	FromAccount     *string  `json:"from_account,omitempty"`
	ToAccount       *string  `json:"to_account,omitempty"`
	ConvertedAmount *float64 `json:"converted_amount,omitempty"`
	TransferRate    *float64 `json:"transfer_rate,omitempty"`

	// Installment support
	InstallmentTotal   *int    `json:"installment_total,omitempty"`    // total number of installments (e.g. 12)
	InstallmentCurrent *int    `json:"installment_current,omitempty"`  // which installment this is (1-based)
	InstallmentGroupID *string `json:"installment_group_id,omitempty"` // UUID linking all installments together

	// Recurrence support
	RecurrenceMonths  *int    `json:"recurrence_months,omitempty"`   // repeat every N months
	RecurrenceUnit    *string `json:"recurrence_unit,omitempty"`     // "day", "week", or "month" (nil defaults to "month")
	RecurrenceGroupID *string `json:"recurrence_group_id,omitempty"` // UUID linking recurrence instances

	// Credit card support
	// Paid: nil = not applicable (regular transactions), true = paid, false = unpaid/pending.
	// Unpaid transactions (Paid == false) do NOT affect account balances.
	Paid                *bool   `json:"paid,omitempty"`
	// CreditCardBillMonth links a transaction to a specific credit card billing month (format: "YYYY-MM").
	CreditCardBillMonth *string `json:"credit_card_bill_month,omitempty"`

	// Virtual transaction support
	// IsVirtual: true = projected/forecast entry, does NOT affect account balances.
	// Virtual transactions are auto-generated for recurring series (10-year horizon).
	// They are excluded from balance calculations and can be "realized" via POST /api/transactions/:id/realize.
	// nil means "not virtual" (i.e., a real transaction) — backward-compatible with existing records.
	IsVirtual *bool `json:"is_virtual,omitempty"`
}

// Validate checks if the transaction is valid
func (t *Transaction) Validate() error {
	if t.Amount <= 0 {
		return errors.New("amount must be greater than 0")
	}

	// Installment validation
	if t.InstallmentTotal != nil {
		if *t.InstallmentTotal < 2 {
			return errors.New("installment_total must be >= 2")
		}
		if t.InstallmentCurrent != nil {
			if *t.InstallmentCurrent < 1 {
				return errors.New("installment_current must be >= 1")
			}
			if *t.InstallmentCurrent > *t.InstallmentTotal {
				return errors.New("installment_current must be <= installment_total")
			}
		}
	}

	// Recurrence validation
	if t.RecurrenceMonths != nil && *t.RecurrenceMonths < 1 {
		return errors.New("recurrence_months must be >= 1")
	}
	if t.RecurrenceUnit != nil {
		unit := *t.RecurrenceUnit
		if unit != "day" && unit != "week" && unit != "month" {
			return errors.New("recurrence_unit must be \"day\", \"week\", or \"month\"")
		}
	}

	// Installments and recurrence are mutually exclusive
	if t.InstallmentTotal != nil && t.RecurrenceMonths != nil {
		return errors.New("installment and recurrence fields are mutually exclusive")
	}

	switch t.Type {
	case TransactionTypePurchase:
		if t.Account == nil || *t.Account == "" {
			return errors.New("account is required for purchase transactions")
		}
		if t.Category == nil || *t.Category == "" {
			return errors.New("category is required for purchase transactions")
		}
		if t.FromAccount != nil || t.ToAccount != nil {
			return errors.New("purchase transactions cannot have from_account or to_account fields")
		}

	case TransactionTypeEarning:
		if t.Account == nil || *t.Account == "" {
			return errors.New("account is required for earning transactions")
		}
		if t.Category == nil || *t.Category == "" {
			return errors.New("category is required for earning transactions")
		}
		if t.FromAccount != nil || t.ToAccount != nil {
			return errors.New("earning transactions cannot have from_account or to_account fields")
		}

	case TransactionTypeTransfer:
		if t.FromAccount == nil || *t.FromAccount == "" {
			return errors.New("from_account is required for transfer transactions")
		}
		if t.ToAccount == nil || *t.ToAccount == "" {
			return errors.New("to_account is required for transfer transactions")
		}
		if *t.FromAccount == *t.ToAccount {
			return errors.New("from_account and to_account cannot be the same for transfers")
		}
		if t.Account != nil || t.Category != nil {
			return errors.New("transfer transactions cannot have account or category fields")
		}
		if t.ConvertedAmount != nil && *t.ConvertedAmount <= 0 {
			return errors.New("converted_amount must be greater than 0")
		}

	default:
		return errors.New("invalid transaction type: must be purchase, earning, or transfer")
	}

	return nil
}

// GetAffectedAccounts returns the accounts affected by this transaction
func (t *Transaction) GetAffectedAccounts() []string {
	var accounts []string

	switch t.Type {
	case TransactionTypePurchase, TransactionTypeEarning:
		// Only the account field matters, not the category
		if t.Account != nil && *t.Account != "" {
			accounts = append(accounts, *t.Account)
		}
	case TransactionTypeTransfer:
		// Both from and to accounts are affected
		if t.FromAccount != nil && *t.FromAccount != "" {
			accounts = append(accounts, *t.FromAccount)
		}
		if t.ToAccount != nil && *t.ToAccount != "" {
			accounts = append(accounts, *t.ToAccount)
		}
	}

	return accounts
}
