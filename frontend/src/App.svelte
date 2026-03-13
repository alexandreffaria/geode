<script>
  import { GetTransactions, AddTransaction } from '../wailsjs/go/main/App.js';
  
  let transactions = [];
  
  // --- MODAL STATE ---
  let showModal = false;
  let newTx = getEmptyTx();

  function getEmptyTx() {
    const today = new Date().toISOString().split('T')[0];
    return {
      date: today,
      source: '',
      destination: '',
      amount: 0,
      description: '',
      currency: 'BRL',
      tags: ''
    };
  }

  async function handleSave() {
    newTx.amount = parseFloat(newTx.amount);
    const success = await AddTransaction(newTx);
    if (success) {
      showModal = false;
      newTx = getEmptyTx(); 
      await loadData();     
    } else {
      alert("Failed to save transaction!");
    }
  }

  // --- DOUBLE ENTRY MATH ---
  $: accountBalances = transactions.reduce((acc, tx) => {
      if (!acc[tx.destination]) acc[tx.destination] = 0;
      acc[tx.destination] += tx.amount;

      if (!acc[tx.source]) acc[tx.source] = 0;
      acc[tx.source] -= tx.amount;

      return acc;
  }, {});

  $: allAccountNames = Object.keys(accountBalances).sort();

  $: liquidCash = Object.entries(accountBalances)
      .filter(([name]) => name.startsWith("Assets:Liquid"))
      .reduce((sum, [_, bal]) => sum + bal, 0);

  $: totalAssets = Object.entries(accountBalances)
      .filter(([name]) => name.startsWith("Assets"))
      .reduce((sum, [_, bal]) => sum + bal, 0);

  $: totalLiabilities = Object.entries(accountBalances)
      .filter(([name]) => name.startsWith("Liabilities"))
      .reduce((sum, [_, bal]) => sum + bal, 0);

  $: netWorth = totalAssets + totalLiabilities; 

  $: totalIncome = transactions
      .filter(t => t.source.startsWith("Income"))
      .reduce((sum, t) => sum + t.amount, 0);

  $: totalExpenses = transactions
      .filter(t => t.destination.startsWith("Expenses"))
      .reduce((sum, t) => sum + t.amount, 0);

  $: displayAccounts = Object.entries(accountBalances)
      .filter(([name]) => name.startsWith("Assets") || name.startsWith("Liabilities"))
      .map(([name, balance]) => ({ 
          fullName: name, 
          shortName: name.split(':').pop(),
          type: name.split(':')[1] || 'Other',
          balance 
      }))
      .filter(acc => Math.abs(acc.balance) > 0.01)
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

  $: sortedTransactions = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

  loadData();

  async function loadData() {
    transactions = await GetTransactions();
  }
</script>

