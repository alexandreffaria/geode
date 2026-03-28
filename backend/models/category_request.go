package models

// CategoryUpdateRequest holds the optional fields that can be updated on a Category.
// Pointer fields allow distinguishing "not provided" from zero/empty values.
// Use empty string "" for ParentName to clear the parent (make top-level).
type CategoryUpdateRequest struct {
	Name          *string `json:"name"`
	Type          *string `json:"type"`
	ParentName    *string `json:"parent_name"`
	GradientStart *string `json:"gradientStart"`
	GradientEnd   *string `json:"gradientEnd"`
	ImageURL      *string `json:"imageURL"`
}
