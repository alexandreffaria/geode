package models

// CreditCardBillSummary holds the monthly bill summary for a credit card account.
type CreditCardBillSummary struct {
	Month        string  `json:"month"`         // "YYYY-MM"
	TotalAmount  float64 `json:"total_amount"`  // sum of all purchases for this month
	PaidAmount   float64 `json:"paid_amount"`   // sum of paid bill payments for this month
	UnpaidAmount float64 `json:"unpaid_amount"` // total_amount - paid_amount
	IsFullyPaid  bool    `json:"is_fully_paid"` // true when unpaid_amount <= 0
}

// PayBillRequest holds the parameters for paying a credit card bill.
type PayBillRequest struct {
	FromAccount string  `json:"from_account"`
	Amount      float64 `json:"amount"`
	BillMonth   string  `json:"bill_month"`  // "YYYY-MM"
	Description string  `json:"description"`
}