<main class="container">
  <header>
    <h1>💎 Geode Vault</h1>
    <div class="actions">
      <button class="btn btn-secondary" on:click={loadData}>Refresh</button>
      <button class="btn btn-primary" on:click={() => showModal = true}>+ New Transaction</button>
    </div>
  </header>

  {#if transactions.length > 0}
    <div class="dashboard grid-4">
      <div class="card core">
        <h3>Total Net Worth</h3>
        <p>R$ {netWorth.toFixed(2)}</p>
      </div>
      <div class="card cash">
        <h3>Liquid Cash</h3>
        <p>R$ {liquidCash.toFixed(2)}</p>
      </div>
      <div class="card income">
        <h3>Total Income</h3>
        <p>R$ {totalIncome.toFixed(2)}</p>
      </div>
      <div class="card expenses">
        <h3>Total Expenses</h3>
        <p>R$ {totalExpenses.toFixed(2)}</p>
      </div>
    </div>

    <div class="section-header">
      <h2>Assets & Liabilities</h2>
    </div>
    <div class="accounts-row">
      {#each displayAccounts as acc}
        <div class="account-card {acc.fullName.startsWith('Liabilities') ? 'liability' : ''}">
          <div class="acc-details">
            <span class="acc-type {acc.type.toLowerCase()}">{acc.type}</span>
            <h4>{acc.shortName}</h4>
            <p class={acc.balance < 0 ? 'negative' : 'positive'}>
              R$ {acc.balance.toFixed(2)}
            </p>
          </div>
        </div>
      {/each}
    </div>

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
          </tr>
        </thead>
        <tbody>
          {#each sortedTransactions as tx}
            <tr>
              <td class="date-col">{tx.date}</td>
              <td class="flow-col">
                 <span class="pill source">{tx.source.split(':').pop()}</span>
                 <span class="arrow">➔</span>
                 <span class="pill dest">{tx.destination.split(':').pop()}</span>
              </td>
              <td>{tx.description}</td>
              <td class="amount-col">
                <strong>{tx.amount.toFixed(2)}</strong> <small>{tx.currency}</small>
              </td>
              <td>
                {#if tx.tags}
                  <span class="tag">{tx.tags}</span>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="empty-state">
      <h2>Welcome to your Geode.</h2>
      <p>Please place your master <code>geode.csv</code> inside the vault folder or create a new transaction.</p>
    </div>
  {/if}
</main>

{#if showModal}
  <div 
    class="modal-backdrop" 
    role="dialog"
    tabindex="-1"
    on:click|self={() => showModal = false}
    on:keydown|self={(e) => { if (e.key === 'Enter' || e.key === 'Escape') showModal = false; }}
  >
    <div class="modal">
      <h2>Add Transaction</h2>
      
      <div class="form-group">
        <label for="tx-date">Date</label>
        <input id="tx-date" type="date" bind:value={newTx.date} />
      </div>

    <div class="form-group row">
        <div class="half">
          <label for="tx-source">Source Account</label>
          <input id="tx-source" type="text" list="account-options" bind:value={newTx.source} placeholder="Search or type new..." autocomplete="off" />
        </div>
        <div class="half">
          <label for="tx-dest">Destination Account</label>
          <input id="tx-dest" type="text" list="account-options" bind:value={newTx.destination} placeholder="Search or type new..." autocomplete="off" />
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
        <button class="btn btn-secondary" on:click={() => showModal = false}>Cancel</button>
        <button class="btn btn-primary" on:click={handleSave}>Save Transaction</button>
      </div>
    </div>
  </div>
{/if}

<style>
  :global(body) { background-color: #121212; color: #e0e0e0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; }
  .container { max-width: 1200px; margin: 0 auto; padding: 2rem; }
  header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #222; padding-bottom: 1rem; margin-bottom: 2rem; }
  h1 { margin: 0; color: #a882ff; font-weight: 800; letter-spacing: -1px; }
  
  .actions { display: flex; gap: 10px; }
  .btn { border: none; padding: 10px 20px; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
  .btn-primary { background-color: #a882ff; color: #111; }
  .btn-primary:hover { background-color: #b795ff; }
  .btn-secondary { background-color: #2a2a2a; color: #fff; border: 1px solid #444; }
  .btn-secondary:hover { background-color: #333; }

  /* Dashboard Cards */
  .dashboard { display: grid; gap: 1rem; margin-bottom: 2rem; }
  .grid-4 { grid-template-columns: repeat(4, 1fr); }
  .card { background: #1a1a1a; padding: 1.5rem; border-radius: 12px; border: 1px solid #333; }
  .card h3 { margin: 0 0 0.5rem 0; font-size: 0.85rem; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .card p { margin: 0; font-size: 2.2rem; font-weight: 800; letter-spacing: -1px; }
  
  .core p { color: #fff; }
  .cash p { color: #60a5fa; }
  .income p { color: #4ade80; }
  .expenses p { color: #f87171; }
  
  .section-header { margin: 2rem 0 1rem 0; border-bottom: 1px solid #222; padding-bottom: 0.5rem; }
  .section-header h2 { font-size: 1.2rem; color: #aaa; margin: 0; }

  /* Account Cards */
  .accounts-row { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 2rem; }
  .account-card { background: #1a1a1a; border: 1px solid #333; border-radius: 12px; padding: 1.2rem; min-width: 220px; flex: 1; border-top: 3px solid #60a5fa; }
  .account-card.liability { border-top: 3px solid #f87171; }
  .acc-type { font-size: 0.7rem; text-transform: uppercase; font-weight: bold; padding: 2px 6px; border-radius: 4px; background: #333; color: #aaa; margin-bottom: 8px; display: inline-block; }
  .acc-type.liquid { background: rgba(96, 165, 250, 0.2); color: #60a5fa; }
  .acc-type.fixed { background: rgba(168, 130, 255, 0.2); color: #a882ff; }
  .acc-type.debt { background: rgba(248, 113, 113, 0.2); color: #f87171; }
  .acc-details h4 { margin: 0 0 0.5rem 0; color: #eee; font-size: 1.1rem; }
  .acc-details p { margin: 0; font-size: 1.4rem; font-weight: bold; }

  /* Table */
  table { width: 100%; border-collapse: separate; border-spacing: 0; background: #1a1a1a; border-radius: 12px; overflow: hidden; border: 1px solid #333; }
  th, td { padding: 14px 16px; text-align: left; border-bottom: 1px solid #222; }
  th { background-color: #111; font-weight: 600; color: #888; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 1px; }
  
  .date-col { color: #888; font-family: monospace; }
  .amount-col strong { font-size: 1.1rem; }
  .amount-col small { color: #666; font-weight: bold; }
  
  .flow-col { display: flex; align-items: center; gap: 8px; }
  .pill { padding: 4px 10px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; }
  .pill.source { background: #2a2a2a; color: #aaa; border: 1px dashed #444; }
  .pill.dest { background: #2a2a2a; color: #eee; border: 1px solid #555; }
  .arrow { color: #555; font-size: 0.8rem; }
  .tag { background: #2b2244; color: #a882ff; font-size: 0.75rem; padding: 3px 8px; border-radius: 4px; border: 1px solid #3d2f60; }
  
  .positive { color: #4ade80; }
  .negative { color: #f87171; }
  
  .empty-state { text-align: center; padding: 4rem 2rem; background: #1a1a1a; border-radius: 12px; border: 1px dashed #444; }
  .empty-state h2 { color: #a882ff; margin-bottom: 0.5rem; }

  /* --- MODAL STYLES --- */
  .modal-backdrop { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); display: flex; justify-content: center; align-items: center; z-index: 100; backdrop-filter: blur(4px); }
  .modal { background: #1e1e1e; padding: 2rem; border-radius: 12px; width: 500px; border: 1px solid #444; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
  .modal h2 { margin-top: 0; color: #eee; margin-bottom: 1.5rem; }
  
  .form-group { margin-bottom: 1.2rem; display: flex; flex-direction: column; }
  .form-group.row { flex-direction: row; gap: 1rem; }
  .half { flex: 1; display: flex; flex-direction: column; }
  
  label { font-size: 0.8rem; color: #aaa; margin-bottom: 0.4rem; text-transform: uppercase; font-weight: bold; }
  input { background: #111; border: 1px solid #333; color: white; padding: 10px; border-radius: 6px; font-size: 1rem; }
  input:focus { outline: none; border-color: #a882ff; }
  
  .modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 2rem; }
</style>