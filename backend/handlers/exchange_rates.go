package handlers

import (
	"net/http"

	"github.com/meulindo/geode/backend/services"
)

// ExchangeRateHandler handles HTTP requests for exchange rate data.
type ExchangeRateHandler struct {
	service *services.ExchangeRateService
}

// NewExchangeRateHandler creates a new ExchangeRateHandler.
func NewExchangeRateHandler(s *services.ExchangeRateService) *ExchangeRateHandler {
	return &ExchangeRateHandler{service: s}
}

// GetLatest handles GET /api/exchange-rates/latest.
// It returns the most recently stored exchange rate as JSON.
func (h *ExchangeRateHandler) GetLatest(w http.ResponseWriter, r *http.Request) {
	rate, err := h.service.GetLatestRates(r.Context())
	if err != nil {
		WriteError(w, http.StatusInternalServerError, "Failed to retrieve exchange rates")
		return
	}
	if rate == nil {
		WriteError(w, http.StatusNotFound, "No exchange rates available")
		return
	}
	WriteJSON(w, http.StatusOK, rate)
}
