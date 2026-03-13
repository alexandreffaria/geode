<script>
  import { GetTransactions } from '../wailsjs/go/main/App.js';
  
  let transactions = [];
  
  // Svelte's reactive variables ($:). These automatically recalculate 
  // whenever the 'transactions' array changes!
  $: totalIncome = transactions
      .filter(t => t.value > 0 && t.category !== "Transferências") 
      .reduce((sum, t) => sum + t.value, 0);

  $: totalExpenses = transactions
      .filter(t => t.value < 0 && t.category !== "Transferências")
      .reduce((sum, t) => sum + Math.abs(t.value), 0);

  $: netBalance = totalIncome - totalExpenses;

  async function loadData() {
    transactions = await GetTransactions();
  }
</script>

<main class="container">
  <header>
    <h1>💎 Geode Vault</h1>
    <button class="load-btn" on:click={loadData}>Sync Vault</button>
  </header>

  {#if transactions.length > 0}
    <div class="dashboard">
      <div class="card income">
        <h3>Income</h3>
        <p>R$ {totalIncome.toFixed(2)}</p>
      </div>
      <div class="card expenses">
        <h3>Expenses</h3>
        <p>R$ {totalExpenses.toFixed(2)}</p>
      </div>
      <div class="card net">
        <h3>Net Balance</h3>
        <p>R$ {netBalance.toFixed(2)}</p>
      </div>
    </div>

    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th>Category</th>
            <th>Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each transactions as tx}
            <tr>
              <td>{tx.date}</td>
              <td>{tx.description}</td>
              <td>{tx.category}</td>
              <td class={tx.value < 0 ? 'negative' : 'positive'}>
                R$ {tx.value.toFixed(2)}
              </td>
              <td>
                <span class="badge {tx.status === 'Pago' ? 'paid' : 'unpaid'}">
                  {tx.status}
                </span>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="empty-state">
      <p>No transactions loaded. Click "Sync Vault" to read from your CSV.</p>
    </div>
  {/if}
</main>

<style>
  /* Let's give it a slight "Obsidian Dark Mode" vibe */
  :global(body) { background-color: #1e1e1e; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; }
  .container { max-width: 1000px; margin: 0 auto; padding: 2rem; }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 1rem; margin-bottom: 2rem; }
  h1 { margin: 0; color: #a882ff; }
  
  .load-btn { background-color: #a882ff; color: #111; border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
  .load-btn:hover { background-color: #b795ff; }

  .dashboard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
  .card { background: #2a2a2a; padding: 1.5rem; border-radius: 8px; text-align: center; border: 1px solid #333; }
  .card h3 { margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .card p { margin: 0; font-size: 2rem; font-weight: bold; }
  
  .income p { color: #4ade80; }
  .expenses p { color: #f87171; }
  
  table { width: 100%; border-collapse: collapse; background: #2a2a2a; border-radius: 8px; overflow: hidden; }
  th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #333; }
  th { background-color: #222; font-weight: 600; color: #aaa; text-transform: uppercase; font-size: 0.8rem; }
  .positive { color: #4ade80; }
  .negative { color: #f87171; }
  
  .badge { padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; }
  .paid { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
  .unpaid { background: rgba(248, 113, 113, 0.2); color: #f87171; }
</style>