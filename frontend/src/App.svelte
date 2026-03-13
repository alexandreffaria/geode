<script>
  import { GetTransactions, ImportFiles } from '../wailsjs/go/main/App.js';
  
  let transactions = [];
  
  function parseDate(dateStr) {
      if (!dateStr) return new Date(1970, 0, 1);
      const parts = dateStr.split('.');
      if (parts.length === 3) {
          return new Date(parts[2], parts[1] - 1, parts[0]);
      }
      return new Date(1970, 0, 1);
  }

  // Go provides the matched data, we just sort it by date for the UI
  $: sortedTransactions = [...transactions].sort((a, b) => parseDate(b.date) - parseDate(a.date));

  // 1. Global Totals (Ignoring transfers)
  $: totalIncome = transactions
      .filter(t => t.value > 0 && t.category !== "Transferências") 
      .reduce((sum, t) => sum + t.value, 0);

  $: totalExpenses = transactions
      .filter(t => t.value < 0 && t.category !== "Transferências")
      .reduce((sum, t) => sum + Math.abs(t.value), 0);

  $: netBalance = totalIncome - totalExpenses;

  // 2. Ghost Account Logic
  $: globalLatestDate = transactions.reduce((latest, tx) => {
      const d = parseDate(tx.date);
      return d > latest ? d : latest;
  }, new Date(1970, 0, 1));

  $: accountStats = transactions.reduce((acc, tx) => {
      if (!acc[tx.account]) {
          acc[tx.account] = { balance: 0, lastActive: new Date(1970, 0, 1) };
      }
      acc[tx.account].balance += tx.value;

      const txDate = parseDate(tx.date);
      if (txDate > acc[tx.account].lastActive) {
          acc[tx.account].lastActive = txDate;
      }
      return acc;
  }, {});

  $: activeAccounts = Object.entries(accountStats)
      .map(([name, stats]) => ({ name, balance: stats.balance, lastActive: stats.lastActive }))
      .filter(acc => {
          const isZero = Math.abs(acc.balance) < 0.01;
          const diffDays = (globalLatestDate - acc.lastActive) / (1000 * 60 * 60 * 24);
          const isStale = diffDays > 90;
          return !(isZero && isStale);
      })
      .sort((a, b) => a.name.localeCompare(b.name));

  loadData();

  async function loadData() {
    transactions = await GetTransactions();
  }

  async function handleImport() {
    const success = await ImportFiles();
    if (success) {
      await loadData();
    }
  }
</script>

<main class="container">
  <header>
    <h1>💎 Geode Vault</h1>
    <div class="actions">
      <button class="btn btn-secondary" on:click={loadData}>Refresh</button>
      <button class="btn btn-primary" on:click={handleImport}>+ Batch Import</button>
    </div>
  </header>

  {#if transactions.length > 0}
    <div class="dashboard">
      <div class="card income">
        <h3>Global Income</h3>
        <p>R$ {totalIncome.toFixed(2)}</p>
      </div>
      <div class="card expenses">
        <h3>Global Expenses</h3>
        <p>R$ {totalExpenses.toFixed(2)}</p>
      </div>
      <div class="card net">
        <h3>Global Net Flow</h3>
        <p>R$ {netBalance.toFixed(2)}</p>
      </div>
    </div>

    <div class="section-header">
      <h2>Bank Accounts</h2>
    </div>
    <div class="accounts-row">
      {#each activeAccounts as acc}
        <div class="account-card">
          <div class="acc-icon">🏦</div>
          <div class="acc-details">
            <h4>{acc.name}</h4>
            <p class={acc.balance < 0 ? 'negative' : 'positive'}>
              R$ {acc.balance.toFixed(2)}
            </p>
          </div>
        </div>
      {/each}
    </div>

    <div class="section-header">
      <h2>Recent Transactions</h2>
    </div>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Date</th>
            <th>Description</th>
            <th>Value</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {#each sortedTransactions as tx}
            <tr>
              <td><span class="account-tag">{tx.account}</span></td>
              <td>{tx.date}</td>
              <td>
                {tx.description}
                {#if tx.matchedWith}
                   <span class="transfer-badge">
                     {tx.value < 0 ? '➔ To' : '➔ From'} {tx.matchedWith}
                   </span>
                {/if}
                <br><small style="color: #666;">{tx.category}</small>
              </td>
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
      <h2>Welcome to your Geode.</h2>
      <p>Your vault is currently empty. Click "Batch Import" to bring in your bank exports.</p>
    </div>
  {/if}
</main>

<style>
  :global(body) { background-color: #1e1e1e; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; }
  .container { max-width: 1100px; margin: 0 auto; padding: 2rem; }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 1rem; margin-bottom: 2rem; }
  h1 { margin: 0; color: #a882ff; }
  
  .actions { display: flex; gap: 10px; }
  .btn { border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
  .btn-primary { background-color: #a882ff; color: #111; }
  .btn-primary:hover { background-color: #b795ff; }
  .btn-secondary { background-color: #333; color: #fff; }
  .btn-secondary:hover { background-color: #444; }

  .dashboard { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 2rem; }
  .card { background: #2a2a2a; padding: 1.5rem; border-radius: 8px; text-align: center; border: 1px solid #333; }
  .card h3 { margin: 0 0 0.5rem 0; font-size: 0.9rem; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .card p { margin: 0; font-size: 2rem; font-weight: bold; }
  
  .income p { color: #4ade80; }
  .expenses p { color: #f87171; }
  
  .section-header { margin: 2rem 0 1rem 0; border-bottom: 1px solid #333; padding-bottom: 0.5rem; }
  .section-header h2 { font-size: 1.2rem; color: #ccc; margin: 0; }

  .accounts-row { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
  .account-card { background: #222; border: 1px solid #444; border-radius: 8px; padding: 1rem; display: flex; align-items: center; gap: 1rem; min-width: 200px; flex: 1; }
  .acc-icon { font-size: 2rem; background: #333; padding: 10px; border-radius: 8px; }
  .acc-details h4 { margin: 0 0 0.2rem 0; color: #aaa; font-size: 0.9rem; text-transform: uppercase; }
  .acc-details p { margin: 0; font-size: 1.2rem; font-weight: bold; }

  table { width: 100%; border-collapse: collapse; background: #2a2a2a; border-radius: 8px; overflow: hidden; }
  th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #333; }
  th { background-color: #222; font-weight: 600; color: #aaa; text-transform: uppercase; font-size: 0.8rem; }
  .positive { color: #4ade80; }
  .negative { color: #f87171; }
  
  .account-tag { background: #444; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; color: #ddd; text-transform: capitalize; }
  .badge { padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold; }
  .paid { background: rgba(74, 222, 128, 0.2); color: #4ade80; }
  .unpaid { background: rgba(248, 113, 113, 0.2); color: #f87171; }
  
  .transfer-badge { background-color: #a882ff33; color: #c4abff; font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; margin-left: 8px; border: 1px solid #a882ff66; text-transform: capitalize; }
  
  .empty-state { text-align: center; padding: 4rem 2rem; background: #2a2a2a; border-radius: 8px; border: 1px dashed #555; }
  .empty-state h2 { color: #a882ff; margin-bottom: 0.5rem; }
</style>