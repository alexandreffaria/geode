package storage

import (
	"encoding/json"
	"errors"
	"os"
	"path/filepath"
	"sync"

	"github.com/google/uuid"
	"github.com/meulindo/geode/backend/models"
)

// JSONStorage implements Storage interface using JSON files
type JSONStorage struct {
	dataDir          string
	transactionsFile string
	accountsFile     string
	categoriesFile   string
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
		categoriesFile:   filepath.Join(dataDir, "categories.json"),
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

	// Initialize categories file
	if _, err := os.Stat(s.categoriesFile); os.IsNotExist(err) {
		if err := s.writeCategories([]*models.Category{}); err != nil {
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

// GetTransactionsByGroupID retrieves all transactions belonging to a recurrence group
func (s *JSONStorage) GetTransactionsByGroupID(groupID string) ([]*models.Transaction, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	transactions, err := s.readTransactions()
	if err != nil {
		return nil, err
	}

	var result []*models.Transaction
	for _, t := range transactions {
		if t.RecurrenceGroupID != nil && *t.RecurrenceGroupID == groupID {
			result = append(result, t)
		}
	}

	return result, nil
}

// UpdateTransaction updates an existing transaction in the JSON file
func (s *JSONStorage) UpdateTransaction(transaction *models.Transaction) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	transactions, err := s.readTransactions()
	if err != nil {
		return err
	}

	// Find and update the transaction
	found := false
	for i, t := range transactions {
		if t.ID == transaction.ID {
			transactions[i] = transaction
			found = true
			break
		}
	}

	if !found {
		return errors.New("transaction not found")
	}

	return s.writeTransactions(transactions)
}

// DeleteTransaction deletes a transaction from the JSON file
func (s *JSONStorage) DeleteTransaction(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	transactions, err := s.readTransactions()
	if err != nil {
		return err
	}

	// Find and remove the transaction
	found := false
	for i, t := range transactions {
		if t.ID == id {
			// Remove transaction by slicing
			transactions = append(transactions[:i], transactions[i+1:]...)
			found = true
			break
		}
	}

	if !found {
		return errors.New("transaction not found")
	}

	return s.writeTransactions(transactions)
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

// SetMainAccount sets is_main = true for the named account and false for all others.
// Returns an error if the account is not found.
func (s *JSONStorage) SetMainAccount(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	accounts, err := s.readAccounts()
	if err != nil {
		return err
	}

	found := false
	for _, a := range accounts {
		if a.Name == name {
			found = true
			break
		}
	}
	if !found {
		return errors.New("account not found")
	}

	for _, a := range accounts {
		a.IsMain = a.Name == name
	}

	return s.writeAccounts(accounts)
}

// GetMainAccount returns the account with is_main == true, or nil if none is set.
func (s *JSONStorage) GetMainAccount() (*models.Account, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	accounts, err := s.readAccounts()
	if err != nil {
		return nil, err
	}

	for _, a := range accounts {
		if a.IsMain {
			return a, nil
		}
	}

	return nil, nil
}

// DeleteAccount removes an account by name from the JSON file
func (s *JSONStorage) DeleteAccount(name string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	accounts, err := s.readAccounts()
	if err != nil {
		return err
	}

	found := false
	for i, a := range accounts {
		if a.Name == name {
			accounts = append(accounts[:i], accounts[i+1:]...)
			found = true
			break
		}
	}

	if !found {
		return errors.New("account not found")
	}

	return s.writeAccounts(accounts)
}

// SaveCategory saves a new category to the JSON file.
// Generates a UUID if category.ID is empty.
// Enforces uniqueness by (name, type, parent_id) scope — two categories may share
// the same name if they differ in type or parent_id.
func (s *JSONStorage) SaveCategory(category *models.Category) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	categories, err := s.readCategories()
	if err != nil {
		return err
	}

	// Generate UUID if not already set
	if category.ID == "" {
		category.ID = uuid.New().String()
	}

	// Enforce uniqueness within (name, type, parent_id) scope
	for _, c := range categories {
		if c.Name == category.Name && c.Type == category.Type && parentIDEqual(c.ParentID, category.ParentID) {
			return errors.New("category already exists")
		}
	}

	// Do not persist ParentName — it is a computed display field
	toStore := *category
	toStore.ParentName = nil

	categories = append(categories, &toStore)
	return s.writeCategories(categories)
}

// GetAllCategories retrieves all categories with ParentName populated from ParentID.
func (s *JSONStorage) GetAllCategories() ([]*models.Category, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	categories, err := s.readCategories()
	if err != nil {
		return nil, err
	}

	return s.populateParentNames(categories), nil
}

// GetCategoryByID retrieves a category by its UUID ID field.
func (s *JSONStorage) GetCategoryByID(id string) (*models.Category, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	categories, err := s.readCategories()
	if err != nil {
		return nil, err
	}

	for _, c := range categories {
		if c.ID == id {
			result := *c
			result.ParentName = s.lookupParentName(c.ParentID, categories)
			return &result, nil
		}
	}

	return nil, nil // Return nil if not found (not an error)
}

// GetCategoryByName retrieves a category by name (kept for internal migration/lookup use).
// Returns the first match found — note that names are no longer globally unique.
func (s *JSONStorage) GetCategoryByName(name string) (*models.Category, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	categories, err := s.readCategories()
	if err != nil {
		return nil, err
	}

	for _, c := range categories {
		if c.Name == name {
			result := *c
			result.ParentName = s.lookupParentName(c.ParentID, categories)
			return &result, nil
		}
	}

	return nil, nil // Return nil if not found (not an error)
}

// UpdateCategory finds a category by ID, replaces its fields, and persists.
// Enforces uniqueness by (name, type, parent_id) scope (excluding the category being updated).
func (s *JSONStorage) UpdateCategory(id string, category *models.Category) (*models.Category, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	categories, err := s.readCategories()
	if err != nil {
		return nil, err
	}

	// Check uniqueness: no other category may share (name, type, parent_id)
	for _, c := range categories {
		if c.ID != id && c.Name == category.Name && c.Type == category.Type && parentIDEqual(c.ParentID, category.ParentID) {
			return nil, errors.New("a category with that name already exists in the same scope")
		}
	}

	found := false
	var updated *models.Category
	for i, c := range categories {
		if c.ID == id {
			// Preserve the original ID and CreatedAt
			category.ID = c.ID
			category.CreatedAt = c.CreatedAt
			// Do not persist ParentName
			toStore := *category
			toStore.ParentName = nil
			categories[i] = &toStore
			updated = &toStore
			found = true
			break
		}
	}

	if !found {
		return nil, errors.New("category not found")
	}

	if err := s.writeCategories(categories); err != nil {
		return nil, err
	}

	// Populate ParentName for the returned value
	result := *updated
	result.ParentName = s.lookupParentName(updated.ParentID, categories)
	return &result, nil
}

// DeleteCategory removes a category by ID from the JSON file.
func (s *JSONStorage) DeleteCategory(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	categories, err := s.readCategories()
	if err != nil {
		return err
	}

	found := false
	for i, c := range categories {
		if c.ID == id {
			categories = append(categories[:i], categories[i+1:]...)
			found = true
			break
		}
	}

	if !found {
		return errors.New("category not found")
	}

	return s.writeCategories(categories)
}

// populateParentNames returns a new slice of categories with ParentName set from ParentID.
func (s *JSONStorage) populateParentNames(categories []*models.Category) []*models.Category {
	// Build ID→Name index
	idToName := make(map[string]string, len(categories))
	for _, c := range categories {
		idToName[c.ID] = c.Name
	}

	result := make([]*models.Category, len(categories))
	for i, c := range categories {
		copy := *c
		if c.ParentID != nil && *c.ParentID != "" {
			if name, ok := idToName[*c.ParentID]; ok {
				copy.ParentName = &name
			}
		}
		result[i] = &copy
	}
	return result
}

// lookupParentName returns a pointer to the parent's name given a parentID and the full list.
func (s *JSONStorage) lookupParentName(parentID *string, categories []*models.Category) *string {
	if parentID == nil || *parentID == "" {
		return nil
	}
	for _, c := range categories {
		if c.ID == *parentID {
			name := c.Name
			return &name
		}
	}
	return nil
}

// parentIDEqual compares two nullable parent ID pointers for equality.
func parentIDEqual(a, b *string) bool {
	if a == nil && b == nil {
		return true
	}
	if a == nil || b == nil {
		return false
	}
	return *a == *b
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

// readCategories reads categories from the JSON file
func (s *JSONStorage) readCategories() ([]*models.Category, error) {
	data, err := os.ReadFile(s.categoriesFile)
	if err != nil {
		return nil, err
	}

	var categories []*models.Category
	if err := json.Unmarshal(data, &categories); err != nil {
		return nil, err
	}

	return categories, nil
}

// writeCategories writes categories to the JSON file
func (s *JSONStorage) writeCategories(categories []*models.Category) error {
	data, err := json.MarshalIndent(categories, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(s.categoriesFile, data, 0644)
}
