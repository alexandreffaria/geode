package models

import (
	"math/rand"
	"time"
)

// Category represents a transaction category
type Category struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Type          string    `json:"type"`
	ParentID      *string   `json:"parent_id,omitempty"`   // stored reference to parent category ID
	ParentName    *string   `json:"parent_name,omitempty"` // populated on read for display; not stored
	GradientStart string    `json:"gradient_start"`
	GradientEnd   string    `json:"gradient_end"`
	ImageURL      string    `json:"image_url"`
	CreatedAt     time.Time `json:"created_at"`
	LastUpdated   time.Time `json:"last_updated"`
}

// NewCategory creates a new category with the given name, type, and optional parent ID.
// GradientStart and GradientEnd are auto-generated from the pleasant color palette.
func NewCategory(name string, categoryType string, parentID *string) *Category {
	now := time.Now()

	// Pick a random gradient pair from the shared palette
	pair := gradientPalette[rand.Intn(len(gradientPalette))]

	return &Category{
		Name:          name,
		Type:          categoryType,
		ParentID:      parentID,
		GradientStart: pair[0],
		GradientEnd:   pair[1],
		ImageURL:      "",
		CreatedAt:     now,
		LastUpdated:   now,
	}
}
