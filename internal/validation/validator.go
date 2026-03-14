package validation

import (
	"regexp"
	"strings"
	"time"

	"geode/internal/errors"
)

// DateFormat is the expected date format for transactions
const DateFormat = "2006-01-02"

// ValidateDate validates a date string
func ValidateDate(date string) error {
	if date == "" {
		return errors.NewValidationError("date", "date is required")
	}

	// Check format
	t, err := time.Parse(DateFormat, date)
	if err != nil {
		return errors.WrapValidationError("date", "date must be in YYYY-MM-DD format", err)
	}

	// Check if date is in the future
	if t.After(time.Now()) {
		return errors.NewValidationError("date", "date cannot be in the future")
	}

	return nil
}

// ValidateAmount validates a transaction amount
func ValidateAmount(amount float64) error {
	if amount <= 0 {
		return errors.NewValidationError("amount", "amount must be greater than zero")
	}

	// Check for reasonable maximum (e.g., 1 billion)
	if amount > 1000000000 {
		return errors.NewValidationError("amount", "amount exceeds maximum allowed value")
	}

	return nil
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

	// Each part should not be empty and should contain only valid characters
	for i, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed == "" {
			return errors.NewValidationError("account_path", "account path parts cannot be empty")
		}

		// Validate characters (alphanumeric, spaces, hyphens, underscores)
		if !isValidAccountName(trimmed) {
			return errors.NewValidationError("account_path", "account path parts can only contain letters, numbers, spaces, hyphens, and underscores")
		}

		// First part should be a valid category
		if i == 0 && !isValidCategory(trimmed) {
			return errors.NewValidationError("account_path", "account must start with a valid category (Assets, Liabilities, Equity, Income, Expenses)")
		}
	}

	return nil
}

// ValidateCurrency validates a currency code
func ValidateCurrency(currency string) error {
	if currency == "" {
		return errors.NewValidationError("currency", "currency is required")
	}

	if len(currency) != 3 {
		return errors.NewValidationError("currency", "currency must be a 3-letter code (e.g., BRL, USD)")
	}

	// Check if it's all uppercase letters
	if !regexp.MustCompile(`^[A-Z]{3}$`).MatchString(currency) {
		return errors.NewValidationError("currency", "currency must be 3 uppercase letters")
	}

	return nil
}

// ValidateStatus validates a transaction status
func ValidateStatus(status string) error {
	if status == "" {
		return nil // Status is optional, will be set to default
	}

	validStatuses := map[string]bool{
		"cleared":    true,
		"pending":    true,
		"reconciled": true,
	}

	if !validStatuses[status] {
		return errors.NewValidationError("status", "status must be one of: cleared, pending, reconciled")
	}

	return nil
}

// ValidateID validates a transaction ID
func ValidateID(id string) error {
	if id == "" {
		return errors.NewValidationError("id", "ID cannot be empty")
	}

	// ID should start with "tx_"
	if !strings.HasPrefix(id, "tx_") {
		return errors.NewValidationError("id", "ID must start with 'tx_'")
	}

	return nil
}

// SanitizeString removes potentially harmful characters from a string
func SanitizeString(s string) string {
	// Remove leading/trailing whitespace
	s = strings.TrimSpace(s)

	// Remove any null bytes
	s = strings.ReplaceAll(s, "\x00", "")

	// Remove any CSV-breaking characters (newlines, carriage returns)
	s = strings.ReplaceAll(s, "\n", " ")
	s = strings.ReplaceAll(s, "\r", " ")

	return s
}

// SanitizeTags sanitizes and normalizes tags
func SanitizeTags(tags string) string {
	if tags == "" {
		return ""
	}

	// Split by comma, trim each tag, and rejoin
	parts := strings.Split(tags, ",")
	var sanitized []string
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			sanitized = append(sanitized, SanitizeString(trimmed))
		}
	}

	return strings.Join(sanitized, ",")
}

// Helper functions

func isValidAccountName(name string) bool {
	// Allow letters, numbers, spaces, hyphens, underscores, and some special chars
	matched, _ := regexp.MatchString(`^[a-zA-Z0-9\s\-_]+$`, name)
	return matched
}

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
