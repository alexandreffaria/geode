/**
 * UI store - manages UI state for modals and dialogs.
 * Provides centralized state management for all UI interactions.
 */

import { writable } from "svelte/store";

// Modal state
export const showModal = writable(false);
export const modalMode = writable("add"); // 'add' or 'edit'
export const editingTransaction = writable(null);

// Delete confirmation dialog state
export const showDeleteConfirm = writable(false);
export const deleteTargetId = writable(null);

/**
 * Opens the modal in 'add' mode for creating a new transaction.
 */
export function openAddModal() {
  modalMode.set("add");
  editingTransaction.set(null);
  showModal.set(true);
}

/**
 * Opens the modal in 'edit' mode for editing an existing transaction.
 *
 * @param {Object} transaction - The transaction to edit
 */
export function openEditModal(transaction) {
  modalMode.set("edit");
  editingTransaction.set(transaction);
  showModal.set(true);
}

/**
 * Closes the modal and resets modal state.
 */
export function closeModal() {
  showModal.set(false);
  modalMode.set("add");
  editingTransaction.set(null);
}

/**
 * Opens the delete confirmation dialog for a specific transaction.
 *
 * @param {string} id - The ID of the transaction to delete
 */
export function openDeleteConfirm(id) {
  deleteTargetId.set(id);
  showDeleteConfirm.set(true);
}

/**
 * Closes the delete confirmation dialog and resets state.
 */
export function closeDeleteConfirm() {
  showDeleteConfirm.set(false);
  deleteTargetId.set(null);
}
