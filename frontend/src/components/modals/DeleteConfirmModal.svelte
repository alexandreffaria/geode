<script>
  import ModalBackdrop from '../common/ModalBackdrop.svelte';
  import Button from '../common/Button.svelte';
  import { showDeleteConfirm, deleteTargetId, closeDeleteConfirm } from '../../stores/uiStore.js';
  import { deleteTransaction } from '../../stores/transactionStore.js';

  async function handleDelete() {
    if (!$deleteTargetId) return;
    
    const success = await deleteTransaction($deleteTargetId);
    if (success) {
      closeDeleteConfirm();
    } else {
      alert("Failed to delete transaction!");
    }
  }

  function handleCancel() {
    closeDeleteConfirm();
  }
</script>

{#if $showDeleteConfirm}
  <ModalBackdrop on:close={handleCancel}>
    <div class="modal confirm-dialog">
      <h2>⚠️ Confirm Delete</h2>
      <p>Are you sure you want to delete this transaction? This action cannot be undone.</p>
      <div class="modal-actions">
        <Button variant="secondary" on:click={handleCancel}>Cancel</Button>
        <Button variant="danger" on:click={handleDelete}>Delete</Button>
      </div>
    </div>
  </ModalBackdrop>
{/if}

<style>
  .modal {
    background: #1e1e1e;
    padding: 2rem;
    border-radius: 12px;
    border: 1px solid #444;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
  }

  .confirm-dialog {
    width: 400px;
  }

  .confirm-dialog h2 {
    margin-top: 0;
    color: #eee;
    margin-bottom: 1.5rem;
  }

  .confirm-dialog p {
    color: #ccc;
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 2rem;
  }
</style>
