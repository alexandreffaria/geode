package domain

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"geode/internal/errors"
)

// Transaction represents a financial transaction in the system
type Transaction struct {
	ID          string  `json:"id"`
	Date        string  `json:"date"`
	Source      string  `json:"source"`
	Destination string  `json:"destination"`
	Amount      float64 `json:"amount"`
	Currency    string  `json:"currency"`
	Description string  `json:"description"`
	Status      string  `json:"status"`
	Tags        string  `json:"tags"`
}

// Validate checks if the transaction has valid data according to business rules
func (t *Transaction) Validate() error {
	// Validate required fields
	if t.Date == "" {
		return errors.NewValidationError("date", "date is required")
	}

	if t.Source == "" {
		return errors.NewValidationError("source", "source account is required")
	}

	if t.Destination == "" {
		return errors.NewValidationError("destination", "destination account is required")
	}

	// Validate amount is positive
	if t.Amount <= 0 {
		return errors.NewValidationError("amount", "amount must be greater than zero")
	}

	// Validate date format (YYYY-MM-DD)
	if !isValidDateFormat(t.Date) {
		return errors.NewValidationError("date", "date must be in YYYY-MM-DD format")
	}

	// Validate date is not in the future
	if isFutureDate(t.Date) {
		return errors.NewValidationError("date", "date cannot be in the future")
	}

	// Validate account paths
	if !isValidAccountPath(t.Source) {
		return errors.NewValidationError("source", "source account must follow the format Category:Subcategory:Account")
	}

	if !isValidAccountPath(t.Destination) {
		return errors.NewValidationError("destination", "destination account must follow the format Category:Subcategory:Account")
	}

	// Validate currency code (3 letters)
	if t.Currency != "" && len(t.Currency) != 3 {
		return errors.NewValidationError("currency", "currency must be a 3-letter code (e.g., BRL, USD)")
	}

	// Validate status
	if t.Status != "" && !isValidStatus(t.Status) {
		return errors.NewValidationError("status", "status must be one of: cleared, pending, reconciled")
	}

	return nil
}

// SetDefaults sets default values for optional fields
func (t *Transaction) SetDefaults() {
	if t.ID == "" {
		t.ID = fmt.Sprintf("tx_%d", time.Now().UnixNano())
	}

	if t.Status == "" {
		t.Status = "cleared"
	}

	if t.Currency == "" {
		t.Currency = "BRL"
	}
}

// ToCSVRow converts the transaction to a CSV row
func (t *Transaction) ToCSVRow() []string {
	return []string{
		t.ID,
		t.Date,
		t.Source,
		t.Destination,
		fmt.Sprintf("%.2f", t.Amount),
		t.Currency,
		t.Description,
		t.Status,
		t.Tags,
	}
}

// FromCSVRow creates a transaction from a CSV row
func FromCSVRow(row []string) (*Transaction, error) {
	if len(row) < 9 {
		return nil, errors.NewValidationError("row", "CSV row must have at least 9 columns")
	}

	amount, err := strconv.ParseFloat(row[4], 64)
	if err != nil {
		return nil, errors.WrapValidationError("amount", "invalid amount format", err)
	}

	return &Transaction{
		ID:          row[0],
		Date:        row[1],
		Source:      row[2],
		Destination: row[3],
		Amount:      amount,
		Currency:    row[5],
		Description: row[6],
		Status:      row[7],
		Tags:        row[8],
	}, nil
}

// Helper functions

func isValidDateFormat(date string) bool {
	_, err := time.Parse("2006-01-02", date)
	return err == nil
}

func isFutureDate(date string) bool {
	t, err := time.Parse("2006-01-02", date)
	if err != nil {
		return false
	}
	return t.After(time.Now())
}

func isValidAccountPath(path string) bool {
	// Account paths should follow the format: Category:Subcategory:Account
	// e.g., Assets:Liquid:PagBank or Expenses:Mercado
	// Minimum 2 parts, separated by colons
	parts := strings.Split(path, ":")
	if len(parts) < 2 {
		return false
	}

	// Each part should not be empty
	for _, part := range parts {
		if strings.TrimSpace(part) == "" {
			return false
		}
	}

	return true
}

func isValidStatus(status string) bool {
	validStatuses := map[string]bool{
		"cleared":    true,
		"pending":    true,
		"reconciled": true,
	}
	return validStatuses[status]
}
