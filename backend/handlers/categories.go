package handlers

import (
	"encoding/json"
	"errors"
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
	categories, err := h.service.GetAllCategories()
	if err != nil {
		log.Printf("Error getting categories: %v", err)
		WriteError(w, http.StatusInternalServerError, "Internal server error")
		return
	}

	WriteJSON(w, http.StatusOK, categories)
	log.Printf("Retrieved %d categories", len(categories))
}

// GetCategoryByID handles GET /api/categories/:id
func (h *CategoryHandler) GetCategoryByID(w http.ResponseWriter, r *http.Request) {
	id := pathParam(r, "/api/categories/")
	if id == "" {
		WriteError(w, http.StatusBadRequest, "Category ID required")
		return
	}

	category, err := h.service.GetCategoryByID(id)
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

// CreateCategory handles POST /api/categories
func (h *CategoryHandler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	var req models.CategoryRequest
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

	category, err := h.service.CreateCategory(req.Name, req.Type, req.ParentID, req.GradientStart, req.GradientEnd, req.ImageURL)
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
	log.Printf("Category created: %s (id: %s, parent_id: %v)", category.Name, category.ID, category.ParentID)
}

// UpdateCategory handles PUT /api/categories/:id
func (h *CategoryHandler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	id := pathParam(r, "/api/categories/")
	if id == "" {
		WriteError(w, http.StatusBadRequest, "Category ID required")
		return
	}

	var req models.CategoryUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		log.Printf("Error decoding update category request: %v", err)
		WriteError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	category, err := h.service.UpdateCategory(id, req)
	if err != nil {
		log.Printf("Error updating category %s: %v", id, err)
		if errors.Is(err, services.ErrCategoryNotFound) {
			WriteError(w, http.StatusNotFound, err.Error())
		} else if err.Error() == "a category with that name already exists in the same scope" {
			WriteError(w, http.StatusConflict, err.Error())
		} else {
			WriteError(w, http.StatusBadRequest, err.Error())
		}
		return
	}

	WriteJSON(w, http.StatusOK, category)
	log.Printf("Category updated: %s (id: %s)", category.Name, category.ID)
}

// DeleteCategory handles DELETE /api/categories/:id
func (h *CategoryHandler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	id := pathParam(r, "/api/categories/")
	if id == "" {
		WriteError(w, http.StatusBadRequest, "Category ID required")
		return
	}

	if err := h.service.DeleteCategory(id); err != nil {
		log.Printf("Error deleting category %s: %v", id, err)
		if errors.Is(err, services.ErrCategoryNotFound) {
			WriteError(w, http.StatusNotFound, err.Error())
		} else {
			WriteError(w, http.StatusInternalServerError, err.Error())
		}
		return
	}

	w.WriteHeader(http.StatusNoContent)
	log.Printf("Category deleted: %s", id)
}
