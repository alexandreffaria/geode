package storage

import (
	"encoding/csv"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"geode/internal/domain"
	"geode/internal/errors"
)

// CSVRepository implements the Repository interface using CSV file storage
type CSVRepository struct {
	filePath string
	mu       sync.RWMutex
}

// NewCSVRepository creates a new CSV repository
func NewCSVRepository(filePath string) (*CSVRepository, error) {
	// Ensure the directory exists
	dir := filepath.Dir(filePath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, errors.WrapStorageError("initialize", "failed to create storage directory", err)
	}

	// Create file with header if it doesn't exist
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		if err := createCSVWithHeader(filePath); err != nil {
			return nil, err
		}
	}

	return &CSVRepository{
		filePath: filePath,
	}, nil
}

// Create adds a new transaction to the CSV file
func (r *CSVRepository) Create(tx *domain.Transaction) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Validate transaction
	if err := tx.Validate(); err != nil {
		return err
	}

	// Set defaults
	tx.SetDefaults()

	// Open file in append mode
	file, err := os.OpenFile(r.filePath, os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return errors.WrapStorageError("create", "failed to open file", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Write the transaction
	if err := writer.Write(tx.ToCSVRow()); err != nil {
		return errors.WrapStorageError("create", "failed to write transaction", err)
	}

	if err := writer.Error(); err != nil {
		return errors.WrapStorageError("create", "failed to flush writer", err)
	}

	return nil
}

// GetAll retrieves all transactions from the CSV file
func (r *CSVRepository) GetAll() ([]*domain.Transaction, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	file, err := os.Open(r.filePath)
	if err != nil {
		return nil, errors.WrapStorageError("read", "failed to open file", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)

	// Skip header
	if _, err := reader.Read(); err != nil {
		return nil, errors.WrapStorageError("read", "failed to read header", err)
	}

	var transactions []*domain.Transaction
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, errors.WrapStorageError("read", "failed to read row", err)
		}

		tx, err := domain.FromCSVRow(row)
		if err != nil {
			// Log the error but continue reading other transactions
			fmt.Printf("Warning: skipping invalid transaction row: %v\n", err)
			continue
		}

		transactions = append(transactions, tx)
	}

	return transactions, nil
}

// GetByID retrieves a transaction by its ID
func (r *CSVRepository) GetByID(id string) (*domain.Transaction, error) {
	transactions, err := r.GetAll()
	if err != nil {
		return nil, err
	}

	for _, tx := range transactions {
		if tx.ID == id {
			return tx, nil
		}
	}

	return nil, errors.NewNotFoundError("transaction", id)
}

// Update updates an existing transaction
func (r *CSVRepository) Update(tx *domain.Transaction) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Validate transaction
	if err := tx.Validate(); err != nil {
		return err
	}

	// Read all transactions
	transactions, err := r.getAllUnlocked()
	if err != nil {
		return err
	}

	// Find and update the transaction
	found := false
	for i, existing := range transactions {
		if existing.ID == tx.ID {
			transactions[i] = tx
			found = true
			break
		}
	}

	if !found {
		return errors.NewNotFoundError("transaction", tx.ID)
	}

	// Write all transactions back atomically
	return r.writeAllUnlocked(transactions)
}

// Delete removes a transaction by its ID
func (r *CSVRepository) Delete(id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Read all transactions
	transactions, err := r.getAllUnlocked()
	if err != nil {
		return err
	}

	// Find and remove the transaction
	found := false
	var filtered []*domain.Transaction
	for _, tx := range transactions {
		if tx.ID == id {
			found = true
			continue
		}
		filtered = append(filtered, tx)
	}

	if !found {
		return errors.NewNotFoundError("transaction", id)
	}

	// Write remaining transactions back atomically
	return r.writeAllUnlocked(filtered)
}

// Search finds transactions matching the given criteria
func (r *CSVRepository) Search(criteria SearchCriteria) ([]*domain.Transaction, error) {
	transactions, err := r.GetAll()
	if err != nil {
		return nil, err
	}

	var results []*domain.Transaction
	for _, tx := range transactions {
		if matchesCriteria(tx, criteria) {
			results = append(results, tx)
		}
	}

	return results, nil
}

// Backup creates a backup of the CSV file
func (r *CSVRepository) Backup(backupPath string) error {
	r.mu.RLock()
	defer r.mu.RUnlock()

	// Ensure backup directory exists
	dir := filepath.Dir(backupPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return errors.WrapStorageError("backup", "failed to create backup directory", err)
	}

	// Read source file
	source, err := os.Open(r.filePath)
	if err != nil {
		return errors.WrapStorageError("backup", "failed to open source file", err)
	}
	defer source.Close()

	// Create destination file
	dest, err := os.Create(backupPath)
	if err != nil {
		return errors.WrapStorageError("backup", "failed to create backup file", err)
	}
	defer dest.Close()

	// Copy contents
	if _, err := io.Copy(dest, source); err != nil {
		return errors.WrapStorageError("backup", "failed to copy data", err)
	}

	return nil
}

