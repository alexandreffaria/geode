<script>
  import AccountCard from '../common/AccountCard.svelte';
  import { displayAccounts } from '../../stores/accountStore.js';
</script>

<div class="section-header">
  <h2>Assets & Liabilities</h2>
</div>
<div class="accounts-row">
  {#each $displayAccounts as account}
    <AccountCard {account} />
  {/each}
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
  
  .accounts-row {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 2rem;
  }
</style>
