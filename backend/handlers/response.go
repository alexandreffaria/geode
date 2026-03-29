package handlers

import (
	"encoding/json"
	"log"
	"net/http"
)

// ErrorResponse represents a standard error response format
type ErrorResponse struct {
	Error string `json:"error"`
}

// WriteError writes a JSON error response with the given status code and message
func WriteError(w http.ResponseWriter, statusCode int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	response := ErrorResponse{
		Error: message,
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		log.Printf("Error encoding error response: %v", err)
	}
}

// WriteJSON writes a JSON response with the given status code and data
func WriteJSON(w http.ResponseWriter, statusCode int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)

	if err := json.NewEncoder(w).Encode(data); err != nil {
		log.Printf("Error encoding JSON response: %v", err)
	}
}