// Restore restores the CSV file from a backup
func (r *CSVRepository) Restore(backupPath string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Read backup file
	source, err := os.Open(backupPath)
	if err != nil {
		return errors.WrapStorageError("restore", "failed to open backup file", err)
	}
	defer source.Close()

	// Create temporary file
	tempPath := r.filePath + ".tmp"
	dest, err := os.Create(tempPath)
	if err != nil {
		return errors.WrapStorageError("restore", "failed to create temporary file", err)
	}
	defer dest.Close()

	// Copy contents
	if _, err := io.Copy(dest, source); err != nil {
		os.Remove(tempPath)
		return errors.WrapStorageError("restore", "failed to copy data", err)
	}

	// Close destination before rename
	dest.Close()

	// Atomically replace the original file
	if err := os.Rename(tempPath, r.filePath); err != nil {
		os.Remove(tempPath)
		return errors.WrapStorageError("restore", "failed to replace original file", err)
	}

	return nil
}

// Private helper methods

// getAllUnlocked reads all transactions without acquiring a lock (caller must hold lock)
func (r *CSVRepository) getAllUnlocked() ([]*domain.Transaction, error) {
	file, err := os.Open(r.filePath)
	if err != nil {
		return nil, errors.WrapStorageError("read", "failed to open file", err)
	}
	defer file.Close()

	reader := csv.NewReader(file)

	// Skip header
	if _, err := reader.Read(); err != nil {
		return nil, errors.WrapStorageError("read", "failed to read header", err)
	}

	var transactions []*domain.Transaction
	for {
		row, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, errors.WrapStorageError("read", "failed to read row", err)
		}

		tx, err := domain.FromCSVRow(row)
		if err != nil {
			fmt.Printf("Warning: skipping invalid transaction row: %v\n", err)
			continue
		}

		transactions = append(transactions, tx)
	}

	return transactions, nil
}

// writeAllUnlocked writes all transactions atomically (caller must hold lock)
func (r *CSVRepository) writeAllUnlocked(transactions []*domain.Transaction) error {
	// Write to temporary file
	tempPath := r.filePath + ".tmp"
	file, err := os.Create(tempPath)
	if err != nil {
		return errors.WrapStorageError("write", "failed to create temporary file", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	// Write header
	header := []string{"id", "date", "source", "destination", "amount", "currency", "description", "status", "tags"}
	if err := writer.Write(header); err != nil {
		os.Remove(tempPath)
		return errors.WrapStorageError("write", "failed to write header", err)
	}

	// Write all transactions
	for _, tx := range transactions {
		if err := writer.Write(tx.ToCSVRow()); err != nil {
			os.Remove(tempPath)
			return errors.WrapStorageError("write", "failed to write transaction", err)
		}
	}

	writer.Flush()
	if err := writer.Error(); err != nil {
		os.Remove(tempPath)
		return errors.WrapStorageError("write", "failed to flush writer", err)
	}

	// Close file before rename
	file.Close()

	// Atomically replace the original file
	if err := os.Rename(tempPath, r.filePath); err != nil {
		os.Remove(tempPath)
		return errors.WrapStorageError("write", "failed to replace original file", err)
	}

	return nil
}

// Helper functions

func createCSVWithHeader(filePath string) error {
	file, err := os.Create(filePath)
	if err != nil {
		return errors.WrapStorageError("initialize", "failed to create file", err)
	}
	defer file.Close()

	writer := csv.NewWriter(file)
	defer writer.Flush()

	header := []string{"id", "date", "source", "destination", "amount", "currency", "description", "status", "tags"}
	if err := writer.Write(header); err != nil {
		return errors.WrapStorageError("initialize", "failed to write header", err)
	}

	return nil
}

func matchesCriteria(tx *domain.Transaction, criteria SearchCriteria) bool {
	// Date range
	if criteria.DateFrom != "" && tx.Date < criteria.DateFrom {
		return false
	}
	if criteria.DateTo != "" && tx.Date > criteria.DateTo {
		return false
	}

	// Source
	if criteria.Source != "" && !strings.Contains(strings.ToLower(tx.Source), strings.ToLower(criteria.Source)) {
		return false
	}

	// Destination
	if criteria.Destination != "" && !strings.Contains(strings.ToLower(tx.Destination), strings.ToLower(criteria.Destination)) {
		return false
	}

	// Amount range
	if criteria.MinAmount > 0 && tx.Amount < criteria.MinAmount {
		return false
	}
	if criteria.MaxAmount > 0 && tx.Amount > criteria.MaxAmount {
		return false
	}

	// Currency
	if criteria.Currency != "" && tx.Currency != criteria.Currency {
		return false
	}

	// Status
	if criteria.Status != "" && tx.Status != criteria.Status {
		return false
	}

	// Tags
	if criteria.Tags != "" && !strings.Contains(strings.ToLower(tx.Tags), strings.ToLower(criteria.Tags)) {
		return false
	}

	return true
}
