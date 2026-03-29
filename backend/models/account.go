package models

import (
	"math/rand"
	"time"
)

// Account type constants
const (
	AccountTypeChecking   = "checking"
	AccountTypeCreditCard = "credit_card"
)

// gradientPalette is a set of pleasant color pairs for auto-generated gradients
var gradientPalette = [][2]string{
	{"#4a9eff", "#6bff6b"},
	{"#ff6b6b", "#ffd93d"},
	{"#a855f7", "#ec4899"},
	{"#06b6d4", "#3b82f6"},
	{"#f97316", "#eab308"},
	{"#10b981", "#06b6d4"},
	{"#8b5cf6", "#6366f1"},
	{"#f43f5e", "#fb923c"},
	{"#14b8a6", "#84cc16"},
	{"#6366f1", "#a855f7"},
}

// Account represents a financial account
type Account struct {
	Name           string   `json:"name"`
	Balance        float64  `json:"balance"`
	Currency       string   `json:"currency"`
	InitialBalance float64  `json:"initial_balance"`
	Archived       bool     `json:"archived"`
	IsMain         bool     `json:"is_main"`
	ImageURL       string   `json:"image_url,omitempty"`
	GradientStart  string   `json:"gradient_start"`
	GradientEnd    string   `json:"gradient_end"`
	// Type is the account type: "checking" (default) or "credit_card"
	Type           string   `json:"type"`
	// CreditLimit is only applicable for credit_card accounts
	CreditLimit    *float64 `json:"credit_limit,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	LastUpdated    time.Time `json:"last_updated"`
}

// GetType returns the account type, defaulting to "checking" for backward compatibility.
func (a *Account) GetType() string {
	if a.Type == "" {
		return AccountTypeChecking
	}
	return a.Type
}

// NewAccount creates a new account with the given name and optional initial balance.
// If initialBalance is not provided (nil), it defaults to 0.
// The account type defaults to "checking".
func NewAccount(name string, initialBalance ...float64) *Account {
	now := time.Now()

	var initBal float64
	if len(initialBalance) > 0 {
		initBal = initialBalance[0]
	}

	// Pick a random gradient pair
	pair := gradientPalette[rand.Intn(len(gradientPalette))]

	return &Account{
		Name:           name,
		Balance:        initBal,
		Currency:       "BRL",
		InitialBalance: initBal,
		Archived:       false,
		ImageURL:       "",
		GradientStart:  pair[0],
		GradientEnd:    pair[1],
		Type:           AccountTypeChecking,
		CreatedAt:      now,
		LastUpdated:    now,
	}
}

// UpdateBalance updates the account balance and last updated timestamp
func (a *Account) UpdateBalance(amount float64) {
	a.Balance += amount
	a.LastUpdated = time.Now()
}
