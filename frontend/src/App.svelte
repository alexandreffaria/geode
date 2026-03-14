<script>
  import { onMount } from 'svelte';
  import Header from './components/layout/Header.svelte';
  import Dashboard from './components/dashboard/Dashboard.svelte';
  import AccountsSection from './components/accounts/AccountsSection.svelte';
  import TransactionsSection from './components/transactions/TransactionsSection.svelte';
  import TransactionModal from './components/modals/TransactionModal.svelte';
  import DeleteConfirmModal from './components/modals/DeleteConfirmModal.svelte';
  import { transactions, loadTransactions } from './stores/transactionStore.js';

  onMount(() => {
    loadTransactions();
  });
</script>

<main class="container">
  <Header />

  {#if $transactions.length > 0}
    <Dashboard />
    <AccountsSection />
    <TransactionsSection />
  {:else}
    <div class="empty-state">
      <h2>Welcome to your Geode.</h2>
      <p>Please place your master <code>geode.csv</code> inside the vault folder or create a new transaction.</p>
    </div>
  {/if}
</main>

<TransactionModal />
<DeleteConfirmModal />

<style>
  .container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: #1a1a1a;
    border-radius: 12px;
    border: 1px dashed #444;
  }

  .empty-state h2 {
    color: #a882ff;
    margin-bottom: 0.5rem;
  }

  .empty-state code {
    background: #2a2a2a;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: monospace;
  }
</style>
