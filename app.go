package main

import (
	"context"
	"encoding/csv"
	"fmt"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/extrame/xls"
	"github.com/wailsapp/wails/v2/pkg/runtime"
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

// Added MatchedWith to the struct!
type Transaction struct {
	Account     string  `json:"account"`
	Date        string  `json:"date"`
	Description string  `json:"description"`
	Category    string  `json:"category"`
	Value       float64 `json:"value"`
	Status      string  `json:"status"`
	MatchedWith string  `json:"matchedWith"`
}

func cleanValueString(valStr string) string {
	valStr = strings.TrimSpace(valStr)
	if valStr == "" {
		return "0"
	}
	if strings.Contains(valStr, "T") && strings.HasSuffix(valStr, "Z") {
		t, err := time.Parse(time.RFC3339, valStr)
		if err == nil {
			epoch := time.Date(1899, time.December, 30, 0, 0, 0, 0, time.UTC)
			days := t.Sub(epoch).Hours() / 24.0
			return fmt.Sprintf("%.2f", days)
		}
	}
	if strings.Contains(valStr, ",") && strings.Contains(valStr, ".") {
		valStr = strings.ReplaceAll(valStr, ".", "")
	}
	valStr = strings.ReplaceAll(valStr, ",", ".")
	return valStr
}

func (a *App) ImportFiles() bool {
	selections, err := runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "Select Organizze Exports (Batch)",
		Filters: []runtime.FileFilter{
			{DisplayName: "Spreadsheets", Pattern: "*.xls;*.csv"},
		},
	})
	if err != nil || len(selections) == 0 {
		return false
	}

	// 1. Read existing transactions from geode.csv (if any)
	var allTransactions []*Transaction
	dbPath := "vault/geode.csv"
	
	if file, err := os.Open(dbPath); err == nil {
		reader := csv.NewReader(file)
		records, _ := reader.ReadAll()
		file.Close()
		
		for i, row := range records {
			if i == 0 || len(row) < 5 { continue }
			val, _ := strconv.ParseFloat(row[4], 64)
			matched := ""
			if len(row) >= 7 { matched = row[6] } // Read existing match if present
			
			allTransactions = append(allTransactions, &Transaction{
				Account: row[0], Date: row[1], Description: row[2], 
				Category: row[3], Value: val, Status: row[5], MatchedWith: matched,
			})
		}
	}

	// 2. Parse all newly selected files
	for _, selection := range selections {
		baseName := filepath.Base(selection)
		accountName := strings.Split(baseName, "_")[0]
		ext := strings.ToLower(filepath.Ext(selection))

		var records [][]string

		if ext == ".xls" {
			xlFile, err := xls.Open(selection, "utf-8")
			if err == nil {
				if sheet := xlFile.GetSheet(0); sheet != nil {
					for i := 0; i <= int(sheet.MaxRow); i++ {
						row := sheet.Row(i)
						if row == nil || row.LastCol() < 4 { continue }
						var stringRow []string
						for col := 0; col < 5; col++ {
							stringRow = append(stringRow, row.Col(col))
						}
						records = append(records, stringRow)
					}
				}
			}
		} else {
			file, err := os.Open(selection)
			if err == nil {
				reader := csv.NewReader(file)
				records, _ = reader.ReadAll()
				file.Close()
			}
		}

		// Add new records to our master list
		for i, row := range records {
			if i == 0 || len(row) < 5 { continue }
			valStr := cleanValueString(row[3])
			val, _ := strconv.ParseFloat(valStr, 64)
			
			allTransactions = append(allTransactions, &Transaction{
				Account: accountName, Date: strings.TrimSpace(row[0]),
				Description: strings.TrimSpace(row[1]), Category: strings.TrimSpace(row[2]),
				Value: val, Status: strings.TrimSpace(row[4]), MatchedWith: "",
			})
		}
	}

	// 3. THE SMART RECONCILIATION ENGINE
	// Find all unmatched positive transfers (Forgiving category check)
	var transferIns []*Transaction
	for _, tx := range allTransactions {
		isTransfer := strings.Contains(strings.ToLower(tx.Category), "transfer") || strings.Contains(strings.ToLower(tx.Description), "transfer")
		if isTransfer && tx.Value > 0 && tx.MatchedWith == "" {
			transferIns = append(transferIns, tx)
		}
	}

	// Match negative transfers to positive ones
	for _, txOut := range allTransactions {
		isTransfer := strings.Contains(strings.ToLower(txOut.Category), "transfer") || strings.Contains(strings.ToLower(txOut.Description), "transfer")
		if isTransfer && txOut.Value < 0 && txOut.MatchedWith == "" {
			
			for _, txIn := range transferIns {
				// Skip if already matched or same account
				if txIn.MatchedWith != "" || txIn.Account == txOut.Account {
					continue
				}

				// A. VALUE CHECK: Safe Floating Point Comparison (within 1 cent)
				valDiff := math.Abs(math.Abs(txIn.Value) - math.Abs(txOut.Value))
				if valDiff > 0.01 {
					continue // Values don't match, skip to next
				}

				// B. DATE CHECK: Allow up to 3 days difference (for weekends/holidays)
				dateIn, errIn := time.Parse("02.01.2006", txIn.Date)
				dateOut, errOut := time.Parse("02.01.2006", txOut.Date)
				
				isDateMatch := false
				if errIn == nil && errOut == nil {
					// Compare the difference in days
					daysDiff := math.Abs(dateIn.Sub(dateOut).Hours() / 24.0)
					if daysDiff <= 3 {
						isDateMatch = true
					}
				} else if txIn.Date == txOut.Date {
					// Fallback if parsing fails for some reason
					isDateMatch = true
				}

				// WE HAVE A MATCH!
				if isDateMatch {
					txOut.MatchedWith = txIn.Account
					txIn.MatchedWith = txOut.Account
					break // Stop searching for this txOut
				}
			}
		}
	}

	// 4. Rewrite the entire geode.csv with the new 7-column schema
	dbFile, err := os.OpenFile(dbPath, os.O_TRUNC|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		fmt.Println("Error writing geode.csv:", err)
		return false
	}
	defer dbFile.Close()

	writer := csv.NewWriter(dbFile)
	defer writer.Flush()

	// Write 7-column header
	writer.Write([]string{"Account", "Date", "Description", "Category", "Value", "Status", "Matched_Account"})

	for _, tx := range allTransactions {
		writer.Write([]string{
			tx.Account, tx.Date, tx.Description, tx.Category, 
			fmt.Sprintf("%.2f", tx.Value), tx.Status, tx.MatchedWith,
		})
	}

	return true
}

func (a *App) GetTransactions() []Transaction {
	file, err := os.Open("vault/geode.csv")
	if err != nil { return []Transaction{} }
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil { return []Transaction{} }

	var transactions []Transaction
	for i, row := range records {
		if i == 0 || len(row) < 5 { continue }
		val, _ := strconv.ParseFloat(row[4], 64)
		
		matched := ""
		if len(row) >= 7 { matched = row[6] }

		transactions = append(transactions, Transaction{
			Account: row[0], Date: row[1], Description: row[2],
			Category: row[3], Value: val, Status: row[5], MatchedWith: matched,
		})
	}
	
	// Sort newest first before sending to Svelte
	// (A simple bubble/insertion sort based on our DD.MM.YYYY strings is tricky, 
	// Svelte can still handle the sorting perfectly, but Go does the matching!)
	return transactions
}