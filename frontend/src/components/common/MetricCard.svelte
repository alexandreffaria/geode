<script>
  import { formatCurrency } from '../../utils/formatUtils.js';

  /**
   * Metric Card Component for Dashboard
   * @component
   * 
   * @prop {string} title - Card title/label
   * @prop {number} value - Numeric value to display
   * @prop {string} variant - Visual variant: 'core', 'cash', 'income', or 'expenses'
   * @prop {string} currency - Currency code for formatting
   * 
   * @example
   * <MetricCard
   *   title="Total Net Worth"
   *   value={netWorth}
   *   variant="core"
   * />
   */
  
  /** @type {string} */
  export let title;
  
  /** @type {number} */
  export let value;
  
  /** @type {'core' | 'cash' | 'income' | 'expenses'} */
  export let variant = 'core';
  
  /** @type {string} */
  export let currency = 'BRL';
</script>

<div class="card {variant}">
  <h3>{title}</h3>
  <p>{formatCurrency(value, currency)}</p>
</div>

<style>
  .card {
    background: #1a1a1a;
    padding: 1.5rem;
    border-radius: 12px;
    border: 1px solid #333;
  }

  .card h3 {
    margin: 0 0 0.5rem 0;
    font-size: 0.85rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }

  .card p {
    margin: 0;
    font-size: 2.2rem;
    font-weight: 800;
    letter-spacing: -1px;
  }

  /* Variant colors */
  .core p {
    color: #fff;
  }

  .cash p {
    color: #60a5fa;
  }

  .income p {
    color: #4ade80;
  }

  .expenses p {
    color: #f87171;
  }
</style>
