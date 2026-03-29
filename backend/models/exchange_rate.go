package models

// ExchangeRate holds the exchange rates for a given date relative to a base currency.
type ExchangeRate struct {
	Date  string             `json:"date"`  // "YYYY-MM-DD"
	Base  string             `json:"base"`  // e.g. "BRL"
	Rates map[string]float64 `json:"rates"` // e.g. {"USD": 0.18, "EUR": 0.17}
}
