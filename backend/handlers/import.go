package handlers

import (
	"encoding/csv"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/meulindo/geode/backend/models"
)

// ImportTransactions handles POST /api/transactions/import.
// It is a method on TransactionHandler so it can access the ledger service
// via the same pattern used by all other transaction handlers.
func (h *TransactionHandler) ImportTransactions(w http.ResponseWriter, r *http.Request) {
	// 1. Parse multipart form (10 MB limit)
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		WriteError(w, http.StatusBadRequest, "Failed to parse multipart form: "+err.Error())
		return
	}

	// 2. Get the uploaded file from the "file" field
	file, _, err := r.FormFile("file")
	if err != nil {
		WriteError(w, http.StatusBadRequest, "No file provided (expected form field named 'file')")
		return
	}
	defer file.Close()

	// 3. Parse CSV rows from the file
	csvRows, err := parseImportCSV(file)
	if err != nil {
		WriteError(w, http.StatusBadRequest, err.Error())
		return
	}

	if len(csvRows) == 0 {
		WriteError(w, http.StatusBadRequest, "CSV file contains no data rows")
		return
	}

	// 4. Pre-load accounts and categories for name-based lookup
	accounts, err := h.ledger.GetAllAccounts()
	if err != nil {
		log.Printf("Error loading accounts for import: %v", err)
		WriteError(w, http.StatusInternalServerError, "Failed to load accounts")
		return
	}

	categories, err := h.ledger.GetAllCategories()
	if err != nil {
		log.Printf("Error loading categories for import: %v", err)
		WriteError(w, http.StatusInternalServerError, "Failed to load categories")
		return
	}

	// Build case-insensitive lookup maps: lowercase name → entity
	accountMap := make(map[string]*models.Account, len(accounts))
	for _, a := range accounts {
		accountMap[strings.ToLower(a.Name)] = a
	}

	categoryMap := make(map[string]*models.Category, len(categories))
	for _, c := range categories {
		categoryMap[strings.ToLower(c.Name)] = c
	}

	// 5. Process each row
	result := models.ImportResult{
		Total: len(csvRows),
		Rows:  make([]models.ImportRowResult, 0, len(csvRows)),
	}

	for i, row := range csvRows {
		rowNum := i + 2 // 1-based row number; +1 for header, +1 for 1-based index

		tx, validationErr := buildTransaction(row, accountMap, categoryMap)
		if validationErr != nil {
			result.Failed++
			result.Rows = append(result.Rows, models.ImportRowResult{
				Row:     rowNum,
				Success: false,
				Error:   validationErr.Error(),
			})
			continue
		}

		created, createErr := h.ledger.CreateTransaction(tx)
		if createErr != nil {
			log.Printf("Import row %d: failed to create transaction: %v", rowNum, createErr)
			result.Failed++
			result.Rows = append(result.Rows, models.ImportRowResult{
				Row:     rowNum,
				Success: false,
				Error:   createErr.Error(),
			})
			continue
		}

		result.Imported++
		result.Rows = append(result.Rows, models.ImportRowResult{
			Row:     rowNum,
			Success: true,
			ID:      created[0].ID,
		})
	}

	log.Printf("CSV import complete: %d total, %d imported, %d failed", result.Total, result.Imported, result.Failed)
	WriteJSON(w, http.StatusOK, result)
}

// parseImportCSV reads all data rows from a CSV reader.
// The first row is treated as the header and skipped.
// Returns a slice of CsvTransactionRow (one per data row).
func parseImportCSV(r io.Reader) ([]models.CsvTransactionRow, error) {
	reader := csv.NewReader(r)
	reader.TrimLeadingSpace = true
	reader.FieldsPerRecord = -1 // allow variable number of fields

	// Read header row
	headers, err := reader.Read()
	if err != nil {
		if err == io.EOF {
			return nil, fmt.Errorf("CSV file is empty")
		}
		return nil, fmt.Errorf("failed to read CSV header: %w", err)
	}

	// Build a column-index map from normalized header names
	colIndex := make(map[string]int, len(headers))
	for i, h := range headers {
		colIndex[strings.ToLower(strings.TrimSpace(h))] = i
	}

	// Validate that the minimum required columns are present
	for _, required := range []string{"date", "amount", "type"} {
		if _, ok := colIndex[required]; !ok {
			return nil, fmt.Errorf("missing required CSV column: %q", required)
		}
	}

	// Helper: safely get a column value by name (returns "" if column absent or index out of range)
	getCol := func(record []string, name string) string {
		idx, ok := colIndex[name]
		if !ok || idx >= len(record) {
			return ""
		}
		return strings.TrimSpace(record[idx])
	}

	var rows []models.CsvTransactionRow
	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("error reading CSV row %d: %w", len(rows)+2, err)
		}

		// Skip entirely blank rows
		allEmpty := true
		for _, field := range record {
			if strings.TrimSpace(field) != "" {
				allEmpty = false
				break
			}
		}
		if allEmpty {
			continue
		}

		rows = append(rows, models.CsvTransactionRow{
			Date:        getCol(record, "date"),
			Description: getCol(record, "description"),
			Amount:      getCol(record, "amount"),
			Type:        getCol(record, "type"),
			Category:    getCol(record, "category"),
			Account:     getCol(record, "account"),
			FromAccount: getCol(record, "from_account"),
			ToAccount:   getCol(record, "to_account"),
			Notes:       getCol(record, "notes"),
		})
	}

	return rows, nil
}

