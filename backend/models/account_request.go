package models

// AccountCreateRequest holds the fields for creating a new Account.
type AccountCreateRequest struct {
	Name           string   `json:"name"`
	InitialBalance float64  `json:"initial_balance"`
	Currency       string   `json:"currency"`
	ImageURL       string   `json:"image_url"`
	GradientStart  string   `json:"gradient_start"`
	GradientEnd    string   `json:"gradient_end"`
	Type           string   `json:"type"`         // "checking" | "credit_card"
	CreditLimit    *float64 `json:"credit_limit"` // optional, for credit_card accounts
}

// AccountUpdateRequest holds the optional fields that can be updated on an Account.
// Pointer fields allow distinguishing "not provided" from zero/false values.
type AccountUpdateRequest struct {
	Name           *string  `json:"name"`
	Currency       *string  `json:"currency"`
	InitialBalance *float64 `json:"initial_balance"`
	Archived       *bool    `json:"archived"`
	IsMain         *bool    `json:"is_main,omitempty"`
	ImageURL       *string  `json:"image_url"`
	GradientStart  *string  `json:"gradient_start"`
	GradientEnd    *string  `json:"gradient_end"`
	// Type is the account type: "checking" or "credit_card"
	Type           *string  `json:"type"`
	// CreditLimit is only applicable for credit_card accounts
	CreditLimit    *float64 `json:"credit_limit"`
}
