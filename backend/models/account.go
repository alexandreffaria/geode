package models

import "time"

// Account represents a financial account
type Account struct {
	Name        string    `json:"name"`
	Balance     float64   `json:"balance"`
	CreatedAt   time.Time `json:"created_at"`
	LastUpdated time.Time `json:"last_updated"`
}

// NewAccount creates a new account with the given name
func NewAccount(name string) *Account {
	now := time.Now()
	return &Account{
		Name:        name,
		Balance:     0.0,
		CreatedAt:   now,
		LastUpdated: now,
	}
}

// UpdateBalance updates the account balance and last updated timestamp
func (a *Account) UpdateBalance(amount float64) {
	a.Balance += amount
	a.LastUpdated = time.Now()
}
