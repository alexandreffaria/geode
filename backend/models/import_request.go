package models

// CsvTransactionRow represents one parsed row from the uploaded CSV
type CsvTransactionRow struct {
	Date        string `json:"date"`        // YYYY-MM-DD
	Description string `json:"description"`
	Amount      string `json:"amount"`      // positive number, e.g. "42.50"
	Type        string `json:"type"`        // "purchase", "earning", or "transfer"
	Category    string `json:"category"`    // category name (matched case-insensitively); required for purchase/earning
	Account     string `json:"account"`     // account name (matched case-insensitively); required for purchase/earning
	FromAccount string `json:"from_account"` // required for transfer
	ToAccount   string `json:"to_account"`   // required for transfer
	Notes       string `json:"notes"`       // optional
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
