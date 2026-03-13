package main

import (
	"context"
	"encoding/csv"
	"fmt"
	"os"
	"strconv"
	"time"
)

type App struct {
	ctx context.Context
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	os.MkdirAll("vault", os.ModePerm)
}

type Transaction struct {
	ID          string  `json:"id"`
	Date        string  `json:"date"`
	Source      string  `json:"source"`
	Destination string  `json:"destination"`
	Amount      float64 `json:"amount"`
	Currency    string  `json:"currency"`
	Description string  `json:"description"`
	Status      string  `json:"status"`
	Tags        string  `json:"tags"`
}

// AddTransaction appends a new record to the master CSV
func (a *App) AddTransaction(tx Transaction) bool {
	dbPath := "vault/geode.csv"

	// 1. Auto-generate missing fields
	if tx.ID == "" {
		// Create a unique ID using the current timestamp
		tx.ID = fmt.Sprintf("tx_%d", time.Now().UnixNano())
	}
	if tx.Status == "" {
		tx.Status = "cleared"
	}
	if tx.Currency == "" {
		tx.Currency = "BRL"
	}

	// 2. Open file in APPEND mode
	file, err := os.OpenFile(dbPath, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		fmt.Println("Error opening geode.csv for writing:", err)
		return false
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// 3. Format and write the row
	row := []string{
		tx.ID,
		tx.Date,
		tx.Source,
		tx.Destination,
		fmt.Sprintf("%.2f", tx.Amount),
		tx.Currency,
		tx.Description,
		tx.Status,
		tx.Tags,
	}

	if err := writer.Write(row); err != nil {
		fmt.Println("Error writing transaction:", err)
		return false
	}

	return true
}

func (a *App) GetTransactions() []Transaction {
	file, err := os.Open("vault/geode.csv")
	if err != nil {
		return []Transaction{}
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		return []Transaction{}
	}

	var transactions []Transaction
	for i, row := range records {
		if i == 0 || len(row) < 9 {
			continue
		}
		amount, _ := strconv.ParseFloat(row[4], 64)
		transactions = append(transactions, Transaction{
			ID:          row[0],
			Date:        row[1],
			Source:      row[2],
			Destination: row[3],
			Amount:      amount,
			Currency:    row[5],
			Description: row[6],
			Status:      row[7],
			Tags:        row[8],
		})
	}
	return transactions
}