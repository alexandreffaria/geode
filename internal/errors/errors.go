package errors

import (
	"fmt"
)

// ValidationError represents an error in data validation
type ValidationError struct {
	Field   string
	Message string
	Err     error
}

func (e *ValidationError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("validation error on field '%s': %s (%v)", e.Field, e.Message, e.Err)
	}
	return fmt.Sprintf("validation error on field '%s': %s", e.Field, e.Message)
}

func (e *ValidationError) Unwrap() error {
	return e.Err
}

// NewValidationError creates a new validation error
func NewValidationError(field, message string) *ValidationError {
	return &ValidationError{
		Field:   field,
		Message: message,
	}
}

// WrapValidationError wraps an existing error with validation context
func WrapValidationError(field, message string, err error) *ValidationError {
	return &ValidationError{
		Field:   field,
		Message: message,
		Err:     err,
	}
}

// NotFoundError represents an error when a resource is not found
type NotFoundError struct {
	Resource string
	ID       string
	Err      error
}

func (e *NotFoundError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s with ID '%s' not found: %v", e.Resource, e.ID, e.Err)
	}
	return fmt.Sprintf("%s with ID '%s' not found", e.Resource, e.ID)
}

func (e *NotFoundError) Unwrap() error {
	return e.Err
}

// NewNotFoundError creates a new not found error
func NewNotFoundError(resource, id string) *NotFoundError {
	return &NotFoundError{
		Resource: resource,
		ID:       id,
	}
}

// WrapNotFoundError wraps an existing error with not found context
func WrapNotFoundError(resource, id string, err error) *NotFoundError {
	return &NotFoundError{
		Resource: resource,
		ID:       id,
		Err:      err,
	}
}

// StorageError represents an error in storage operations
type StorageError struct {
	Operation string
	Message   string
	Err       error
}

func (e *StorageError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("storage error during %s: %s (%v)", e.Operation, e.Message, e.Err)
	}
	return fmt.Sprintf("storage error during %s: %s", e.Operation, e.Message)
}

func (e *StorageError) Unwrap() error {
	return e.Err
}

// NewStorageError creates a new storage error
func NewStorageError(operation, message string) *StorageError {
	return &StorageError{
		Operation: operation,
		Message:   message,
	}
}

// WrapStorageError wraps an existing error with storage context
func WrapStorageError(operation, message string, err error) *StorageError {
	return &StorageError{
		Operation: operation,
		Message:   message,
		Err:       err,
	}
}

// UserFriendlyMessage converts technical errors to user-friendly messages
func UserFriendlyMessage(err error) string {
	if err == nil {
		return ""
	}

	switch e := err.(type) {
	case *ValidationError:
		return fmt.Sprintf("Invalid %s: %s", e.Field, e.Message)
	case *NotFoundError:
		return fmt.Sprintf("%s not found", e.Resource)
	case *StorageError:
		return fmt.Sprintf("Failed to %s data. Please try again.", e.Operation)
	default:
		return "An unexpected error occurred. Please try again."
	}
}
