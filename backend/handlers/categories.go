package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/meulindo/geode/backend/models"
	"github.com/meulindo/geode/backend/services"
)

// CategoryHandler handles category-related HTTP requests
type CategoryHandler struct {
	service *services.LedgerService
}

// NewCategoryHandler creates a new category handler
func NewCategoryHandler(service *services.LedgerService) *CategoryHandler {
	return &CategoryHandler{
		service: service,
	}
}

// GetAllCategories handles GET /api/categories
func (h *CategoryHandler) GetAllCategories(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	categories, err := h.service.GetAllCategories()
	if err != nil {
		log.Printf("Error getting categories: %v", err)
		WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	WriteJSON(w, http.StatusOK, categories)
	log.Printf("Retrieved %d categories", len(categories))
}

// GetCategoryByName handles GET /api/categories/:name
func (h *CategoryHandler) GetCategoryByName(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	name := r.URL.Path[len("/api/categories/"):]
	if name == "" {
		WriteError(w, http.StatusBadRequest, "Category name required")
		return
	}

	category, err := h.service.GetCategoryByName(name)
	if err != nil {
		log.Printf("Error getting category: %v", err)
		WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	if category == nil {
		WriteError(w, http.StatusNotFound, "Category not found")
		return
	}

	WriteJSON(w, http.StatusOK, category)
}

// createCategoryRequest is the request body for POST /api/categories
type createCategoryRequest struct {
	Name          string  `json:"name"`
	Type          string  `json:"type"`
	ParentName    *string `json:"parentName"`
	GradientStart string  `json:"gradientStart"`
	GradientEnd   string  `json:"gradientEnd"`
	ImageURL      string  `json:"imageURL"`
}

// CreateCategory handles POST /api/categories
func (h *CategoryHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	var req createCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding create category request: %v", err)
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	if req.Name == "" {
		WriteError(w, http.StatusBadRequest, "Category name is required")
		return
	}

	if req.Type != "income" && req.Type != "expense" {
		WriteError(w, http.StatusBadRequest, "type must be 'income' or 'expense'")
		return
	}

	category, err := h.service.CreateCategory(req.Name, req.Type, req.ParentName, req.GradientStart, req.GradientEnd, req.ImageURL)
	if err != nil {
		log.Printf("Error creating category: %v", err)
		if err.Error() == "category already exists" {
			WriteError(w, http.StatusConflict, err.Error())
		} else {
			WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	WriteJSON(w, http.StatusCreated, category)
	log.Printf("Category created: %s (parent: %v)", category.Name, category.ParentName)
}

// UpdateCategory handles PUT /api/categories/:name
func (h *CategoryHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	name := r.URL.Path[len("/api/categories/"):]
	if name == "" {
		WriteError(w, http.StatusBadRequest, "Category name required")
		return
	}

	var req models.CategoryUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding update category request: %v", err)
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	category, err := h.service.UpdateCategory(name, req)
	if err != nil {
		log.Printf("Error updating category %s: %v", name, err)
		if err.Error() == "category not found" {
			WriteError(w, http.StatusNotFound, err.Error())
		} else if err.Error() == "a category with that name already exists" {
			WriteError(w, http.StatusConflict, err.Error())
		} else {
			WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	WriteJSON(w, http.StatusOK, category)
	log.Printf("Category updated: %s", category.Name)
}

// DeleteCategory handles DELETE /api/categories/:name
func (h *CategoryHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		WriteError(w, http.StatusMethodNotAllowed, "Method not allowed")
		return
	}

	name := r.URL.Path[len("/api/categories/"):]
	if name == "" {
		WriteError(w, http.StatusBadRequest, "Category name required")
		return
	}

	if err := h.service.DeleteCategory(name); err != nil {
		log.Printf("Error deleting category %s: %v", name, err)
		if err.Error() == "category not found" {
			WriteError(w, http.StatusNotFound, err.Error())
		} else {
			WriteError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
	log.Printf("Category deleted: %s", name)
}
