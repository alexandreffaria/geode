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
}
