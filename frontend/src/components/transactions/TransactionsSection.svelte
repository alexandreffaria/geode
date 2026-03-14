<script>
  import TransactionRow from './TransactionRow.svelte';
  import { transactions } from '../../stores/transactionStore.js';
  import { sortTransactionsByDate } from '../../utils/transactionUtils.js';
  
  $: sortedTransactions = sortTransactionsByDate($transactions);
</script>

<div class="section-header">
  <h2>General Ledger</h2>
</div>
<div class="table-container">
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Flow (Source ➔ Destination)</th>
        <th>Description</th>
        <th>Amount</th>
        <th>Tags</th>
        <th class="actions-col">Actions</th>
      </tr>
    </thead>
    <tbody>
      {#each sortedTransactions as tx (tx.id)}
        <TransactionRow transaction={tx} />
      {/each}
    </tbody>
  </table>
</div>

<style>
  .section-header { 
    margin: 2rem 0 1rem 0; 
    border-bottom: 1px solid #222; 
    padding-bottom: 0.5rem; 
  }
  .section-header h2 { 
    font-size: 1.2rem; 
    color: #aaa; 
    margin: 0; 
  }

  .table-container {
    overflow-x: auto;
  }

  table { 
    width: 100%; 
    border-collapse: separate; 
    border-spacing: 0; 
    background: #1a1a1a; 
    border-radius: 12px; 
    overflow: hidden; 
    border: 1px solid #333; 
  }
  
  :global(th), :global(td) { 
    padding: 14px 16px; 
    text-align: left; 
    border-bottom: 1px solid #222; 
  }
  
  th { 
    background-color: #111; 
    font-weight: 600; 
    color: #888; 
    text-transform: uppercase; 
    font-size: 0.75rem; 
    letter-spacing: 1px; 
  }

  .actions-col {
    width: 100px;
    text-align: right;
  }

  .positive { 
    color: #4ade80; 
  }
  .negative { 
    color: #f87171; 
  }
</style>
