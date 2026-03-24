package storage

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"

	"github.com/meulindo/geode/backend/models"
)

// JSONStorage implements Storage interface using JSON files
type JSONStorage struct {
	dataDir          string
	transactionsFile string
	accountsFile     string
	mu               sync.RWMutex
}

// NewJSONStorage creates a new JSON storage instance
func NewJSONStorage(dataDir string) (*JSONStorage, error) {
	// Create data directory if it doesn't exist
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, err
	}

	storage := &JSONStorage{
		dataDir:          dataDir,
		transactionsFile: filepath.Join(dataDir, "transactions.json"),
		accountsFile:     filepath.Join(dataDir, "accounts.json"),
	}

	// Initialize files if they don't exist
	if err := storage.initializeFiles(); err != nil {
		return nil, err
	}

	return storage, nil
}

// initializeFiles creates empty JSON files if they don't exist
func (s *JSONStorage) initializeFiles() error {
	// Initialize transactions file
	if _, err := os.Stat(s.transactionsFile); os.IsNotExist(err) {
		if err := s.writeTransactions([]*models.Transaction{}); err != nil {
			return err
		}
	}

	// Initialize accounts file
	if _, err := os.Stat(s.accountsFile); os.IsNotExist(err) {
		if err := s.writeAccounts([]*models.Account{}); err != nil {
			return err
		}
	}

	return nil
}

// SaveTransaction saves a transaction to the JSON file
func (s *JSONStorage) SaveTransaction(transaction *models.Transaction) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	transactions, err := s.readTransactions()
	if err != nil {
		return err
	}

	transactions = append(transactions, transaction)
	return s.writeTransactions(transactions)
}

// GetAllTransactions retrieves all transactions
func (s *JSONStorage) GetAllTransactions() ([]*models.Transaction, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.readTransactions()
}

// GetTransactionByID retrieves a transaction by ID
func (s *JSONStorage) GetTransactionByID(id string) (*models.Transaction, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	transactions, err := s.readTransactions()
	if err != nil {
		return nil, err
	}

	for _, t := range transactions {
		if t.ID == id {
			return t, nil
		}
	}

	return nil, errors.New("transaction not found")
}

// SaveAccount saves a new account to the JSON file
func (s *JSONStorage) SaveAccount(account *models.Account) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	accounts, err := s.readAccounts()
	if err != nil {
		return err
	}

	// Check if account already exists
	for _, a := range accounts {
		if a.Name == account.Name {
			return errors.New("account already exists")
		}
	}

	accounts = append(accounts, account)
	return s.writeAccounts(accounts)
}

// GetAllAccounts retrieves all accounts
func (s *JSONStorage) GetAllAccounts() ([]*models.Account, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	return s.readAccounts()
}

// GetAccountByName retrieves an account by name
func (s *JSONStorage) GetAccountByName(name string) (*models.Account, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	accounts, err := s.readAccounts()
	if err != nil {
		return nil, err
	}

	for _, a := range accounts {
		if a.Name == name {
			return a, nil
		}
	}

	return nil, nil // Return nil if not found (not an error)
}

// UpdateAccount updates an existing account
func (s *JSONStorage) UpdateAccount(account *models.Account) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	accounts, err := s.readAccounts()
	if err != nil {
		return err
	}

	found := false
	for i, a := range accounts {
		if a.Name == account.Name {
			accounts[i] = account
			found = true
			break
		}
	}

	if !found {
		return errors.New("account not found")
	}

	return s.writeAccounts(accounts)
}

// readTransactions reads transactions from the JSON file
func (s *JSONStorage) readTransactions() ([]*models.Transaction, error) {
	data, err := os.ReadFile(s.transactionsFile)
	if err != nil {
		return nil, err
	}

	var transactions []*models.Transaction
	if err := json.Unmarshal(data, &transactions); err != nil {
		return nil, err
	}

	return transactions, nil
}

// writeTransactions writes transactions to the JSON file
func (s *JSONStorage) writeTransactions(transactions []*models.Transaction) error {
	data, err := json.MarshalIndent(transactions, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.transactionsFile, data, 0644)
}

// readAccounts reads accounts from the JSON file
func (s *JSONStorage) readAccounts() ([]*models.Account, error) {
	data, err := os.ReadFile(s.accountsFile)
	if err != nil {
		return nil, err
	}

	var accounts []*models.Account
	if err := json.Unmarshal(data, &accounts); err != nil {
		return nil, err
	}

	return accounts, nil
}

// writeAccounts writes accounts to the JSON file
func (s *JSONStorage) writeAccounts(accounts []*models.Account) error {
	data, err := json.MarshalIndent(accounts, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.accountsFile, data, 0644)
}
