package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/meulindo/geode/backend/models"
	"github.com/meulindo/geode/backend/storage"
)

// ExchangeRateService handles fetching and caching exchange rates.
type ExchangeRateService struct {
	storage storage.Storage
	ledger  *LedgerService
}

// NewExchangeRateService creates a new ExchangeRateService.
func NewExchangeRateService(s storage.Storage, l *LedgerService) *ExchangeRateService {
	return &ExchangeRateService{
		storage: s,
		ledger:  l,
	}
}

// frankfurterResponse mirrors the JSON shape returned by api.frankfurter.app/latest.
type frankfurterResponse struct {
	Base  string             `json:"base"`
	Date  string             `json:"date"`
	Rates map[string]float64 `json:"rates"`
}

// FetchAndSaveRates fetches today's exchange rates from the Frankfurter API and
// persists them. It is a no-op if rates for today are already stored.
func (s *ExchangeRateService) FetchAndSaveRates(ctx context.Context) error {
	today := time.Now().Format("2006-01-02")

	// Determine base currency from the main account, fall back to BRL.
	base := "BRL"
	mainAccount, err := s.storage.GetMainAccount()
	if err != nil {
		log.Printf("ExchangeRateService: could not retrieve main account: %v", err)
	} else if mainAccount != nil && mainAccount.Currency != "" {
		base = mainAccount.Currency
	}

	// Skip if we already have today's rates.
	existing, err := s.storage.GetExchangeRate(today)
	if err != nil {
		return fmt.Errorf("exchange rate lookup failed: %w", err)
	}
	if existing != nil {
		log.Printf("ExchangeRateService: rates for %s already cached, skipping fetch", today)
		return nil
	}

	// Fetch from Frankfurter API.
	url := fmt.Sprintf("https://api.frankfurter.app/latest?base=%s", base)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("failed to build request: %w", err)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to fetch exchange rates: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("frankfurter API returned status %d", resp.StatusCode)
	}

	var fr frankfurterResponse
	if err := json.NewDecoder(resp.Body).Decode(&fr); err != nil {
		return fmt.Errorf("failed to decode exchange rate response: %w", err)
	}

	rate := &models.ExchangeRate{
		Date:  fr.Date,
		Base:  fr.Base,
		Rates: fr.Rates,
	}

	if err := s.storage.SaveExchangeRate(rate); err != nil {
		log.Printf("ExchangeRateService: failed to save rates for %s: %v", fr.Date, err)
		return fmt.Errorf("failed to save exchange rates: %w", err)
	}

	log.Printf("ExchangeRateService: saved rates for %s (base: %s, %d currencies)", fr.Date, fr.Base, len(fr.Rates))
	return nil
}

// GetLatestRates returns the most recently stored exchange rate entry.
// If no rates are stored yet, it fetches them first.
func (s *ExchangeRateService) GetLatestRates(ctx context.Context) (*models.ExchangeRate, error) {
	// Try to find the entry with the lexicographically greatest date (YYYY-MM-DD sorts correctly).
	// We read all rates and pick the latest.
	rates, err := s.storage.GetExchangeRate("") // sentinel: empty string won't match any date
	if err != nil {
		return nil, fmt.Errorf("failed to read exchange rates: %w", err)
	}
	// GetExchangeRate("") returns nil, nil — we need to enumerate all rates.
	// Use a dedicated helper via the storage interface by fetching today first.
	_ = rates // discard the nil result from the sentinel call

	// Fetch today's rates if missing, then return the latest stored entry.
	if err := s.FetchAndSaveRates(ctx); err != nil {
		log.Printf("ExchangeRateService: background fetch failed: %v", err)
		// Continue — we may still have older cached rates.
	}

	return s.findLatestStoredRate()
}

// findLatestStoredRate scans all stored exchange rates and returns the one with
// the greatest date string. Returns nil, nil when no rates are stored at all.
func (s *ExchangeRateService) findLatestStoredRate() (*models.ExchangeRate, error) {
	// We iterate over possible recent dates (up to 30 days back) to find the latest.
	// This avoids adding a GetAllExchangeRates method to the Storage interface.
	now := time.Now()
	for i := 0; i < 30; i++ {
		date := now.AddDate(0, 0, -i).Format("2006-01-02")
		rate, err := s.storage.GetExchangeRate(date)
		if err != nil {
			return nil, fmt.Errorf("failed to read exchange rate for %s: %w", date, err)
		}
		if rate != nil {
			return rate, nil
		}
	}
	return nil, nil
}

// StartDailyCron starts a goroutine that fetches exchange rates immediately and
// then every 24 hours until ctx is cancelled.
func (s *ExchangeRateService) StartDailyCron(ctx context.Context) {
	go func() {
		// Fetch immediately on startup.
		if err := s.FetchAndSaveRates(ctx); err != nil {
			log.Printf("ExchangeRateService: initial fetch failed: %v", err)
		}

		ticker := time.NewTicker(24 * time.Hour)
		defer ticker.Stop()

		for {
			select {
			case <-ticker.C:
				if err := s.FetchAndSaveRates(ctx); err != nil {
					log.Printf("ExchangeRateService: scheduled fetch failed: %v", err)
				}
			case <-ctx.Done():
				log.Println("ExchangeRateService: cron stopped")
				return
			}
		}
	}()
}
