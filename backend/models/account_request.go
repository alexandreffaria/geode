package models

// AccountUpdateRequest holds the optional fields that can be updated on an Account.
// Pointer fields allow distinguishing "not provided" from zero/false values.
type AccountUpdateRequest struct {
	Name           *string  `json:"name"`
	Currency       *string  `json:"currency"`
	InitialBalance *float64 `json:"initialBalance"`
	Archived       *bool    `json:"archived"`
	ImageURL       *string  `json:"imageURL"`
	GradientStart  *string  `json:"gradientStart"`
	GradientEnd    *string  `json:"gradientEnd"`
	// Type is the account type: "checking" or "credit_card"
	Type           *string  `json:"type"`
	// CreditLimit is only applicable for credit_card accounts
	CreditLimit    *float64 `json:"creditLimit"`
}