// buildTransaction validates a CsvTransactionRow and constructs a models.Transaction.
// Returns an error if any validation rule fails or a required account/category is not found.
func buildTransaction(
	row models.CsvTransactionRow,
	accountMap map[string]*models.Account,
	categoryMap map[string]*models.Category,
) (*models.Transaction, error) {
	// --- Validate date ---
	parsedDate, err := time.Parse("2006-01-02", row.Date)
	if err != nil {
		return nil, fmt.Errorf("invalid date %q: expected YYYY-MM-DD format", row.Date)
	}

	// --- Validate amount ---
	if row.Amount == "" {
		return nil, fmt.Errorf("amount is required")
	}
	amount, err := strconv.ParseFloat(row.Amount, 64)
	if err != nil {
		return nil, fmt.Errorf("invalid amount %q: must be a number", row.Amount)
	}
	if amount <= 0 {
		return nil, fmt.Errorf("amount must be greater than 0 (got %s)", row.Amount)
	}

	// --- Validate type ---
	txType := models.TransactionType(strings.ToLower(strings.TrimSpace(row.Type)))
	switch txType {
	case models.TransactionTypePurchase, models.TransactionTypeEarning, models.TransactionTypeTransfer:
		// valid
	default:
		return nil, fmt.Errorf("invalid type %q: must be purchase, earning, or transfer", row.Type)
	}

	// --- Build description (merge notes if present) ---
	description := strings.TrimSpace(row.Description)
	notes := strings.TrimSpace(row.Notes)
	if description == "" && notes != "" {
		description = notes
	} else if description != "" && notes != "" {
		description = description + " (" + notes + ")"
	}

	// --- Build the transaction skeleton ---
	tx := &models.Transaction{
		ID:          uuid.New().String(),
		Date:        models.Date{Time: parsedDate.UTC()},
		Type:        txType,
		Amount:      amount,
		Description: description,
	}

	// --- Type-specific field validation and lookup ---
	switch txType {
	case models.TransactionTypePurchase, models.TransactionTypeEarning:
		// account is required
		if row.Account == "" {
			return nil, fmt.Errorf("account is required for %s transactions", txType)
		}
		acct, ok := accountMap[strings.ToLower(row.Account)]
		if !ok {
			return nil, fmt.Errorf("account %q not found", row.Account)
		}
		tx.Account = &acct.Name

		// category is required
		if row.Category == "" {
			return nil, fmt.Errorf("category is required for %s transactions", txType)
		}
		cat, ok := categoryMap[strings.ToLower(row.Category)]
		if !ok {
			return nil, fmt.Errorf("category %q not found", row.Category)
		}
		tx.Category = &cat.Name

	case models.TransactionTypeTransfer:
		// from_account is required
		if row.FromAccount == "" {
			return nil, fmt.Errorf("from_account is required for transfer transactions")
		}
		fromAcct, ok := accountMap[strings.ToLower(row.FromAccount)]
		if !ok {
			return nil, fmt.Errorf("from_account %q not found", row.FromAccount)
		}
		tx.FromAccount = &fromAcct.Name

		// to_account is required
		if row.ToAccount == "" {
			return nil, fmt.Errorf("to_account is required for transfer transactions")
		}
		toAcct, ok := accountMap[strings.ToLower(row.ToAccount)]
		if !ok {
			return nil, fmt.Errorf("to_account %q not found", row.ToAccount)
		}
		tx.ToAccount = &toAcct.Name

		if strings.EqualFold(row.FromAccount, row.ToAccount) {
			return nil, fmt.Errorf("from_account and to_account cannot be the same for transfers")
		}
	}

	return tx, nil
}
