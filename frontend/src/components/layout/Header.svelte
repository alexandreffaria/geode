<script>
  import Button from '../common/Button.svelte';
  import { loadTransactions } from '../../stores/transactionStore.js';
  import { openAddModal } from '../../stores/uiStore.js';
</script>

<header>
  <h1>💎 Geode Vault</h1>
  <div class="actions">
    <Button variant="secondary" on:click={loadTransactions}>
      Refresh
    </Button>
    <Button variant="primary" on:click={openAddModal}>
      + New Transaction
    </Button>
  </div>
</header>

<style>
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid #222;
    padding-bottom: 1rem;
    margin-bottom: 2rem;
  }
  
  h1 {
    margin: 0;
    color: #a882ff;
    font-weight: 800;
    letter-spacing: -1px;
  }
  
  .actions {
    display: flex;
    gap: 10px;
  }
</style>
