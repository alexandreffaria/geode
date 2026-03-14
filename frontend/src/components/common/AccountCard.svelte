<script>
  import { formatCurrency } from '../../utils/formatUtils.js';

  /**
   * Account Card Component
   * @component
   * 
   * @prop {Object} account - Account object with fullName, shortName, type, and balance
   * @prop {string} account.fullName - Full account path (e.g., "Assets:Liquid:PagBank")
   * @prop {string} account.shortName - Short display name (e.g., "PagBank")
   * @prop {string} account.type - Account type (e.g., "Liquid", "Fixed", "Debt")
   * @prop {number} account.balance - Account balance
   * 
   * @example
   * <AccountCard account={{
   *   fullName: "Assets:Liquid:PagBank",
   *   shortName: "PagBank",
   *   type: "Liquid",
   *   balance: 1500.00
   * }} />
   */
  
  /** @type {{ fullName: string, shortName: string, type: string, balance: number }} */
  export let account;
  
  $: isLiability = account.fullName.startsWith('Liabilities');
  $: typeClass = account.type.toLowerCase();
</script>

<div class="account-card" class:liability={isLiability}>
  <div class="acc-details">
    <span class="acc-type {typeClass}">{account.type}</span>
    <h4>{account.shortName}</h4>
    <p class:negative={account.balance < 0} class:positive={account.balance >= 0}>
      {formatCurrency(account.balance)}
    </p>
  </div>
</div>

<style>
  .account-card {
    background: #1a1a1a;
    border: 1px solid #333;
    border-radius: 12px;
    padding: 1.2rem;
    min-width: 220px;
    flex: 1;
    border-top: 3px solid #60a5fa;
  }

  .account-card.liability {
    border-top: 3px solid #f87171;
  }

  .acc-type {
    font-size: 0.7rem;
    text-transform: uppercase;
    font-weight: bold;
    padding: 2px 6px;
    border-radius: 4px;
    background: #333;
    color: #aaa;
    margin-bottom: 8px;
    display: inline-block;
  }

  .acc-type.liquid {
    background: rgba(96, 165, 250, 0.2);
    color: #60a5fa;
  }

  .acc-type.fixed {
    background: rgba(168, 130, 255, 0.2);
    color: #a882ff;
  }

  .acc-type.debt {
    background: rgba(248, 113, 113, 0.2);
    color: #f87171;
  }

  .acc-details h4 {
    margin: 0 0 0.5rem 0;
    color: #eee;
    font-size: 1.1rem;
  }

  .acc-details p {
    margin: 0;
    font-size: 1.4rem;
    font-weight: bold;
  }

  .positive {
    color: #4ade80;
  }

  .negative {
    color: #f87171;
  }
</style>
