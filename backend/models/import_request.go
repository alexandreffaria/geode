package models

// CsvTransactionRow represents one parsed row from the uploaded CSV
type CsvTransactionRow struct {
	Date        string `json:"date"`        // YYYY-MM-DD
	Description string `json:"description"`
	Amount      string `json:"amount"`      // positive number, e.g. "42.50"
	Type        string `json:"type"`        // "purchase", "earning", or "transfer"
	Category    string `json:"category"`    // category name (matched case-insensitively); required for purchase/earning
	Account     string `json:"account"`     // account name (matched case-insensitively); required for purchase/earning
	AccountType string `json:"account_type"` // "bank_account", "credit_card", or "transfer"
	FromAccount string `json:"from_account"` // required for transfer
	ToAccount   string `json:"to_account"`   // required for transfer
	Notes       string `json:"notes"`        // optional
	Installment string `json:"installment"`  // raw installment string, e.g. "1/3" or ""
	Card        string `json:"card"`         // credit card account name, e.g. "pagbank-wtf" or ""
	Status      string `json:"status"`       // "real" or "virtual"; virtual transactions do not affect balances
}

// ImportRowResult is the per-row result returned to the client
type ImportRowResult struct {
	Row     int    `json:"row"`
	Success bool   `json:"success"`
	Error   string `json:"error,omitempty"`
	ID      string `json:"id,omitempty"`
}

// ImportResult is the full response body for POST /api/transactions/import
type ImportResult struct {
	Total    int               `json:"total"`
	Imported int               `json:"imported"`
	Failed   int               `json:"failed"`
	Rows     []ImportRowResult `json:"rows"`
}
