<script>
  import ModalBackdrop from '../common/ModalBackdrop.svelte';
  import Button from '../common/Button.svelte';
  import Input from '../common/Input.svelte';
  import { showModal, modalMode, editingTransaction, closeModal } from '../../stores/uiStore.js';
  import { addTransaction, updateTransaction } from '../../stores/transactionStore.js';
  import { walletOptions, expenseOptions, incomeOptions, allAccountNames } from '../../stores/accountStore.js';
  import { getEmptyTransaction, determineTransactionMode } from '../../utils/transactionUtils.js';
  import { resolveAccount, extractShortName } from '../../utils/accountUtils.js';

  // Local state for the form
  let newTx = getEmptyTransaction();
  let txMode = 'expense'; // 'expense', 'income', 'transfer'
  let uiWallet = '';
  let uiCategory = '';

  // Watch for editing transaction changes to populate form
  $: if ($editingTransaction) {
    newTx = { ...$editingTransaction };
    txMode = determineTransactionMode($editingTransaction);
    
    // Extract short names based on transaction mode
    if (txMode === 'income') {
      uiCategory = extractShortName($editingTransaction.source);
      uiWallet = extractShortName($editingTransaction.destination);
    } else if (txMode === 'expense') {
      uiWallet = extractShortName($editingTransaction.source);
      uiCategory = extractShortName($editingTransaction.destination);
    } else {
      // transfer
      uiWallet = extractShortName($editingTransaction.source);
      uiCategory = extractShortName($editingTransaction.destination);
    }
  } else if ($modalMode === 'add') {
    // Reset form for new transaction
    newTx = getEmptyTransaction();
    txMode = 'expense';
    uiWallet = '';
    uiCategory = '';
  }

  // Dynamically change the category dropdown based on transaction mode
  $: currentCategoryOptions = txMode === 'expense' 
    ? $expenseOptions 
    : (txMode === 'income' ? $incomeOptions : $walletOptions);

  async function handleSave() {
    // Ensure amount is a number
    if (typeof newTx.amount === 'string') {
      newTx.amount = parseFloat(newTx.amount);
    }

    // Resolve accounts based on transaction mode
    if (txMode === 'expense') {
      newTx.source = resolveAccount(uiWallet, 'Assets:Liquid', $allAccountNames);
      newTx.destination = resolveAccount(uiCategory, 'Expenses', $allAccountNames);
    } else if (txMode === 'income') {
      newTx.source = resolveAccount(uiCategory, 'Income', $allAccountNames);
      newTx.destination = resolveAccount(uiWallet, 'Assets:Liquid', $allAccountNames);
    } else if (txMode === 'transfer') {
      newTx.source = resolveAccount(uiWallet, 'Assets:Liquid', $allAccountNames);
      newTx.destination = resolveAccount(uiCategory, 'Assets:Liquid', $allAccountNames);
    }

    let success;
    if ($modalMode === 'edit') {
      success = await updateTransaction(newTx);
    } else {
      success = await addTransaction(newTx);
    }
    
    if (success) {
      closeModal();
    } else {
      alert(`Failed to ${$modalMode === 'edit' ? 'update' : 'save'} transaction!`);
    }
  }

  function handleCancel() {
    closeModal();
  }
</script>

{#if $showModal}
  <ModalBackdrop show={$showModal} on:close={handleCancel}>
    <div class="modal">
      <h2>{$modalMode === 'edit' ? 'Edit Transaction' : 'Add Transaction'}</h2>

      <div class="tabs">
        <button type="button" class:active={txMode === 'expense'} on:click={() => txMode = 'expense'}>Expense</button>
        <button type="button" class:active={txMode === 'income'} on:click={() => txMode = 'income'}>Income</button>
        <button type="button" class:active={txMode === 'transfer'} on:click={() => txMode = 'transfer'}>Transfer</button>
      </div>
      
      <div class="form-group">
        <label for="tx-date">Date</label>
        <input id="tx-date" type="date" bind:value={newTx.date} />
      </div>

      <datalist id="wallet-options">
        {#each $walletOptions as opt} <option value={opt}></option> {/each}
      </datalist>
      <datalist id="category-options">
        {#each currentCategoryOptions as opt} <option value={opt}></option> {/each}
      </datalist>

      <div class="form-group row">
        <div class="half">
          <label for="tx-wallet">{txMode === 'transfer' ? 'From Account' : 'Account'}</label>
          <input id="tx-wallet" type="text" list="wallet-options" bind:value={uiWallet} placeholder="e.g. PagBank" autocomplete="off" />
        </div>
        <div class="half">
          <label for="tx-cat">{txMode === 'transfer' ? 'To Account' : 'Category'}</label>
          <input id="tx-cat" type="text" list="category-options" bind:value={uiCategory} placeholder={txMode === 'expense' ? 'e.g. Mercado' : 'e.g. Salario'} autocomplete="off" />
        </div>
      </div>

      <div class="form-group row">
        <div class="half">
          <label for="tx-amount">Amount</label>
          <input id="tx-amount" type="number" step="0.01" bind:value={newTx.amount} />
        </div>
        <div class="half">
          <label for="tx-currency">Currency</label>
          <input id="tx-currency" type="text" bind:value={newTx.currency} />
        </div>
      </div>

      <div class="form-group">
        <label for="tx-desc">Description</label>
        <input id="tx-desc" type="text" bind:value={newTx.description} placeholder="e.g. Compras no supermercado" />
      </div>

      <div class="form-group">
        <label for="tx-tags">Tags (Optional)</label>
        <input id="tx-tags" type="text" bind:value={newTx.tags} placeholder="e.g. #viagem" />
      </div>

      <div class="modal-actions">
        <Button variant="secondary" on:click={handleCancel}>Cancel</Button>
        <Button variant="primary" on:click={handleSave}>
          {$modalMode === 'edit' ? 'Update' : 'Save Transaction'}
        </Button>
      </div>
    </div>
  </ModalBackdrop>
{/if}

<style>
  .modal {
    background: #1e1e1e;
    padding: 2rem;
    border-radius: 12px;
    width: 500px;
    border: 1px solid #444;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    position: relative;
    z-index: 1001;
    pointer-events: auto;
  }

  .modal h2 {
    margin-top: 0;
    color: #eee;
    margin-bottom: 1.5rem;
  }

  /* Modal Tabs */
  .tabs {
    display: flex;
    gap: 5px;
    margin-bottom: 1.5rem;
    background: #111;
    padding: 5px;
    border-radius: 8px;
    border: 1px solid #333;
  }

  .tabs button {
    flex: 1;
    padding: 8px;
    border: none;
    background: transparent;
    color: #888;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
    transition: 0.2s;
  }

  .tabs button:hover {
    color: #eee;
  }

  .tabs button.active {
    background: #333;
    color: #fff;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  }

  .form-group {
    margin-bottom: 1.2rem;
    display: flex;
    flex-direction: column;
  }

  .form-group.row {
    flex-direction: row;
    gap: 1rem;
  }

  .half {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  label {
    font-size: 0.8rem;
    color: #aaa;
    margin-bottom: 0.4rem;
    text-transform: uppercase;
    font-weight: bold;
  }

  input {
    background: #111;
    border: 1px solid #333;
    color: white;
    padding: 10px;
    border-radius: 6px;
    font-size: 1rem;
  }

  input:focus {
    outline: none;
    border-color: #a882ff;
  }

  .modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 2rem;
  }
</style>
