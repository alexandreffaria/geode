package models

// CategoryRequest holds the fields for creating a new Category.
type CategoryRequest struct {
	Name          string  `json:"name"`
	Type          string  `json:"type"`
	ParentID      *string `json:"parent_id,omitempty"`
	GradientStart string  `json:"gradient_start"`
	GradientEnd   string  `json:"gradient_end"`
	ImageURL      string  `json:"image_url"`
}

// CategoryUpdateRequest holds the optional fields that can be updated on a Category.
// Pointer fields allow distinguishing "not provided" from zero/empty values.
// Use empty string "" for ParentID to clear the parent (make top-level).
type CategoryUpdateRequest struct {
	Name          *string `json:"name"`
	Type          *string `json:"type"`
	ParentID      *string `json:"parent_id"`
	GradientStart *string `json:"gradient_start"`
	GradientEnd   *string `json:"gradient_end"`
	ImageURL      *string `json:"image_url"`
}
