<script>
  import MetricCard from '../common/MetricCard.svelte';
  import { metrics } from '../../stores/accountStore.js';
</script>

<div class="dashboard grid-4">
  <MetricCard title="Total Net Worth" value={$metrics.netWorth} variant="core" />
  <MetricCard title="Liquid Cash" value={$metrics.liquidCash} variant="cash" />
  <MetricCard title="Total Income" value={$metrics.totalIncome} variant="income" />
  <MetricCard title="Total Expenses" value={$metrics.totalExpenses} variant="expenses" />
</div>

<style>
  .dashboard {
    display: grid;
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .grid-4 {
    grid-template-columns: repeat(4, 1fr);
  }
</style>
