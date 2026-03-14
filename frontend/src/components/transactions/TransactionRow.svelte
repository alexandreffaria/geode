<script>
  import { openEditModal, openDeleteConfirm } from '../../stores/uiStore.js';
  
  export let transaction;
</script>

<tr class="transaction-row" on:click={() => openEditModal(transaction)}>
  <td class="date-col">{transaction.date}</td>
  <td class="flow-col">
    <span class="pill source">{transaction.source.split(':').pop()}</span>
    <span class="arrow">➔</span>
    <span class="pill dest">{transaction.destination.split(':').pop()}</span>
  </td>
  <td>{transaction.description}</td>
  <td class="amount-col">
    <strong>{transaction.amount.toFixed(2)}</strong> <small>{transaction.currency}</small>
  </td>
  <td>
    {#if transaction.tags}
      <span class="tag">{transaction.tags}</span>
    {/if}
  </td>
  <td class="actions-col">
    <button 
      class="btn-icon edit" 
      on:click|stopPropagation={() => openEditModal(transaction)}
      title="Edit transaction"
    >
      ✏️
    </button>
    <button 
      class="btn-icon delete" 
      on:click|stopPropagation={() => openDeleteConfirm(transaction.id)}
      title="Delete transaction"
    >
      🗑️
    </button>
  </td>
</tr>

<style>
  .transaction-row { 
    cursor: pointer; 
    transition: background-color 0.2s; 
  }
  .transaction-row:hover { 
    background-color: #222; 
  }
  
  .date-col { 
    color: #888; 
    font-family: monospace; 
  }
  
  .amount-col strong { 
    font-size: 1.1rem; 
  }
  .amount-col small { 
    color: #666; 
    font-weight: bold; 
  }
  
  .flow-col { 
    display: flex; 
    align-items: center; 
    gap: 8px; 
  }
  
  .pill { 
    padding: 4px 10px; 
    border-radius: 20px; 
    font-size: 0.8rem; 
    font-weight: 600; 
  }
  .pill.source { 
    background: #2a2a2a; 
    color: #aaa; 
    border: 1px dashed #444; 
  }
  .pill.dest { 
    background: #2a2a2a; 
    color: #eee; 
    border: 1px solid #555; 
  }
  
  .arrow { 
    color: #555; 
    font-size: 0.8rem; 
  }
  
  .tag { 
    background: #2b2244; 
    color: #a882ff; 
    font-size: 0.75rem; 
    padding: 3px 8px; 
    border-radius: 4px; 
    border: 1px solid #3d2f60; 
  }
  
  .actions-col { 
    width: 100px; 
    text-align: right; 
  }
  
  .btn-icon { 
    background: transparent; 
    border: none; 
    cursor: pointer; 
    font-size: 1.2rem; 
    padding: 4px 8px; 
    border-radius: 4px; 
    transition: background-color 0.2s; 
    opacity: 0.6; 
  }
  .btn-icon:hover { 
    opacity: 1; 
    background-color: #333; 
  }
  .btn-icon.delete:hover { 
    background-color: rgba(220, 38, 38, 0.2); 
  }
  .btn-icon.edit:hover { 
    background-color: rgba(168, 130, 255, 0.2); 
  }
</style>
